var os = require('os');
var shell = require('shelljs');
var gpio = require('rpi-gpio');
var ip = require('ip');
var s = require('socket.io-client');
var fs = require('fs');
var ss = require('socket.io-stream');
//var RaspiCam = require("raspicam");
var exec = require("child_process").exec;
var wget = require('node-wget');
var events = require('events');
var spawn = require("child_process").spawn;
var util = require("util");
var   _ = require("lodash");

var configFile = '/home/pi/camera.json';

var child_process = null;
var allowPhoto = true;

var SERVER_API = 'http://192.168.1.99';

var PROCESS_RUNNING_FLAG = false;

var dirName = __dirname || "/home/pi";
var isBusy = true;

var _h, _w = 0;
var _imageBuffers = [null, null];


var parameters = {
  "w": "width",
  "h": "height",
  "q": "quality",
  "o": "output",
  "t": "timeout",
  "th": "thumb",
  "e": "encoding",
  "x": "exif",
  "tl": "timelapse",
  "sh": "sharpness",
  "co": "contrast",
  "br": "brightness",
  "sa": "saturation",
  "ISO": "ISO",
  "ev": "ev",
  "ex": "exposure",
  "awb": "awb",
  "ifx": "imxfx",
  "cfx": "colfx",
  "mm": "metering",
  "rot": "rotation"
};

var flags = {
  "r": "raw",
  "v": "verbose",
  "d": "demo",
  "p": "preview",
  "f": "fullscreen",
  "op": "opacity",
  "n": "nopreview",
  "vs": "vstab",
  "hf": "hflip",
  "vf": "vflip"
}





// maximum timeout allowed by raspicam command
var INFINITY_MS = 999999999;

// flat to tell if a process is running
var PROCESS_RUNNING_FLAG = false;

// commands
var PREVIEW_CMD = '/opt/vc/bin/raspistill';
var PHOTO_CMD = '/opt/vc/bin/raspiyuv';
var TIMELAPSE_CMD = '/opt/vc/bin/raspiyuv';
var VIDEO_CMD = '/opt/vc/bin/raspivid';

// the process id of the process spawned to take photos/video
var child_process = null;



/**
 * RaspiCam
 * @constructor
 *
 * @description Raspberry Pi camera controller object
 *
 * @param {Object} opts Options: mode, freq, delay, width, height, quality, encoding, filepath, filename, timeout
 */
function RaspiCam( opts ) {

  if ( !(this instanceof RaspiCam) ) {
    return new RaspiCam( opts );
  }

  // Ensure opts is an object
  opts = opts || {};

  if(typeof opts.mode === "undefined" || typeof opts.output === "undefined"){
    console.log("Error: RaspiCam: must define mode and output");
    return false;
  }

  // Initialize this Board instance with
  // param specified properties.
  this.opts = {};
  _.assign( this.opts, opts );

  // If any opts use the abbreviation, convert to
  // the full word (eg. from opts.w to opts.width)
  this.hashOpts( opts );

  // Set up opts defaults
  this.defaultOpts( );

  // Create derivative opts
  //this.derivativeOpts( );

  // If this.filepath doesn't exist, make it
  //this.createFilepath( );

  //child process
  this.child_process = null;

  //events.EventEmitter.call(this);
}

// Inherit event api
util.inherits( RaspiCam, events.EventEmitter );

/**
 *
 * hashOpts()
 *
 * Converts any abbreviated opts to their full word equivalent
 * and assigns to this.
 *
 **/
RaspiCam.prototype.hashOpts = function(opts){
  for(var opt in opts){
    if(opt.length <= 3){

      // if this opt is in the parameters hash
      if(typeof parameters[opt] !== "undefined"){

        // reassign it to the full word
        this.opts[parameters[opt]] = opts[opt];
        delete this.opts[opt];
      }

      // if this opt is in the flags hash
      if(typeof flags[opt] !== "undefined"){

        // reassign it to the full word
        this.opts[flags[opt]] = opts[opt];
        delete this.opts[opt];
      }
    }
  }
};


/**
 *
 * defaultOpts()
 *
 * Parses the opts to set defaults.
 *
 **/
RaspiCam.prototype.defaultOpts = function(){

  this.opts.mode = this.opts.mode || 'photo';//photo, timelapse or video

  this.opts.width = this.opts.width || 640;
  this.opts.height = this.opts.height || 480;

  this.opts.log = typeof this.opts.log === 'function' ? this.opts.log : console.log;

  // Limit timeout to the maximum value
  // supported by the Raspberry Pi camera,
  // determined by testing.
  /*if(typeof this.opts.timeout !== "undefined"){
    this.opts.timeout = Math.min( this.opts.timeout, INFINITY_MS );
  }*/

};


/**
 * start Take a snapshot or start a timelapse or video recording
 * @param  {Number} mode Sensor pin mode value
 * @return {Object} instance
 */
RaspiCam.prototype.start = function( isPreview ) {

  if(PROCESS_RUNNING_FLAG){
    return false;
  }

  // build the arguments
  var args = [];

  for(var opt in this.opts){
    if(opt !== "mode" && opt !== "log"){
      args.push("--" + opt);
      //don't add value for true flags
      if( this.opts[opt].toString() != "true" && this.opts[opt].toString() != "false"){
        args.push(this.opts[opt].toString());
      }
    }
  }

  var cmd;

  switch(this.opts.mode){
    case 'photo':
      cmd = isPreview ? PREVIEW_CMD : PHOTO_CMD;
      break;
    case 'timelapse':
      cmd = TIMELAPSE_CMD;

      // if no timelapse frequency provided, return false
      if(typeof this.opts.timelapse === "undefined"){
        this.emit("start", "Error: must specify timelapse frequency option", new Date().getTime() );
        return false;
      }
      // if not timeout provided, set to longest possible
      if(typeof this.opts.timeout === "undefined"){
        this.opts.timeout = INFINITY_MS;
      }
      break;
    case 'video':
      cmd = VIDEO_CMD;
      break;
    default:
      this.emit("start", "Error: mode must be photo, timelapse or video", new Date().getTime() );
      return false;
  }

  //start child process
  this.opts.log('calling....');
  this.opts.log(cmd + ' ' + args.join(" "));
  this.child_process = spawn(cmd, args);
  child_process = this.child_process;
  PROCESS_RUNNING_FLAG = true;

  //set up listeners for stdout, stderr and process exit
  this.addChildProcessListeners();

  this.emit("start", null, new Date().getTime() );


  return true;

};

// stop the child process
// return true if process was running, false if no process to kill
RaspiCam.prototype.stop = function( ) {

  console.log('stop scanner')
  if(PROCESS_RUNNING_FLAG){
    this.child_process.kill();
    child_process = null;
    PROCESS_RUNNING_FLAG = false;

    this.emit("stop", null, new Date().getTime() );
    return true;
  }else{
    this.emit("stop", "Error: no process was running", new Date().getTime());
    return false;
  }
};


/**
 *
 * addChildProcessListeners()
 *
 * Adds listeners to the child process spawned to take pictures
 * or record video (raspistill or raspivideo).
 *
 **/
RaspiCam.prototype.addChildProcessListeners = function(){
  var self = this;
  var derr, pos;

  pos = 0;

  this.child_process.stdout.on('end', function (data) {
    //console.log('data end!!!');
    //dout = data;
  });


  var photo = 0;

  const NS_PER_SEC = 1e9;
  var time = null;

  var stdout = this.child_process.stdout;
  stdout.on('readable', function () {
    var data = null;
    while(data = stdout.read()) {
      //_imageBuffers[photo].copy(data, pos, 0, data.length);
      //dout = data;
      pos += data.length;

      console.log('Data: ' + pos + ' from ' + _imageBuffers[photo].length);

      if (pos === _imageBuffers[photo].length) {
        console.log('Buffer is ready');

        self.emit('photo-ready', photo);

        if (photo === 0) {
          time = process.hrtime();
          pos = 0;
          photo = 1;
        }else{
          var diff = process.hrtime(time);

          console.log(`Benchmark took ${diff[0] * NS_PER_SEC + diff[1]} nanoseconds ${diff[0]}`);

          pos = 0;
          photo = 0;
        }
      }
    }
  });

/*  this.child_process.stdout.on('data', function (data) {
    //_imageBuffers[photo].copy(data, pos, 0, data.length);
    //dout = data;
    pos += data.length;

    //console.log('Data: ' + pos + ' from ' + _imageBuffers[photo].length);

    if(pos === _imageBuffers[photo].length){
      console.log('Buffer is ready');

      self.emit('photo-ready', photo);

      if(photo === 0){
        pos = 0;
        photo = 1;
      }
    }
  });*/

  this.child_process.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
    derr = data;
  });

  this.child_process.on('close', function (code) {
    console.log('close event')

    //emit exit signal for process chaining over time
    self.emit( "exit", new Date().getTime() );

    PROCESS_RUNNING_FLAG = false;
    self.child_process = null;
    child_process = null;
  });

};


/**
 *
 * getter
 *
 **/
RaspiCam.prototype.get = function(opt){
  return this.opts[opt];
};


/**
 *
 * setter
 *
 **/
RaspiCam.prototype.set = function(opt, value){
  this.opts[opt] = value;
};






var config = {
  numb: ""
};

var files = [];
var skipFrame = 0;

function loadConfig() {
  fs.readFile(configFile, function read(err, data) {
    if (err) {
      return;
    }

    try {
      config = JSON.parse(data);
    }
    catch (ex) {
    }
  });
}

function saveConfig() {
  var data = JSON.stringify(config);

  fs.writeFile(configFile, data, function (err) {
    if (err) {
      //return console.log(err);
      return;
    }
  });
}

loadConfig();

init();

function init(){
  function checkIP() {
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
      for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
          addresses.push(address.address);
        }
      }
    }

    return addresses.length > 0;
  }

  var interval = setInterval(function(){
    if(checkIP()){
      clearInterval(interval);
      start();
      interval = null;
    }
  }, 3000);
}



function start() {
  try {
    var defaultOptions = {
      mode: "photo",
      output: "-",   // dirName + "/photo%d.jpg",
      width: 160,
      height: 90
    };

    var camera = new RaspiCam(defaultOptions);

    var rpiIp = ip.address() // my ip address

    var command = null;
    var socket = s(SERVER_API);

    socket.on('connect', function (c) {
      console.log("connected to server");

      socket.emit("add scanner", {
        ip: rpiIp,
        numb: config.numb,
        files: []
      });

      takePhoto('thumb');
    });

    process.on('exit', function () {
      updateBusyState(false);

      if (PROCESS_RUNNING_FLAG) {
        child_process.kill();
      }
    });
  }
  catch(ex){
    console.log("Error: ", ex);
  }


  function updateBusyState(state) {
    socket.emit("busy-state", {
      ip: rpiIp,
      numb: config.numb,
      state: state
    });
  }


  function shellFeedback(result) {
    if (config.numb == 1) {
      socket.emit("shell-feedback", {
        ip: rpiIp,
        numb: config.numb,
        result: result
      });
    }
  }

  socket.on('update-file', function (data) {
    wget({
        url: data.url, //'https://raw.github.com/angleman/wgetjs/master/package.json',
        dest: data.dest,      // destination path or path with filenname, default is ./
        timeout: 2000       // duration to wait for request fulfillment in milliseconds, default is 2 seconds
      },
      function (error, response, body) {
        if (error) {
          console.log('--- error:');
          console.log(error);            // error encountered
        } else {
          /*console.log('--- headers:');
           console.log(response.headers); // response headers
           console.log('--- body:');
           console.log(body);             // content of package*/
        }
      }
    );
  });

  socket.on('shell', function (data) {

    try {
      if (!data) {
        return;
      }

      console.log('shell');
      console.log(data);

      var args = data;
      exec(args, function(err, stdout, stderr) {
        PROCESS_RUNNING_FLAG = false;

      if (err) {
        console.error(err);
        return;
      }

      shellFeedback({
        type: "close",
        data: stdout
      });
    })
      ;

      PROCESS_RUNNING_FLAG = true;
    }
    catch (e) {
      console.log("Shell error" + e.message);
    }
  });

  socket.on('set number', function (newNumber) {
    config.numb = newNumber;
    saveConfig();
  });

  socket.on('update-session', function(session) {

    console.log(session);
    if(session && session.id){
      //isBusy = true;
      takePhoto("prepare");
    }else{
      //camera.stop();
    }
  })

  socket.on('setup command', function (data) {
    console.log("setup config");

    try {
      command = JSON.parse(data);
    }

    catch (ex) {
      console.log("Setup command error: " + ex.message);
    }
  });

  socket.on('disconnect', function (e) {
    files = [];
    console.log("disconnected from server");
  });


  //listen for the "start" event triggered when the start method has been successfully initiated
  camera.on("start", function () {
    //do stuff
    console.log("camera started");
    files = [];
  });

/*  camera.on("read", function (err, timestamp, filename) {

    try {
      console.log("current file name:" + filename)

      //camera.stop();

      var type = "";
      if (filename.indexOf('file-preview') > -1) {
        type = 'file-preview';
      }
      else if (filename.indexOf('file-thumb') > -1) {
        type = 'file-thumb';
      }
      else if (filename.indexOf('photo') > -1) {
        type = 'file';
      }

      console.log('read: ' + type);

      files.push({
        filename: filename,
        type: type
      });
    }
    catch (e) {
      console.log(e.message)
    }
  });*/

  function uploadFiles() {
	  console.log("uploadFiles")
	  
    try {
      var promises = [];

      for (var i = skipFrame; i < Math.min(files.length, skipFrame + 2); i++) {
        var f = files[i];

        var stream = ss.createStream();
        ss(socket).emit(f.type, stream, {
          ip: rpiIp,
          numb: config.numb,
          index: i - skipFrame
        });
        var pr = fs.createReadStream(dirName + "/" + f.filename).pipe(stream);
        promises.push(pr);
      }

      function removeFromProm(pr){
        var ind = promises.indexOf(pr)
        if(ind != -1){
          promises.splice(ind, 1)
        }

        if(promises.length == 0){
          updateBusyState(false);
        }
      }

      if(promises.length > 0){
        for(var i = 0; i < promises.length; i++){
          var pr = promises[i];
          pr.on("end", function(res){
            removeFromProm(this);
          });
          pr.on("error", function(res){
            removeFromProm(this);
          });
        }
      }
      else {
        updateBusyState(false);
      }

      files = [];
    }
    catch (e) {
      updateBusyState(false);
      console.log("Error: Upload files to server: " + e.message);
    }
  }

  camera.on("photo-ready", function (numb) {
    if(numb === 0){
      takePhoto('photo');
      /*setTimeout(function(){
        takePhoto('photo');
      }, 10);*/
    }else{
      //updateBusyState(false);
    }
  });

  //listen for the "stop" event triggered when the stop method was called
  camera.on("stop", function () {
    console.log("camera stop");
//    uploadFiles();
  });

  //listen for the process to exit when the timeout has been reached
  camera.on("exit", function () {
    console.log("camera exit");
    setTimeout(function () {
	    allowPhoto = true;
      uploadFiles();
    }, 500);
  });


  function allocateImageBuffers(params){
    if(params.height && params.width){

      //_h = (params.height % 32 !== 0) ? ((parseInt(params.height / 32) + 1) * 32) : params.height;
      //_w = (params.width % 16 !== 0) ? ((parseInt(params.width / 16) + 1) * 16) : params.width;

      _h = ((params.height * 3) % 16 !== 0) ? ((parseInt(params.height / 16) + 1) * 16) : (params.height * 3);
      _w = ((params.width) % 32 !== 0) ? ((parseInt(params.width / 32) + 1) * 32) : (params.width);

      var size = _h * _w / 2;
      console.log('Buffer size: ' + _h + ' x ' + _w)

      _imageBuffers[0] = Buffer.alloc(size);
      _imageBuffers[1] = Buffer.alloc(size);
    }
  }

  function resetCameraParams() {
    skipFrame = 0;
    camera.opts = {
      log: function(ms){
        console.log(ms);
      }
    };
  }

  function takePhoto(config) { // "thumb", "preview", "preapre", "photo"

    try {
      console.log("takePhoto:" + config)

      resetCameraParams();


      camera.set('mode', 'photo');

      switch (config) {
        case "thumb": {
          updateBusyState(true);
          camera.set('nopreview', true);
          camera.set('timeout', 500);
          camera.set('width', 160);
          camera.set('height', 90);
          camera.set('output', dirName + "/file-thumb.jpg");

          camera.start(true);

          break;
        }
        case "preview": {
          updateBusyState(true);
          camera.set('nopreview', true);
          camera.set('timeout', 500);
          camera.set('width', 3280);
          camera.set('height', 2464);
          camera.set('output', dirName + "/file-preview.jpg");

          camera.start(true);

          break;
        }
        case "prepare": {
          if (command) {
            updateBusyState(true);

            camera.set('signal', true);
            //camera.set('rgb', true);
            camera.set('output', '-');

            console.log("command:", command);

            allocateImageBuffers(command);

            if (command) {
              for (var op in command) {
                if(op == "skip"){
                  skipFrame = command[op] || 0;
                }else{
                  camera.set(op, command[op]);
                }

              }
            }
            camera.start();
          }
          break;
        }
        case "photo": {
          if (command) {
            camera.child_process.kill('SIGUSR1');
          }

          break;
        }
      }
    }
    catch (e) {
      console.log(e.message);
    }
  }

  socket.on('preview', function (data) {
    takePhoto('preview');
  });

  console.log("Scanner started");
  console.log("Current ip: " + rpiIp);

  var attempt = 0;

  gpio.on('change', function (channel, value) {

    console.log("change " + channel + " value " + value);
  
    if (channel == 7 && value == 1 && command && allowPhoto) {
		allowPhoto = false;
      console.log("take photo");

      takePhoto('photo');

      /*setTimeout(function(){
        takePhoto('photo');
        //gpio.write(12, false);
      },500);*/
    }
  });

  socket.on('soft trigger', function (data) {
    if (command) {
      takePhoto('photo');

      /*setTimeout(function(){
        takePhoto('photo');
      }, 300);*/
    }
  })

  setTimeout(function(){
    gpio.setup(12, gpio.DIR_OUT, write);
    gpio.setup(7, gpio.DIR_IN, gpio.EDGE_BOTH);
  }, 5000);

	function write() {
	  gpio.write(12, false);
	}


};


