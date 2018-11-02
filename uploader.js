var fs = require('fs');
var path = require('path');
var exists = require('fs-exists-sync');
var request = require('request');
var config = require('./uploaderConfig');
const erpNotifierConfig = require('./erp-notifier.config');


var cityid = config.cityid; //'dba40f30-5b1f-444d-9468-5c215de685f1';
var baseurl = config.baseurl; //'http://localhost:3000/upload/';
var basepath = config.basepath; //'c:/photos/';

process.on('uncaughtException', function (err) {
  console.log(err);
  //process.exit()
})

start();

function notifyERP(src, action, callback) {
	
	console.log(`action: ${action}`);

  try {

    if (!fs.existsSync(`${src}/example.json`)) {

      throw new Error(`File example.json doesn't exist`);
    }

    const example = JSON.parse(
      fs.readFileSync(`${src}/example.json`)
    );

    request.put({
      headers: {
        'Authorization': 'Basic ' + Buffer
          .from(`${erpNotifierConfig.username}:${erpNotifierConfig.password}`)
          .toString('base64')
      },
      url: `${erpNotifierConfig.host}/erpnext/tasks/modeling/${example.taskName}/${action}`
    }, (error, response, body) => {

      if (error || response.statusCode !== 200) {

        if (error) {

          console.error(error.stack);
        } else {

          console.error(`Unable to send request, status: ${response.statusCode}, body: ${body}`);
        }
      }

	  console.log(`Task: ${example.taskName}, action: ${action}`);
      callback();
    });
  } catch (e) {

    console.error(e.stack);
    callback();
  }
}

////////////////////////////////////////////
function start() {
  fs.readdir(basepath, function (err, items) {
    if (err) {
      console.log('Error daemon', err);
      return;
    }

    for (var i = 0; i < items.length; i++) {
      var path = basepath + '/' + items[i];

      if (!fs.lstatSync(path).isDirectory()) {
        items.splice(i, 1);
        i--;
      }
      ;
    }

    if (items.length == 0) {
      process.exit();
      //return;
    }

    copyFolder(items);
  });
}

function copyFolder(foldersList) {

  foldersList = foldersList.filter(function (directory) {

    var now = (new Date()).getTime();
    var shiftedTime = now - 1000 * 60 * 2;

    /*    console.log({
          now: now,
          shiftedTime: shiftedTime
        })*/

    try {

      var dt = (new Date(parseInt(directory))).getTime();

      if (dt < shiftedTime) {
        return true;
      }
    } catch (ex) {
    }

    return false;
  });

  if (foldersList.length > 0) {

    // take first folder from the list
    folderName = foldersList[0];
    console.log('Folder: ' + folderName);

    var src = basepath + '/' + folderName;
    var dst = '/';

    if (isFolderNotEmpty(src)) {

      notifyERP(src, 'transferringStarted', () => {

        fs.readdir(src, function (err, items) {
          if (err) {
            console.log('Error read directory', err);
            process.exit(1);
            return;
          }

          var promises = items.map(function (item) {
            return new Promise(function (res, rej) {
              var subFolder = path.resolve(src, item)
              if (fs.lstatSync(subFolder).isDirectory()) {
                fs.readdir(subFolder, function (err, subitems) {
                  if (err) {
                    console.log('Error read directory', err);
                    rej([]);
                    return;
                  } else {
                    res(subitems.map(function (subitem) {
                      return folderName + '/' + item + '/' + subitem
                    }));
                  }
                });
              }
              else {
                res([folderName + '/' + item]);
              }
            });
          });

          Promise.all(promises).then(function (items) {
            var filesList = [];
            items.forEach(function (list) {
              filesList = filesList.concat(list);
            })

            filesList = filesList.sort().reverse();


            copy(filesList, 0, (isOK) => {

              if (isOK) {

                setTimeout(() => {

                  notifyERP(src, 'transferringCompleted', () => {

                    deleteFolderRecursive(src);
                    process.exit();
                  });
                }, 1000);
              } else {

                console.log('Some errors occurred during transporting. Will try to reupload next time')
              }
            });
          })
        });
      });
    } else {

      deleteFolderRecursive(src);
    }
  } else {

    process.exit();
  }
}


function copy(filesList, pos, callback) {
  var file = filesList[pos];
  var res = copyFile(file, function (isOK) {
    if (isOK) {
      pos++;
      if (pos < filesList.length) {
        copy(filesList, pos, callback);
      }
      else {
        callback(true);
      }
    } else {
      console.log("Retry to copy file")
      copy(filesList, pos, callback);
    }
  });
}

function copyFile(filename, callback) {
  var file = basepath + '/' + filename;
  var url = baseurl + cityid + '/' + filename;

  var rs = fs.createReadStream(file);
  var ws = request.post(url);

  ws.on('drain', function () {
    //console.log('drain');
    rs.resume();
  });

  rs.on('end', function () {
    //console.log('file end');
    //callback(true);
  });

  ws.on('error', function (err) {
    console.log('cannot send file', err);
    callback(false);
  });

  ws.on('end', function (err) {
    setTimeout(function () {
      callback(true);
    }, 100);
  });

  rs.pipe(ws);
}

function addFolderPrefix(folder) {
  var folders = folder.split('/');
  folders[folders.length - 1] = "not_uploaded_" + folders[folders.length - 1];
  return folders.join('/');
}

function isFolderNotEmpty(src) {
  var proj = src + "/projection";
  var norm = src + "/normal";
  projFiles = [];
  normFiles = [];

  if (exists(proj)) {
    projFiles = fs.readdirSync(proj);
  }

  if (exists(norm)) {
    normFiles = fs.readdirSync(norm);
  }

  if (normFiles.length === 0 && projFiles.length === 0) {
    return false;
  }

  return true;
}


function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
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