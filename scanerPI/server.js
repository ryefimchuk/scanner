var shell = require('shelljs');
var gpio = require('rpi-gpio');
var ip = require('ip');
var s = require('socket.io-client');
var fs = require('fs');
var ss = require('socket.io-stream');
var RaspiCam = require("raspicam");
var spawn = require("child_process").spawn;


var configFile = '/home/pi/camera.json';

var child_process = null;

var PROCESS_RUNNING_FLAG = false;

// Exit strategy to kill child process
// (eg. for timelapse) on parent process exit
process.on('exit', function() {
    if(PROCESS_RUNNING_FLAG){
        child_process.kill();
    }
});



var config = {
    numb: ""
};

function loadConfig(){
    fs.readFile(configFile, function read(err, data) {
        if (err) {
            return;
        }
        config = JSON.parse(data);
    });
}

function saveConfig(){
    var data = JSON.stringify(config);

    fs.writeFile(configFile, data, function(err) {
        if(err) {
            //return console.log(err);
            return;
        }
    });
}

loadConfig();

setTimeout(function(){

    var opts = {
        mode: "photo",
        output: __dirname + "/photo%d.jpg",
        width: 3280,
        height: 2464
    };

    var camera = new RaspiCam(opts);

    var rpiIp = ip.address() // my ip address

    var command = null;
    var socket = s('http://192.168.1.99');

    socket.on('connect', function(c){
        console.log("connected to server");

        socket.emit("add scanner", {
            ip: rpiIp,
            numb: config.numb,
            files:[]
        });

        takePhoto('thumb');
    });
    
    socket.on('shell', function(data){
        //data
        var args = data.split(" ");
        var comm = args [0];
        args = args.splice(0, 1);

        console.log(comm + " | " +  args.join(" "));
        child_process = spawn(comm, args);

        PROCESS_RUNNING_FLAG = true;

        //shell.exec(data);

        socket.emit("shell", {
            ip: rpiIp,
            numb: config.numb,
            result:[]
        });
    });

    socket.on('set number', function(newNumber){
        config.numb = newNumber;
        saveConfig();
    });

    socket.on('setup command', function(data){
		try{
			command = JSON.parse(data);
		
		
			if(command){
				for(var op in camera.opts){
					if(typeof (camera.opts[op]) != 'function'){
						camera.opts[op] = undefined;
					}
				}			
				
				for(var op in command){
					camera.opts[op] = command[op];
				}
			}

		}
		catch(ex){}
        
		console.log(JSON.stringify(camera.opts));
    });

    socket.on('disconnect', function(e){
        console.log("disconnected from server");
    });



    //listen for the "start" event triggered when the start method has been successfully initiated
    camera.on("start", function(){
        //do stuff
    });

    camera.on("read", function(err, timestamp, filename){
        
        console.log("current file name:" + filename)

        camera.stop();

        var type = "";
        if(filename.indexOf('file-preview') > -1){
            type = 'file-preview';
        }
        else if(filename.indexOf('file-thumb') > -1){
            type = 'file-thumb';
        }
        else if(filename.indexOf('photo') > -1){
            type = 'file';
        }

        console.log('read: ' + type);
        
        var stream = ss.createStream();
        ss(socket).emit(type, stream, {
            ip:rpiIp,
            numb: config.numb,
            index: "0"
        });

        setTimeout(function(){
            fs.createReadStream(__dirname + "/" + filename).pipe(stream);
        },300);

        console.log(filename + " : "+ (new Date()));
    });


    //listen for the "stop" event triggered when the stop method was called
    camera.on("stop", function(){

    });

    //listen for the process to exit when the timeout has been reached
    camera.on("exit", function(){

    });


    function takePhoto(config){ // "thumb", "preview", "photo"
        
        console.log("takePhoto:" + config)
        
        camera.set('mode', 'photo');

        switch(config){
            case "thumb":{
                camera.set('width', 160);
                camera.set('height', 90);
                camera.set('output', __dirname + "/file-thumb.jpg");

				camera.start();
				
                break;
            }
            case "preview":{
                camera.set('width', 3280);
                camera.set('height', 2464);
                camera.set('output', __dirname + "/file-preview.jpg");

				camera.start();
				
                break;
            }
            case "photo":{

				if(command){
					camera.opts.height = command.height;
					camera.opts.width = command.width;
					camera.opts.output = command.output;
					
					camera.start();
				}			

                break;
            }
        }

    }


    socket.on('preview', function(data){
        takePhoto('preview');
    });


    console.log("Scanner started");
    console.log("Current ip: " + rpiIp);

    var attempt = 0;

    gpio.on('change', function(channel, value) {
        
        if(channel == 7 && value == 1 && command){
            console.log("take photo");

            takePhoto('photo');

            setTimeout(function(){
                gpio.write(12, false);
            },300);     
        }
    });
	
	socket.on('soft trigger', function(data){
        if(command){
            takePhoto('photo');
        }
	})

}, 10000);


gpio.setup(12, gpio.DIR_OUT, write);
gpio.setup(7, gpio.DIR_IN, gpio.EDGE_BOTH);


function write() {
    gpio.write(12, false);
}
