var _ = require('lodash');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 80;
var fs = require('fs');
var ss = require('socket.io-stream');

var API = '/api';

//app.use('/static', express.static(path.join(__dirname, 'public')))
app.use(API, express.static('server'));
/*app.use(express.static('preview'));
app.use(express.static('photos'));*/


var scanners = [];
var controllers = [];
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

        //console.log("added trigger");
        //io.emit('chat message', msg);
    });


    ss(socket).on('file', function (stream, data) {
		//console.log("~~~~file");
        stream.pipe(fs.createWriteStream(__dirname + "/server/photos/" + (data.numb ? data.numb : data.ip) + "_" + data.index + ".jpg"));
    });

    ss(socket).on('file-preview', function (stream, data) {
		
		//console.log("~~~~file-preview");

        var previewFileName = "/preview/preview_" + data.ip + ".jpg";
        stream.pipe(fs.createWriteStream(__dirname + "/server" + previewFileName));

        stream.on('finish', function () {
            for(var i = 0; i < controllers.length; i++){
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
        if(scanner){
            var thumbFileName = "/preview/thumb_" + data.ip + ".jpg";
            stream.pipe(fs.createWriteStream(__dirname + "/server" + thumbFileName));
            scanner.scanner.thumb = API + thumbFileName + "?" + Math.round(Math.random() * 10000000);

            stream.on('finish', function () {
                updateScanner({
                    ip: data.ip,
                    thumb: scanner.scanner.thumb
                });
            });
        }
    });


    function getScannerByIp(ip){
	var revScanners = scanners.reverse();
        return _.find(revScanners, function(scan){
            return scan.scanner.ip == ip;
        })
    }

    socket.on('set number', function (data) {
        var scanner = getScannerByIp(data.ip);
        if(scanner) {
            scanner.scanner.numb = data.numb;
            scanner.emit('set number', data.numb);
        }
    });

    socket.on('preview ip', function (data) {
        var scanner = getScannerByIp(data.ip);
        if(scanner) {
            scanner.emit('preview', data);
        }else{
            //alert("Scanner")
        }
    });
	
	
	
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
        //reloadData();
    });

    socket.on('shell', function (cmd) {
        for (var i = 0; i < scanners.length; i++) {
            scanners[i].emit('shell', cmd);
        }
        //reloadData();
    });

    socket.on('get-data', function (cmd) {
        reloadData();
    });

});

function updateScanner(scanner){
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
        trigger: mainTrigger ? {
            id: mainTrigger.id,
            data: mainTrigger.trigger
        } : null
    };

    if(controller){
        controller.emit('load data', data);
    }
    else
    {
        for (var i = 0; i < controllers.length; i++) {
            controllers[i].emit('load data', data);
        }
    }
}



http.listen(port, function () {
	///console.log("connected")
});




