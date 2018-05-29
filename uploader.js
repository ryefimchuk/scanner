var fs = require('fs');
var ftpClient = require('ftp-client');
var exists = require('fs-exists-sync');
var config = require('uploaderConfig');



var inputFolder = config.input,
  destFolder = '/',
  config = config.ftp,
  currentPass: 0,
  maxPasses: 10,
  client = new ftpClient(config, {
    logging: 'basic',
  });

////////////////////////////////////////////
client.connect(function(err) {
  console.log('FTP Client Connected');
  start();
});

////////////////////////////////////////////
function start() {
  fs.readdir(inputFolder, function(err, items) {
    if (err) {
      console.log('Error daemon', err);
      return;
    }

    for(var i = 0; i < items.length; i++){
      var path = inputFolder + '/' + items[i];

      if(!fs.lstatSync(path).isDirectory()){
          items.splice(i, 1);
          i--;
      };
    }


    if(items.length == 0){
      process.exit();
      //return;
    }

    copyFolder(items);
  });
}

function copyFolder(foldersList) {

  foldersList = foldersList.filter(function(directory){

    var now = (new Date()).getTime();
    var shiftedTime = now - 1000 * 60 * 10;

    console.log({
      now: now,
      shiftedTime: shiftedTime
    })

    try{
      var dt = (new Date(parseInt(directory))).getTime();

      if(dt < shiftedTime){
        return true;
      }
    }catch(ex){
    }

    return false;
  });

  if (foldersList.length > 0) {

    folderName = foldersList[0];

    var src = inputFolder + '/' + folderName;
    var dst = '/';

    if(isFolderNotEmpty(src)) {
  
      client.ftp.mkdir(folderName, function (err) {
        if (err && err.code != 550) {
            console.log("Can''t create folder on FTP", err)
            process.exit();
            return;
        }
    
        fs.readdir(src, function (err, items) {
            if (err) {
                console.log('Error read directory', err);
                process.exit();
                return;
            }
        
            var srcFolder = items
                .map(function (item) {
                    if (item.indexOf('.json') === -1) {
                        return src + '/' + item + '/**';
                    } else {
                        return src + '/' + item;
                    }
                }).sort().reverse();
        
            copySubfolders(srcFolder, dst, function () {
              var errorFiles = Object.keys(result.errors);
              if(errorFiles.length){
                console.log("Errors: " + src);
                fs.rename(src, addFolderPrefix(src), function(err){
                  process.exit();
                });
              }else{
                console.log("Remove: " + src);
                deleteFolderRecursive(src);

                process.exit();
              }
            });
        });
      });
    }
    else{
      deleteFolderRecursive(src);
    }
  }else{
    process.exit();
  }
}

function addFolderPrefix(folder){
  var folders = folder.split('/');
  folders[folders.length-1] = "not_uploaded_" + folders[folders.length-1];
  return folders.join('/');
}

function isFolderNotEmpty(src){
  var proj = src + "/projection";
  var norm = src + "/normal";
    projFiles = [];
    normFiles = [];

  if(exists(proj)){
    projFiles = fs.readdirSync(proj);
  }

  if(exists(norm)){
    normFiles = fs.readdirSync(norm);
  }

  if(normFiles.length === 0 && projFiles.length === 0){
    return false;
  }

  return true;
}

function copySubfolders(folders, dst, callback) {
  console.log('Input folders: ' + folders);
  currentPass++;

  client.upload(
    folders,
    dst,
    {
      baseDir: inputFolder,
      overwrite: currentPass === 1 ? 'all' : 'none',
    },
    function(result) {
      var errorFiles = Object.keys(result.errors);
      if(errorFiles.length && currentPass <= maxPasses) {
          copySubfolders(folders, dst, callback);
          //copySubfolders(errorFiles, dst, callback);
        } else {
          callback(result);
        }
      }
    }
  );
};


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