var shell = require('shelljs');
var gpio = require('rpi-gpio');
var ip = require('ip');
var s = require('socket.io-client');
var fs = require('fs');
var ss = require('socket.io-stream');

var RaspiCam = require("raspicam");



/*var Raspistill = require('node-raspistill').Raspistill;
var camera = new Raspistill({
	time: 10
});*/



setTimeout(function(){

	var rpiIp = ip.address() // my ip address


	var command = "";


	var socket = s('http://192.168.1.99');


	socket.on('connect', function(c){
		console.log("connected to server");

		socket.emit("add scanner", {
			ip: rpiIp, 
			files:[]
		});
	});
	
	


	socket.on('shell', function(data){
		shell.exec(data);

		socket.emit("shell", {
			ip: rpiIp, 
			result:[]
		});

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
		output: __dirname + "/test%d.jpg",
/*		w: 1920,
		h: 1024*/
		w: 3280,
		h: 2464
	};

	var camera = new RaspiCam(opts);



	//listen for the "start" event triggered when the start method has been successfully initiated
	camera.on("start", function(){
		//do stuff
	});


	camera.on("read", function(err, timestamp, filename){ 
	//	console.log(">>>>>>>>>>>>>>>>>>>>");

		console.log(new Date());
	});


	//listen for the "stop" event triggered when the stop method was called
	camera.on("stop", function(){
		//do stuff
	});

	//listen for the process to exit when the timeout has been reached
	camera.on("exit", function(){
		//do stuff
	});

	console.log("Scanner started");
	console.log("Current ip: " + rpiIp);

	var attempt = 0;

	gpio.on('change', function(channel, value) {
		
		if(channel == 7 && value == 1){

			console.log("execute command");
	
			camera.start();

			var array = [];
			
			setTimeout(function(){				 
								  
				var stream = ss.createStream();
				ss(socket).emit('file', stream, {
					ip:rpiIp,
					index: "0"
				});

				var filename = '/home/pi/test0.jpg';
				fs.createReadStream(filename).pipe(stream);
				  
				console.log("send file");
				
			}, 4000);

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
