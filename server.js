var _ = require('lodash');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = /*process.env.PORT || */ 80;
var fs = require('fs');
var ss = require('socket.io-stream');
var mkdirp = require('mkdirp');

var API = '/api';

var srcFolder = 'c:\\example\\';
var destFolder = 'c:\\example\\';

var destinationFolder = 'c:/photos/';


var systemBusy = false;

//app.use('/firmware', express.static('scanerPI'));
app.use(API, express.static('server'));

var lightSettings = {
  lightStart: 0,
  lightFinish: 500,
  projectorStart: 500,
  projectorFinish: 500,
};

var photoSettings = null;
var presets = [];
var selectedPreset = '';

var session = null;
var scanners = [];
var controllers = [];
//var projectors = [];
var mainTrigger = null;

var configFile = 'settings.json';

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

  for (var i = 0; i < scanners.length; i++) {
    scanners[i].emit('update-session', session);
  }
}


io.on('connection', function(socket) {
  socket.on('disconnect', function() {
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

  socket.on('add scanner', function(scanner) {
    //console.log("add scanner");
    socket.scanner = scanner;
    scanners.push(socket);

    if (photoSettings) {
      socket.emit('setup command', JSON.stringify(photoSettings));
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
      scanners[i].emit('setup command', JSON.stringify(photoSettings));
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

  ss(socket).on('file', function(stream, data) {
    if (session) {
      var id = session.id || 'not_configured_session';

      var newDir = destinationFolder + id + '/';
      mkdirp(newDir, function() {
        var dir = newDir + (data.index == 0 ? 'projection/' : 'normal/');

        mkdirp(dir, function() {
          stream.pipe(
            fs.createWriteStream(
              dir + (data.numb ? data.numb : data.ip) + '.jpg'
            )
          );
        });
      });
    } else {
      stream.pipe(
        fs.createWriteStream(
          destinationFolder +
            (data.numb ? data.numb : data.ip) +
            '_' +
            data.index +
            '.jpg'
        )
      );
    }
  });

  ss(socket).on('file-preview', function(stream, data) {
    var previewFileName = '/preview/preview_' + data.ip + '.jpg';
    stream.pipe(fs.createWriteStream(__dirname + '/server' + previewFileName));

    stream.on('finish', function() {
      for (var i = 0; i < controllers.length; i++) {
        controllers[i].emit('file-preview', {
          ip: data.ip,
          numb: data.numb,
          preview:
            API + previewFileName + '?' + Math.round(Math.random() * 10000000),
        });
      }
    });
  });

  ss(socket).on('file-thumb', function(stream, data) {
    //console.log("~~~~file-thumb:" + data.ip);

    var ip = data.ip;

    var scanner = getScannerByIp(ip);
    if (scanner) {
      var thumbFileName = '/preview/thumb_' + data.ip + '.jpg';
      stream.pipe(fs.createWriteStream(__dirname + '/server' + thumbFileName));
      scanner.scanner.thumb =
        API + thumbFileName + '?' + Math.round(Math.random() * 10000000);

      stream.on('finish', function() {
        updateScanner({
          ip: data.ip,
          numb: scanner.scanner.numb,
          thumb: scanner.scanner.thumb,
        });
      });
    }
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
      scanner.emit('set number', data.numb);
    }
  });

  socket.on('busy-state', function(data) {
    var scanner = getScannerByIp(data.ip);
    if (scanner) {
      scanner.scanner.isBusy = data.state;
    }

    reloadData();
  });

  socket.on('preview ip', function(data) {
    var scanner = getScannerByIp(data.ip);
    if (scanner) {
      scanner.emit('preview', data);
    } else {
      //alert("Scanner")
    }
  });

  function getConfigJSON(data) {
    var cfg = {
      scanid: data.id,
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
          } else {
            updateSession();
          }
        });
      });
    }
    else{
      updateSession();
    }
  });

  socket.on('soft trigger', function() {
    systemBusy = true;

    if (lightSettings) {
      for (var i = 0; i < scanners.length; i++) {
        scanners[i].emit('soft trigger', lightSettings);
      }

      if (mainTrigger) {
          mainTrigger.emit('soft trigger', JSON.stringify(lightSettings));
      }
    }

  });

  socket.on('setup settings', function(cmd) {
    lightSettings = cmd.light;
    photoSettings = cmd.photo;
    selectedPreset = cmd.selectedPreset;

    saveConfig();

    for (var i = 0; i < scanners.length; i++) {
      scanners[i].emit('setup command', JSON.stringify(cmd.photo));
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
      scanners[i].emit('update-file', cmd);
    }
  });

  socket.on('shell', function(cmd) {
    if(cmd.target) {
      var scanner = scanners.find(function(scanner){
        return scanner.scanner.ip == cmd.target;
      });
      if(scanner){
      	scanner.emit('shell', cmd.shellCommand);
      }
    } else {
      for (var i = 0; i < scanners.length; i++) {
        scanners[i].emit('shell', cmd.shellCommand);
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
  var isBusy = scanners.some(function(item) {
    return item.scanner.isBusy;
  });

  console.log('reloadData', {
    systemBusy: systemBusy,
    isBusy: isBusy
  })

  if(systemBusy && !isBusy){
    // reset session
    session = null;
    updateSession();
  }

  systemBusy = isBusy;

  var data = {
    isBusy: isBusy,
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
}

http.listen(port, function() {
  ///console.log("connected")
});
