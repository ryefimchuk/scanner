var os = require('os');
var shell = require('shelljs');
var gpio = require('rpi-gpio');
var ip = require('ip');
var s = require('socket.io-client');
var fs = require('fs');
var ss = require('socket.io-stream');
var RaspiCam = require("raspicam");
var exec = require("child_process").exec;
var wget = require('node-wget');


var configFile = '/home/pi/camera.json';

var child_process = null;
var allowPhoto = true;

var SERVER_API = 'http://192.168.1.99';

var PROCESS_RUNNING_FLAG = false;

var dirName = __dirname || "/home/pi";
var isBusy = true;


// Exit strategy to kill child process
// (eg. for timelapse) on parent process exit
process.on('exit', function () {
  if (PROCESS_RUNNING_FLAG) {
    child_process.kill();
  }
});

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
  var defaultOptions = {
    mode: "photo",
    output: dirName + "/photo%d.jpg",
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

  camera.on("read", function (err, timestamp, filename) {

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
  });

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

  //listen for the "stop" event triggered when the stop method was called
  camera.on("stop", function () {
    console.log("camera stop");
//    uploadFiles();
  });

  //listen for the process to exit when the timeout has been reached
  camera.on("exit", function () {
    console.log("camera exit");
    setTimeout(function () {
      uploadFiles();
    }, 500);
  });


  function resetCameraParams() {
    skipFrame = 0;
    camera.opts = {
      log: function(ms){
        console.log(ms);
      }
    };
  }

  function takePhoto(config) { // "thumb", "preview", "photo"

    try {
      console.log("takePhoto:" + config)

      resetCameraParams();

      updateBusyState(true);

      camera.set('mode', 'photo');

      switch (config) {
        case "thumb": {
          camera.set('nopreview', true);
          camera.set('timeout', 500);
          camera.set('width', 160);
          camera.set('height', 90);
          camera.set('output', dirName + "/file-thumb.jpg");

          camera.start();

          break;
        }
        case "preview": {
          camera.set('nopreview', true);
          camera.set('timeout', 500);
          camera.set('width', 3280);
          camera.set('height', 2464);
          camera.set('output', dirName + "/file-preview.jpg");

          camera.start();

          break;
        }
        case "photo": {
          if (command) {

            console.log("command:", command);

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

    console.log("chabge " + channel + " value " + value);
  
    if (channel == 7 && value == 1 && command && allowPhoto) {
		allowPhoto = false;
      console.log("take photo");

      takePhoto('photo');

      /*setTimeout(function(){
       gpio.write(12, false);
       },300);*/
    }
  });

  socket.on('soft trigger', function (data) {
    if (command) {
      takePhoto('photo');
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


