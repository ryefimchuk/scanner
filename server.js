var _ = require('lodash');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = /*process.env.PORT || */ 80;
var fs = require('fs');
var ss = require('socket.io-stream');
var mkdirp = require('mkdirp');
var net = require('net');
var API = '/api';

var timeoutInterval = 2 * 60

var srcFolder = 'c:\\example\\';
var destFolder = 'c:\\example\\';

var destinationFolder = 'c:/photos/';
var systemBusy = false;

var timeout = null;

var _reloadDataTimeout = null;

var CODE_PING_PONG = 100;

var CODE_ADD_PROJECTOR = 999;
var CODE_ADD_SCANNER = 1000;
var CODE_TAKE_THUMB = 1001;
var CODE_TAKE_PREVIEW = 1002;
var CODE_TAKE_PHOTO = 1003;
var CODE_SET_PHOTO_SETTINGS = 1004;
var CODE_UPLOAD_THUMB = 1005;
var CODE_UPLOAD_PREVIEW = 1006;
var CODE_UPLOAD_PHOTO1 = 1007;
var CODE_UPLOAD_PHOTO2 = 1008;
var CODE_SET_SCANNER_NUMBER = 1009;
var CODE_EXECUTE_SHELL = 1010;
var CODE_UPDATE_BUSY_STATE = 1011;
var CODE_LOG_DATA = 1020;

function setCustomCacheControl (res, path) {

  res.setHeader('Cache-Control', 'public, max-age=10000')
}

app.use(API, express.static('server'));

app.use('/images', express.static(destinationFolder, {
  //maxage: '2h'
  setHeaders: setCustomCacheControl
}))


var lightSettings = {
  lightStart: 0,
  lightFinish: 500,
  projectorStart: 0,
  projectorFinish: 500,
};

var photoSettings = null;
var presets = [];
var selectedPreset = '';
var clientId = null;
var session = null;
var scanners = [];
var controllers = [];
var projector = null;
var mainTrigger = null;
var galleries = [];

var configFile = 'settings.json';

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index){
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function loadConfig() {
  fs.readFile(configFile, function read(err, data) {
    if (err) {
      return;
    }

    try {
      var config = JSON.parse(data);
      lightSettings = config.lightSettings || lightSettings;
      photoSettings = config.photoSettings || null;
      presets = config.presets || [];
      selectedPreset = config.selectedPreset || '';
    } catch (ex) {
      // console.log('Error settings.json');
    }
  });
}

function forceGC(){
  if (global.gc) {
    global.gc();
  } else {
    console.warn('No GC hook. Start your program as `node --expose-gc file.js`.');
  }
}

function saveConfig() {
  var data = JSON.stringify({
    photoSettings: photoSettings,
    lightSettings: lightSettings,
    presets: presets,
    selectedPreset: selectedPreset,
  });

  fs.writeFile(configFile, data, function(err) {
    if (err) {
      //return console.log(err);
      return;
    }
  });
}

loadConfig();


function updateSession() {
  for (var i = 0; i < controllers.length; i++) {
    controllers[i].emit('update-session', session);
  }
}

function scannerSend(socket, operation, data, timer){
  timer = timer || 0;
  var buffer = Buffer.allocUnsafe(12);
  buffer.writeUInt32BE(operation);
  buffer.writeUInt32BE(timer, 4);
  buffer.writeUInt32BE(data ? data.length : 0, 8);

  if(typeof(socket.length) !== 'undefined'){
    for(var i = 0; i < socket.length; i++){
      socket[i].write(buffer);
      if (data && data.length) {
        socket[i].write(data);
      }
    }
  } else {
    socket.write(buffer);
    if (data && data.length) {
      socket.write(data);
    }
  }

  if(operation == CODE_TAKE_PHOTO && !!projector){
    var buf = Buffer.alloc(12);
    buf.writeUInt32BE(0);
    buf.writeUInt32BE(timer, 4);
    buf.writeUInt32BE(data ? data.length : 0, 8);
    projector.write(buf);
    projector.write(data);
  }
}


function scannerMessage(socket, operation, data){
  switch(operation){
    case CODE_UPDATE_BUSY_STATE: {
      //console.log("CODE_UPDATE_BUSY_STATE", data.toString())
      var scanner = JSON.parse(data.toString());
      socket.scanner.isBusy = scanner.isBusy;
      reloadData();
      break;
    }
    case CODE_LOG_DATA: {
      try{
        var result = JSON.parse(data.toString());
      }
      catch(e){
        var result = data.toString();
      }

      /*if(socket.scanner && socket.scanner.numb == 1){
        console.log("Scanner data: ", result);
      }
      if(!socket.scanner){
        console.log("Projector data: ", result);
      }*/
      break;
    }
    case CODE_ADD_PROJECTOR: {
      projector = socket;
      console.log('Projector and light connected');
      reloadData();
      break;
    }
    case CODE_ADD_SCANNER: {
      socket.scanner = JSON.parse(data.toString());

      var scan = scanners.find(function(scan){
        return scan.scanner.ip == socket.scanner.ip
      });

      if(scan){
        var pos = scanners.indexOf(scan);
        if(pos != -1) {
          scanners.splice(pos, 1);
        }
        scan.destroy();
      }

      scanners.push(socket);

      console.log('Scanner registered. ip:' + socket.scanner.ip);
      reloadData();

      if (photoSettings) {
        scannerSend(socket, CODE_SET_PHOTO_SETTINGS, JSON.stringify(photoSettings));
        scannerSend(socket, CODE_TAKE_THUMB)
      }
      break;
    }
  }
}


var server = net.createServer(function(socket) {
  //console.log('New connection');
  var length = 0;
  var operation = 0;
  var payload = [];
  var payloadLength = 0;
  var fileStream = null;
  var piping = false;

  socket.on('close', function() {
    var pos = scanners.indexOf(socket);
    if (pos != -1) {
      console.log('Scanner disconnected');
      scanners.splice(pos, 1);
    }

    if(projector === socket){
      console.log('Projector and light disconnected');
    }

    reloadData();
  });

  socket.on("readable", function(){
    //console.log("readable");
    readStream();
  });

  function makeDir(newDir){
    try {
      fs.statSync(newDir);
    }
    catch(err) {
      fs.mkdirSync(newDir);
    }
  }


  function readStream(){
    var dataCompleted = false;
    while(!dataCompleted) {
      var data;
      if (operation === 0) {
        data = socket.read(8);
        if(!data){
          dataCompleted = true;
          return;
        }
        //console.log('Read header');
        operation = data.readUInt32BE(0);
        length = data.readUInt32BE(4);
        payloadLength = 0;
        payload = [];
        fileStream = null;
        piping = false;

        if (length === 0) {
          scannerMessage(socket, operation);
          //console.log('Message without payload is received: ' + operation)
          operation = 0;
          return;
        }

        if (operation === CODE_UPLOAD_THUMB) {
          //console.log('Uploading thumb');
          piping = true;
          var thumbFileName = '/preview/thumb_' + socket.scanner.ip + '.jpg';
          fileStream = fs.openSync(__dirname + '/server' + thumbFileName, 'w');

          socket.scanner.thumb =
            API + thumbFileName + '?' + Math.round(Math.random() * 10000000);
        }
        if (operation === CODE_UPLOAD_PREVIEW) {
          //console.log('Uploading preview')
          piping = true;
          var previewFileName = '/preview/preview_' + socket.scanner.ip + '.jpg';
          fileStream = fs.openSync(__dirname + '/server' + previewFileName, 'w');
        }
        if (operation === CODE_UPLOAD_PHOTO2) {
          //console.log('Uploading photo 2')
          piping = true;
          if (session) {
            var id = session.id || 'not_configured_session';
            var newDir = destinationFolder + id + '/';
            makeDir(newDir);
            var projDir = newDir + 'projection/'
            makeDir(projDir);
            fileStream = fs.openSync(
              projDir + (socket.scanner.numb ? socket.scanner.numb : socket.scanner.ip) + '.jpg',
              'w'
            )
          } else {
            fileStream = fs.openSync(
              destinationFolder + (socket.scanner.numb ? socket.scanner.numb : socket.scanner.ip) + '_' + 0 + '.jpg',
              'w'
            )
          }
        }
        if (operation === CODE_UPLOAD_PHOTO1) {
          //console.log('Uploading photo 1');
          piping = true;
          if (session) {
            var id = session.id || 'not_configured_session';
            var newDir = destinationFolder + id + '/';
            makeDir(newDir);
            var normalDir = newDir + 'normal/';
            makeDir(normalDir);
            fileStream = fs.openSync(
              normalDir + (socket.scanner.numb ? socket.scanner.numb : socket.scanner.ip) + '.jpg',
              'w'
            )
          } else {
            fileStream = fs.openSync(
              destinationFolder + (socket.scanner.numb ? socket.scanner.numb : socket.scanner.ip) + '_' + 1 + '.jpg',
              'w'
            )
          }
        }
      }

      if (piping) {
        var readableSize = Math.min(length - payloadLength, 1024 * 4);
        data = socket.read(readableSize);
        if(!data){
          dataCompleted = true;
          return;
        }

        payloadLength += data.length;

        fs.writeSync(fileStream, data);

        if (payloadLength === length) {
          piping = false;
          fs.closeSync(fileStream);
          //console.log('File received. Length: ' + payloadLength);

          if (operation === CODE_UPLOAD_THUMB) {
            updateScanner({
              ip: socket.scanner.ip,
              numb: socket.scanner.numb,
              thumb: socket.scanner.thumb
            });

          }
          if (operation === CODE_UPLOAD_PREVIEW) {
            var previewFileName = '/preview/preview_' + socket.scanner.ip + '.jpg';
            for (var i = 0; i < controllers.length; i++) {
              controllers[i].emit('file-preview', {
                ip: socket.scanner.ip,
                numb: socket.scanner.numb,
                preview: API + previewFileName + '?' + Math.round(Math.random() * 10000000)
              });
            }
          }

          operation = 0;
          length = 0;
          payloadLength = 0;
          payload = [];
        }
      } else {
        data = socket.read(Math.min(length - payloadLength, 1024 * 4));
        if(!data){
          dataCompleted = true;
          return;
        }

        //console.log('Payload receiving: ' + data.length);
        payloadLength += data.length;
        payload.push(data);

        if (payloadLength === length) {
          var payloadData = Buffer.concat(payload, payloadLength);
          scannerMessage(socket, operation, payloadData);
          //console.log('Message is received: ' + operation);
          operation = 0
        }
      }
    }
  }

  socket.on('error', function(err) {
    console.log(err);
  });
});

server.listen(port + 1);

io.on('connection', function(socket) {
  socket.on('disconnect', function() {
    var pos = controllers.indexOf(socket);
    if (pos != -1) {
      controllers.splice(pos, 1);
    }

    if (mainTrigger === socket) {
      mainTrigger = null;
    }

    if (projector === socket) {
      projector = null;
    }

    reloadData();
  });

  socket.on('add controller', function(controller) {
    socket.controller = controller;
    controllers.push(socket);

    socket.emit('current settings', {
      photoSettings: photoSettings,
      lightSettings: lightSettings,
      presets: presets,
      selectedPreset: selectedPreset,
    });

    reloadData();

    updateSession();
    updateClient();
  });

  socket.on('apply settings', function(presetName) {
    var preset = presets.find(function(item) {
      return item.name == presetName;
    });

    if (!preset) {
      return;
    }

    lightSettings = preset.lightSettings;
    photoSettings = preset.photoSettings;
    selectedPreset = presetName;

    saveConfig();

    socket.emit('current settings', {
      photoSettings: photoSettings,
      lightSettings: lightSettings,
      presets: presets,
      selectedPreset: selectedPreset,
    });

    for (var i = 0; i < scanners.length; i++) {
      scannerSend(scanners[i], CODE_SET_PHOTO_SETTINGS, JSON.stringify(photoSettings))
    }
  });

  socket.on('save preset', function(data) {
    presets = data.presets;
    selectedPreset = data.selectedPreset;
    lightSettings = data.lightSettings;
    photoSettings = data.photoSettings;

    saveConfig();
  });

  socket.on('add trigger', function(trigger) {
    socket.trigger = trigger;
    mainTrigger = socket;
    reloadData();
  });

  function getScannerByIp(ip) {
    var revScanners = scanners.reverse();
    return _.find(revScanners, function(scan) {
      return scan.scanner.ip == ip;
    });
  }

  socket.on('set number', function(data) {
    var scanner = getScannerByIp(data.ip);
    if (scanner) {
      scanner.scanner.numb = data.numb;
      scannerSend(scanner, CODE_SET_SCANNER_NUMBER, JSON.stringify(data.numb))
    }
  });


  socket.on('remove-camera', function(data) {
    var scanner = getScannerByIp(data.ip);
    if (scanner) {
      scanner.destroy();
    }
  });

  socket.on('preview ip', function(data) {
    var scanner = getScannerByIp(data.ip);
    if (scanner) {
      scannerSend(scanner, CODE_TAKE_PREVIEW)
    } else {
      //alert("Scanner")
    }
  });

  function getConfigJSON(data) {
    var cfg = {
      scanid: data.id,
      clientid: clientId,
      normaldir: srcFolder + data.id + '\\normal\\',
      projectdir: srcFolder + data.id + '\\projection\\',
      emptydir: srcFolder + data.id + '\\normal\\',
      savedir: destFolder,
      firstName: "", //data.firstName,
      lastName: "", //data.lastName,
      comments: data.comments,
      size: data.size,
      city: data.city
    };

    return JSON.stringify(cfg);
  }

  socket.on('get-galleries', function() {
    updateGalleries()
  });



  socket.on('remove-session', function(data) {
    sessionId = data.sessionId;

    var pos = galleries.indexOf(sessionId);
    if(pos != -1) {
      galleries.splice(pos, 1)
    }

    updateGalleries()
    updateClient()

    setTimeout(function(){

      deleteFolderRecursive(destinationFolder + sessionId)

    }, 1000)
  });

  socket.on('set-client', function(data) {
    galleries = []
    clientId = data.clientId

    updateGalleries()
    updateClient()
  });

  function updateGalleries() {
    for (var i = 0; i < controllers.length; i++) {
      controllers[i].emit('update-galleries', {
        galleries: galleries
      });
    }
  }

  function updateClient() {
    for (var i = 0; i < controllers.length; i++) {
      controllers[i].emit('update-client', {
        clientId: clientId
      });
    }
  }

  socket.on('set-session', function(data) {
    session = data;

    if (data) {
      var newConfig = getConfigJSON(data);

      var newDir = destinationFolder + data.id + '/';
      mkdirp(newDir, function() {
        fs.writeFile(newDir + 'example.json', newConfig, function(err) {
          if (err) {
            //return console.log(err);
            return;
          }
        });
      });
    }

    if(session && session.id) {
      galleries.push(session.id)
    }
    updateGalleries()

    updateSession();
  });

  socket.on('soft trigger', function() {

    systemBusy = true;

    forceGC();

    if (lightSettings) {

      var NS_PER_SEC = 1e9;

      var dt = new Date();

      var timer = parseInt(dt.getTime() / 1000.0) + 2;

      var logTime = process.hrtime();
      scannerSend(scanners, CODE_TAKE_PHOTO, JSON.stringify(lightSettings), timer);
      var diff = process.hrtime(logTime);
      console.log(`Broadcasting took ${(diff[0] * NS_PER_SEC + diff[1]) / 1000000.0} milliseconds`);

      timeout = setTimeout(function(){
        if(session){

          var allBusyScanners = scanners.filter(function(item) {
            return item.scanner.isBusy;
          });

          allBusyScanners.forEach(function(scanner){
            scanner.destroy();
          });

          setTimeout(function(){
            reloadData()
          }, 1000)
        }
        
        timeout = null;
      }, 1000 * timeoutInterval)
    }
  });

  socket.on('setup settings', function(cmd) {
    lightSettings = cmd.light;
    photoSettings = cmd.photo;
    selectedPreset = cmd.selectedPreset;

    saveConfig();

    for (var i = 0; i < scanners.length; i++) {
      scannerSend(scanners[i], CODE_SET_PHOTO_SETTINGS, JSON.stringify(cmd.photo))
    }
  });

  socket.on('start command', function() {
    systemBusy = true;

    if (mainTrigger && lightSettings) {
      mainTrigger.emit('start command', JSON.stringify(lightSettings));
    }
  });

  socket.on('update-file', function(cmd) {
    for (var i = 0; i < scanners.length; i++) {
        // todo
      //scannerSend(scanners[i], CODE_SET_PHOTO_SETTINGS, JSON.stringify(cmd.photo))
      //scanners[i].emit('update-file', cmd);
    }
  });

  socket.on('shell', function(cmd) {

    if(cmd.includeProjector && !!projector){
      scannerSend(projector, CODE_EXECUTE_SHELL, JSON.stringify(cmd.shellCommand))
    }

    if(cmd.target) {
      var scanner = scanners.find(function(scanner){
        return scanner.scanner.ip == cmd.target;
      });
      if(scanner){
        scannerSend(scanner, CODE_EXECUTE_SHELL, JSON.stringify(cmd.shellCommand))
      }
    } else {
      if(cmd.syncExecution){
        for (var i = 0; i < scanners.length; i++) {
          scannerSend(scanners[i], CODE_EXECUTE_SHELL, JSON.stringify(cmd.shellCommand));
        }
      } else {
        var scanns = scanners.sort(function(a, b){
          if(a.scanner.numb > b.scanner.numb)
            return 1;
          if(a.scanner.numb < b.scanner.numb)
            return -1;
          return 0;
        });
        for (var i = 0; i < scanns.length; i++) {
          (function (scan, step) {
            setTimeout(function () {
              scannerSend(scan, CODE_EXECUTE_SHELL, JSON.stringify(cmd.shellCommand));
            }, 300 * step);
          })(scanners[i], i);
        }
      }
    }
  });

  socket.on('shell-feedback', function(cmd) {
    //reloadData();
    for (var i = 0; i < controllers.length; i++) {
      controllers[i].emit('shell-feedback', cmd);
    }
  });

  socket.on('get-data', function(cmd) {
    reloadData();
  });
});

function updateScanner(scanner) {
  for (var i = 0; i < controllers.length; i++) {
    controllers[i].emit('update-scanner', scanner);
  }
}

function reloadData() {
  if(_reloadDataTimeout)
    return;

  _reloadDataTimeout = setTimeout(function(){
    _reloadDataTimeout = null;
    _reloadData();
  }, 1000)
}

function _reloadData() {
  var isBusy = scanners.some(function(item) {
    return item.scanner.isBusy;
  });

  /*console.log('reloadData', {
    systemBusy: systemBusy,
    isBusy: isBusy
  });*/

  if(systemBusy && !isBusy){
    // reset session
    session = null;

    if(timeout){
      clearTimeout(timeout)
      timeout = null;
    }

    updateSession();
  }

  systemBusy = isBusy;

  var data = {
    isBusy: isBusy,
    projector: !!projector,
    scanners: _.map(scanners, function(scanner) {
      return {
        id: scanner.id,
        data: scanner.scanner,
      };
    }),
    trigger: mainTrigger
      ? {
          id: mainTrigger.id,
          data: mainTrigger.trigger,
        }
      : null,
  };

  for (var i = 0; i < controllers.length; i++) {
    controllers[i].emit('load data', data);
  }
  forceGC();
}

http.listen(port, function() {
  console.log("Server started!")

  setInterval(function(){
    if(!systemBusy){
      scannerSend(scanners, CODE_PING_PONG)
    }
  }, 1000 * 20);


});
