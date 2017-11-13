var fs = require('fs');
var mkdirp = require('mkdirp');


var initJSONLocation = "c:\\monitor\\example.json"
var doneJSONLocation = "c:\\monitor\\example.json.done"


var inputJSONName = "example.json"
var inputFolder = "c:\\example\\"

var searching = false;

function searchNewData(){
  fs.readdir(inputFolder, function(err, items){


    if(err){
    	console.log("Error daemon", err)
		return;
    }

    console.log("try to search new JSON")
    for(var i = 0; i < items.length; i++){

      var folder = inputFolder + items[i] + "\\";
      var newJSON = folder + inputJSONName;
      if(fs.existsSync(newJSON)){

        console.log("new JSON is found")

        copyJSON(newJSON, folder);

        //searching = false;
        break;
      }
    }

    searching = false;
  });
}


function copyJSON(newJSON, folder){

  // remove done JSON
  fs.unlink(doneJSONLocation, function(){
  });

  // copy new JSON to init directory
  var ws = fs.createWriteStream(initJSONLocation);
  ws.on("close", function(){

    console.log("JSON copied into init folder");

    setTimeout(function(){
      searching = false;

      // Rename original file
      fs.rename(newJSON, folder + "example.done.json", function(){
      });
    },500);

  });
  fs.createReadStream(newJSON).pipe(ws);
}

function checkJSONDone(callback){
  // check is done exist
  if(fs.existsSync(doneJSONLocation)){
    console.log("JSON done")
    searching = true;
    callback();
  }
}

setInterval(function(){

  if(!searching) {
    console.log("check is JSON done")
    checkJSONDone(function(){
      searchNewData();
    });
  }
}, 3000)
