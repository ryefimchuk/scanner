var fs = require('fs');
var getClient = require('./ftpclient').getClient;
var uploadFolder = require('./ftpclient').uploadFolder;
var mkdirp = require('mkdirp');

var inputFolder = 'server\\photos\\';
var outputFolder = 'photo/';

var copying = false;

function copyFile(srcFile, destFile) {
  fs.readFile(srcFile, function read(err, data) {
    if (err) {
      throw err;
    }
    fs.writeFile(destFile, data);
  });
}

function createFolder(srcFolder, callback) {
  mkdirp(srcFolder, callback);
}

function uploadToFtp(srcFolder, destFolder) {
  uploadFolder(srcFolder, destFolder);
}

function existsFolder(folderName, notExists, exists) {

  getClient().ftp.list(folderName, false, function(err, list) {
    if (err) {
      if (notExists) notExists();

      //console.log('Error:', err);
      return;
    }

    if (exists) exists();

    console.log(list);
  });
}

function copyFolder(srcFolder, destFolder) {
  createFolder(destFolder, function(err) {
    if (err) console.error(err);

    var norm = srcFolder + 'normal\\';
    var proj = srcFolder + 'projection\\';
    var destNorm = destFolder + 'normal\\';
    var destProj = destFolder + 'projection\\';

    existsFolder(norm, function() {
      createFolder(destNorm, function(err) {
        fs.readdir(norm, function(err, items) {
          if (err) {
            console.log('Error daemon', err);
            return;
          }

          for (var i = 0; i < items.length; i++) {
            (function() {
              var fileName = items[i];
              copyFile(norm + fileName, destNorm + fileName);
            })();
          }

          existsFolder(
            proj,
            function() {
              createFolder(destProj, function(err) {
                fs.readdir(proj, function(err, items) {
                  if (err) {
                    console.error(err);
                    return;
                  }
                  for (var i = 0; i < items.length; i++) {
                    (function() {
                      var fileName = items[i];
                      copyFile(proj + fileName, destProj + fileName);
                    })();
                  }
                  copyFile(
                    srcFolder + 'example.json',
                    destFolder + 'example.json'
                  );
                });
              });
            },
            function() {
              copyFile(srcFolder + 'example.json', destFolder + 'example.json');
            }
          );
        });
      });
    });
  });
}

function searchNewData() {
  fs.readdir(inputFolder, function(err, items) {
    if (err) {
      console.log('Error daemon', err);
      return;
    }

    var newData = false;
    for (var i = 0; i < items.length; i++) {
      var srcFolder = inputFolder + items[i] + '\\';
      var destFolder = outputFolder + items[i] + '/';

      //check is file exists
      existsFolder(srcFolder, function(){
        if (fs.existsSync(srcFolder)/* && !fs.existsSync(destFolder)*/) {
          newData = true;
          console.log('Start copying');
          copyFolder(srcFolder, destFolder);
//          break;
        }
      });
    }

    if (!newData) {
      copying = false;
      console.log('New data not found');
    }
  });
}

setInterval(function() {
  if (!copying) {
    console.log('Check builder');
    searchNewData();
  }
}, 1000);
