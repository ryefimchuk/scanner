var shell = require('shelljs');
var gpio = require('rpi-gpio');
var ip = require('ip');
var s = require('socket.io-client');
var fs = require('fs');
var ss = require('socket.io-stream');



gpio.setup(7, gpio.DIR_OUT, write);
//gpio.write(7, false);

function write() {		
	gpio.write(7, false);		
}


setTimeout(function(){

	var rpiIp = ip.address() // my ip address

	var socket = s('http://192.168.1.99');


	socket.on('connect', function(c){
		console.log("connected to server");

		socket.emit("add trigger", {
			ip: rpiIp, 
			files:[]
		});
	});

/*	socket.on('shell', function(data){
		shell.exec(data);

		socket.emit("shell", {
			ip: rpiIp, 
			result:[]
		});
	});*/


	socket.on('start command', function(data){
		console.log("start command");
		
		
		gpio.write(7, true);	
		
		setTimeout(function(){
			gpio.write(7, false);	
		}, 10)


	});


	 


}, 10000);
