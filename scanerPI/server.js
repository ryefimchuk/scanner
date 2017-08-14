var shell = require('shelljs');
var gpio = require('rpi-gpio');
var ip = require('ip');
var s = require('socket.io-client');
var fs = require('fs');
var ss = require('socket.io-stream');

var RaspiCam = require("raspicam");


var configFile = '/home/pi/camera.json';


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

	var rpiIp = ip.address() // my ip address

	var command = "";
	var socket = s('http://192.168.1.99');

	socket.on('connect', function(c){
		console.log("connected to server");

		socket.emit("add scanner", {
			ip: rpiIp,
            numb: config.numb,
			files:[]
		});

//        takePhoto('preview');
    });
	
	socket.on('shell', function(data){
		shell.exec(data);

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
		command = data;
		console.log("setup command:", data);
	});
	socket.on('disconnect', function(e){
		console.log("disconnected from server");

	});

	var opts = {
		mode: "timelapse",
		tl: 300,
		t: 400,
		n: true,
		output: __dirname + "/photo%d.jpg",
		width: 3280,
		height: 2464
	};

	var camera = new RaspiCam(opts);



	//listen for the "start" event triggered when the start method has been successfully initiated
	camera.on("start", function(){
		//do stuff
	});


	camera.on("read", function(err, timestamp, filename){

        camera.stop();

	console.log("read");


        var command = "";
        if(filename.indexOf('file-preview') > -1){
            command = 'file-preview';
        }
        if(filename.indexOf('file-thumb') > -1){
            command = 'file-thumb';
        }
        if(filename.indexOf('photo') > -1){
            command = 'file';
        }

	console.log(command);

        var stream = ss.createStream();
        ss(socket).emit(command, stream, {
            ip:rpiIp,
            numb: config.numb,
            index: "0"
        });

        //var filename = '/home/pi/test0.jpg';
        fs.createReadStream(filename).pipe(stream);


        console.log(filename + " : "+ (new Date()));
	});


	//listen for the "stop" event triggered when the stop method was called
	camera.on("stop", function(){
		//do stuff
	});

	//listen for the process to exit when the timeout has been reached
	camera.on("exit", function(){
		//do stuff
	});


	function takePhoto(config){ // "thumb", "preview", "photo"
		camera.set('mode', 'photo');


		console.log("Previw config: " + config);

		switch(config){
            case "thumb":{
                camera.set('width', 160);
                camera.set('height', 90);
                camera.set('output', __dirname + "/file-thumb.jpg");

                break;
            }
            case "preview":{
/*                camera.set('width', 3280);
                camera.set('height', 2464);*/
                camera.set('output', __dirname + "/file-preview.jpg");

                break;
            }
            case "photo":{
                camera.set('width', 3280);
                camera.set('height', 2464);
                camera.set('output', __dirname + "/photo%d.jpg");

                break;
            }
		}

        camera.start();
	}


    socket.on('preview', function(data){

        takePhoto('preview');

/*    	camera.set('mode', 'photo');

        camera.start();*/


        setTimeout(function(){
            camera.stop();

            var stream = ss.createStream();
            ss(socket).emit('file-preview', stream, {
                ip:rpiIp,
		numb: config.numb,
                index: "0"
            });

            var filename = '/home/pi/file-preview.jpg';
            fs.createReadStream(filename).pipe(stream);

//            console.log("send file");

        }, 4000);
    });


    console.log("Scanner started");
	console.log("Current ip: " + rpiIp);

	var attempt = 0;

	gpio.on('change', function(channel, value) {
		
		if(channel == 7 && value == 1){

			console.log("execute command");


            		takePhoto('photo');

            //camera.set('mode', 'timelapse');

            //camera.start();
			/*setTimeout(function(){
								  
				var stream = ss.createStream();
				ss(socket).emit('file', stream, {
					ip:rpiIp,
					index: "0"
				});

				var filename = __dirname + '/test0.jpg';
				fs.createReadStream(filename).pipe(stream);
				  
				console.log("send file");
				
			}, 4000);*/

			setTimeout(function(){
				gpio.write(12, false);
			},300);		
		}

		//console.log('Channel ' + channel + ' value is now ' + value);
	});
	 
	gpio.setup(12, gpio.DIR_OUT, write);
	gpio.setup(7, gpio.DIR_IN, gpio.EDGE_BOTH);


	function write() {
		gpio.write(12, false);
	}


}, 10000);
