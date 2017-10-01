var _ = require('lodash');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 80;
var fs = require('fs');
var ss = require('socket.io-stream');
var mkdirp = require('mkdirp');

var API = '/api';

var srcFolder = "c:\\example\\";
var destFolder = "c:\\example\\";

//app.use('/static', express.static(path.join(__dirname, 'public')))
app.use(API, express.static('server'));
/*app.use(express.static('preview'));
 app.use(express.static('photos'));*/


var session = null;
var scanners = [];
var controllers = [];
//var projectors = [];
var mainTrigger = null;

io.on('connection', function (socket) {

  // add clients

  socket.on('disconnect', function () {


    var pos = scanners.indexOf(socket);
    if (pos != -1) {
      scanners.splice(pos, 1);
    }
    var pos = controllers.indexOf(socket);
    if (pos != -1) {
      controllers.splice(pos, 1);
    }

    if (mainTrigger === socket) {
      mainTrigger = null;
    }

    reloadData();
  });


  /*socket.on('add projector', function (projector) {
    //console.log("add projector");
    socket.projector = projector;
//    projectors.push(socket);
    reloadData();
  });*/

  socket.on('add scanner', function (scanner) {
    //console.log("add scanner");
    socket.scanner = scanner;
    scanners.push(socket);
    reloadData();
  });

  socket.on('update scanner', function (scanner) {
    /*        socket.scanner = scanner;
     scanners.push(socket);
     reloadData();*/
  });

  socket.on('add controller', function (controller) {

    socket.controller = controller;
    controllers.push(socket);

    reloadData(socket);
  });

  socket.on('add trigger', function (trigger) {
    socket.trigger = trigger;
    mainTrigger = socket;
    reloadData();

    //io.emit('chat message', msg);
  });

  ss(socket).on('file', function (stream, data) {
    if(session){
      var id = session.id || "not_configured_session";

      var newDir = __dirname + "/server/photos/" + id + "/";
      mkdirp(newDir, function(){
        var dir = newDir + ((data.index == 0) ? "normal/" : "projection/");

        mkdirp(dir, function() {
          stream.pipe(fs.createWriteStream(dir + (data.numb ? data.numb : data.ip) + ".jpg"));
        })
      });
    } else {
      stream.pipe(fs.createWriteStream(__dirname + "/server/photos/" + (data.numb ? data.numb : data.ip) + "_" + data.index + ".jpg"));
    }
  });

  ss(socket).on('file-preview', function (stream, data) {

    //console.log("~~~~file-preview");

    var previewFileName = "/preview/preview_" + data.ip + ".jpg";
    stream.pipe(fs.createWriteStream(__dirname + "/server" + previewFileName));

    stream.on('finish', function () {
      for (var i = 0; i < controllers.length; i++) {
        controllers[i].emit("file-preview", {
          ip: data.ip,
          numb: data.numb,
          preview: API + previewFileName + "?" + Math.round(Math.random() * 10000000)
        });
      }
    });
  });

  ss(socket).on('file-thumb', function (stream, data) {
    //console.log("~~~~file-thumb:" + data.ip);

    var ip = data.ip;

    var scanner = getScannerByIp(ip);
    if (scanner) {
      var thumbFileName = "/preview/thumb_" + data.ip + ".jpg";
      stream.pipe(fs.createWriteStream(__dirname + "/server" + thumbFileName));
      scanner.scanner.thumb = API + thumbFileName + "?" + Math.round(Math.random() * 10000000);

      stream.on('finish', function () {
        updateScanner({
          ip: data.ip,
          numb: scanner.scanner.numb,
          thumb: scanner.scanner.thumb
        });
      });
    }
  });


  function getScannerByIp(ip) {
    var revScanners = scanners.reverse();
    return _.find(revScanners, function (scan) {
      return scan.scanner.ip == ip;
    })
  }

  socket.on('set number', function (data) {
    var scanner = getScannerByIp(data.ip);
    if (scanner) {
      scanner.scanner.numb = data.numb;
      scanner.emit('set number', data.numb);
    }
  });

  socket.on('preview ip', function (data) {
    var scanner = getScannerByIp(data.ip);
    if (scanner) {
      scanner.emit('preview', data);
    } else {
      //alert("Scanner")
    }
  });

  function getConfigJSON(data) {

    var cfg = {
      "scanid"	: data.id,
      "normaldir" 	: srcFolder + data.id + "\\normal\\",
      "projectdir" 	: srcFolder + data.id + "\\projection\\",
      "emptydir" 	: srcFolder + data.id + "\\normal\\",
      "savedir" 	: destFolder,
      "firstName" : data.firstName,
      "lastName" : data.lastName
    }

    return JSON.stringify(cfg);
  }

  socket.on('set-session', function (data) {
    session = data;

    if(data) {
      var newConfig = getConfigJSON(data);

      var newDir = __dirname + "/server/photos/" + data.id + "/";
      mkdirp(newDir, function() {
        fs.writeFile(newDir + "example.json", newConfig, function (err) {
          if (err) {
            //return console.log(err);
            return;
          }
        });
      });
    }

    updateSession();
  });

  function updateSession(){
    for (var i = 0; i < controllers.length; i++) {
      controllers[i].emit("update-session", session);
    }
  }

  socket.on('soft trigger', function (cmd) {
    for (var i = 0; i < scanners.length; i++) {
      scanners[i].emit('soft trigger', cmd);
    }
    //reloadData();
  });

  socket.on('setup command', function (cmd) {
    for (var i = 0; i < scanners.length; i++) {
      scanners[i].emit('setup command', cmd);
    }
    //reloadData();
  });

  socket.on('start command', function (cmd) {
    if (mainTrigger) {
      mainTrigger.emit('start command', cmd);
    }

/*    for (var i = 0; i < projectors.length; i++) {
      projectors[i].emit('projector');
    }*/
  });

  socket.on('update-file', function (cmd) {
    for (var i = 0; i < scanners.length; i++) {
      scanners[i].emit('update-file', cmd);
    }
    //reloadData();
  });

  socket.on('shell', function (cmd) {
    for (var i = 0; i < scanners.length; i++) {
      scanners[i].emit('shell', cmd);
    }
    //reloadData();
  });

  socket.on('shell-feedback', function (cmd) {
    //reloadData();
    for (var i = 0; i < controllers.length; i++) {
      controllers[i].emit('shell-feedback', cmd);
    }
  });

  socket.on('get-data', function (cmd) {
    reloadData();
  });

});

function updateScanner(scanner) {
  for (var i = 0; i < controllers.length; i++) {
    controllers[i].emit('update-scanner', scanner);
  }
}

function reloadData(controller) {

  var data = {
    scanners: _.map(scanners, function (scanner) {
      return {
        id: scanner.id,
        data: scanner.scanner
      }
    }),
/*    projectors: _.map(projectors, function (scanner) {
      return {
        id: scanner.id,
        data: scanner.scanner
      }
    }),*/
    trigger: mainTrigger ? {
      id: mainTrigger.id,
      data: mainTrigger.trigger
    } : null
  };

  if (controller) {
    controller.emit('load data', data);
  }
  else {
    for (var i = 0; i < controllers.length; i++) {
      controllers[i].emit('load data', data);
    }
  }
}


http.listen(port, function () {
  ///console.log("connected")
});




