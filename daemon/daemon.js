var fs = require('fs');
var mkdirp = require('mkdirp');

var inputFolder = 'c:\\example\\';
var monitorFolder = 'c:\\monitor\\';

var inputJSONName = 'example.json';
var doneJSONName = 'example.json.done';

var initJSONLocation = monitorFolder + inputJSONName;
var doneJSONLocation = monitorFolder + doneJSONName;

var searching = false;

function searchNewData() {
  fs.readdir(inputFolder, function(err, items) {
    if (err) {
      console.log('Error daemon', err);
      return;
    }

    var newData = false;
    console.log('try to found new JSON');
    for (var i = 0; i < items.length; i++) {
      var folder = inputFolder + items[i] + '\\';
      var newJSON = folder + inputJSONName;
      var doneJSON = folder + doneJSONName;

      if (fs.existsSync(newJSON) && !fs.existsSync(doneJSON)) {
        newData = true;
        console.log('New JSON is found');
        copyJSON(newJSON, folder);
        break;
      }
    }

    if (!newData) {
      searching = false;
      console.log('New data not found');
    }
  });
}

function copyJSON(newJSON, folder) {
  // copy new JSON to Builder directory
  var ws = fs.createWriteStream(initJSONLocation);
  ws.on('close', function() {
    console.log('JSON copied into init folder');
    fs.createReadStream(newJSON).pipe(fs.createWriteStream(newJSON + '.done'));

    setTimeout(function() {
      searching = false;
    }, 50);
  });

  fs.createReadStream(newJSON).pipe(ws);
}

function checkJSONDone(callback) {
  // check is done exist
  if (fs.existsSync(doneJSONLocation)) {
    fs.unlink(doneJSONLocation, function() {});
    console.log('Builder is ready');
    searching = true;
    callback();
  } else if (!fs.existsSync(initJSONLocation)) {
    console.log('Builder is ready');
    searching = true;
    callback();
  } else {
    console.log('Builder is busy');
  }
}

setInterval(function() {
  if (!searching) {
    console.log('Check builder');
    checkJSONDone(function() {
      searchNewData();
    });
  }
}, 5000);
