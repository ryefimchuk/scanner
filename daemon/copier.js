var fs = require('fs');
var mkdirp = require('mkdirp');

var inputFolder = 'D:\\projects\\scanner3D\\server\\photos\\';
var outputFolder = 'c:\\example\\';

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

function copyFolder(srcFolder, destFolder) {
  createFolder(destFolder, function(err) {
    if (err) console.error(err);

    var norm = srcFolder + 'normal\\';
    var proj = srcFolder + 'projection\\';
    var destNorm = destFolder + 'normal\\';
    var destProj = destFolder + 'projection\\';

    if (fs.existsSync(norm)) {
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

          if (fs.existsSync(proj)) {
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
          } else {
            copyFile(srcFolder + 'example.json', destFolder + 'example.json');
          }
        });
      });
    }
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
      var destFolder = outputFolder + items[i] + '\\';

      if (fs.existsSync(srcFolder) && !fs.existsSync(destFolder)) {
        newData = true;
        console.log('Start copying');
        copyFolder(srcFolder, destFolder);
        break;
      }
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
