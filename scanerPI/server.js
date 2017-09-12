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

var PROCESS_RUNNING_FLAG = false;

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

setTimeout(function () {

  var opts = {
    log: function (data) {

    },
    mode: "photo",
    output: __dirname + "/photo%d.jpg",
    width: 3280,
    height: 2464
  };

  var camera = new RaspiCam(opts);

  var rpiIp = ip.address() // my ip address

  var command = null;
  var socket = s('http://192.168.1.99');

  socket.on('connect', function (c) {
    console.log("connected to server");

    socket.emit("add scanner", {
      ip: rpiIp,
      numb: config.numb,
      files: []
    });

    takePhoto('thumb');
  });

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
    try {
      command = JSON.parse(data);

      if (command) {
        for (var op in camera.opts) {
          if (typeof (camera.opts[op]) != 'function') {
            delete camera.opts[op];// = undefined;
          }
        }

        for (var op in command) {
          camera.opts[op] = command[op];
        }
      }

    }
    catch (ex) {
      console.log("Setup command error: " + ex.message);
    }

    console.log(JSON.stringify(camera.opts));
  });

  socket.on('disconnect', function (e) {
    files = [];
    console.log("disconnected from server");
  });


  //listen for the "start" event triggered when the start method has been successfully initiated
  camera.on("start", function () {
    //do stuff
    files = [];
  });

  camera.on("read", function (err, timestamp, filename) {

    try {
      console.log("current file name:" + filename)

      camera.stop();

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
    try {

      for (var i = 0; i < files.length; i++) {
        var f = files[i];

        var stream = ss.createStream();
        ss(socket).emit(f.type, stream, {
          ip: rpiIp,
          numb: config.numb,
          index: "0"
        });

        setTimeout(function () {
          fs.createReadStream(__dirname + "/" + f.filename).pipe(stream);
        }, 300);
      }

      files = [];
    }
    catch (e) {
      console.log("Error: Upload files to server: " + e.message);
    }
  }

  //listen for the "stop" event triggered when the stop method was called
  camera.on("stop", function () {
    uploadFiles();
  });

  //listen for the process to exit when the timeout has been reached
  camera.on("exit", function () {
    uploadFiles();
  });

  function takePhoto(config) { // "thumb", "preview", "photo"

    try {
      console.log("takePhoto:" + config)

      camera.set('mode', 'photo');

      switch (config) {
        case "thumb": {
          camera.set('width', 160);
          camera.set('height', 90);
          camera.set('output', __dirname + "/file-thumb.jpg");

          camera.start();

          break;
        }
        case "preview": {
          camera.set('width', 3280);
          camera.set('height', 2464);
          camera.set('output', __dirname + "/file-preview.jpg");

          camera.start();

          break;
        }
        case "photo": {

          if (command) {
            camera.opts.height = command.height;
            camera.opts.width = command.width;
            camera.opts.output = command.output;

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
  
    if (channel == 7 && value == 1 && command) {
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
  
  gpio.setup(12, gpio.DIR_OUT, write);
  gpio.setup(7, gpio.DIR_IN, gpio.EDGE_BOTH);


	function write() {
	  gpio.write(12, false);
	}


}, 10000);


