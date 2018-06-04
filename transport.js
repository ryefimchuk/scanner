var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');

var app = express();

var basePath = "c:\\arch";


var cities = {
  "2d1472bd-0aeb-4836-8658-0836a665ae0c" : "DO",
  "2ae17ecb-3c4d-48b6-a29b-8a32c8a78c25" : "K",
  "dba40f30-5b1f-444d-9468-5c215de685f1" : "FFM",
  "f64f19a3-34b2-4c0c-b27e-b7b3959d41cd" : "HH",
  "e2059a34-c84d-497a-ae65-c96eb79f8a95" : "HB",
  "f5854ef6-9412-4c67-9588-221a74762214" : "B",
  "288c6b01-7e46-41ef-a6ce-a559df86b5be" : "S",
  /*"19bbec9c-5d42-45f8-81cf-9c730a12445f" : "",
  "13f5accc-18ec-4b5c-879e-4a98d9811b63" : "",
  "0defb591-70ab-49b3-8b6f-f2daa39e1a87" : "",
  "e00c1f6d-d7b8-4daa-a102-fd2bb32a0448" : "",
  "ef69bb49-4538-4717-8333-3012f16c51e6" : ""*/
}


app.set('port', process.env.PORT || 3000);
/*app.use(express.logger('dev'));*/
//app.use(express.methodOverride());
//app.use(app.router);
//app.use(express.errorHandler());

app.post('/upload/:cityid/:sessionid/:filename', function (req, res) {
  uploadFile(req, res);
});

app.post('/upload/:cityid/:sessionid/:foldername/:filename', function (req, res) {
  uploadFile(req, res);
});

function validateCity(req, res){
  var city = cities[req.params.cityid];
  if(!city){
    setTimeout(function(){
      res.sendStatus(400);
    }, 1000 * 5);
    return null;
  }
  return city;
}

function uploadFile(req, res){

  var city = validateCity(req, res);

  if(!city) return;
  var sessionid = path.basename(req.params.sessionid);
  var filename = path.basename(req.params.filename);

  var foldername = req.params.foldername ? path.basename(req.params.foldername) : "";

  if(foldername){
    filepath = path.resolve(basePath, city, sessionid, foldername);
  }
  else{
    filepath = path.resolve(basePath, city, sessionid);
  }


  mkdirp(filepath);

  var dst = fs.createWriteStream(filepath + '\\' + filename);
  req.pipe(dst);
  dst.on('drain', function() {
    //console.log('drain', new Date());
    req.resume();
  });
  req.on('error', function (err) {
    console.log(err);
    res.sendStatus(500);
  });
  req.on('end', function () {
    res.sendStatus(200);
  });
}

function mkdirp(dirname) {
  var dirs = dirname.split("\\");

  var path = "";
  for(var i = 0; i < dirs.length; i++){
    path += dirs[i] + '\\';

    if (!fs.existsSync(path)) {
      try{
        fs.mkdirSync(path);
      }
      catch(ex){

      }
    }
  }
}

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});