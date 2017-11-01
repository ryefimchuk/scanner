var shell = require('shelljs');
var gpio = require('rpi-gpio');
var ip = require('ip');
var s = require('socket.io-client');
var fs = require('fs');
var ss = require('socket.io-stream');

var PHOTO_OUT = 7;
var LIGHT_OUT = 11;
var PROJ_OUT = 12;



gpio.setup(PHOTO_OUT, gpio.DIR_OUT, write);
gpio.setup(LIGHT_OUT, gpio.DIR_OUT);
gpio.setup(PROJ_OUT, gpio.DIR_OUT);

function write() {
  gpio.write(PHOTO_OUT, false);
  gpio.write(LIGHT_OUT, false);
  gpio.write(PROJ_OUT, false);
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

	socket.on('start command', function(data){
		console.log("start command");

    var tm = JSON.parse(data);

		//// PHOTO
		gpio.write(PHOTO_OUT, true);
		
		setTimeout(function(){
			gpio.write(PHOTO_OUT, false);
		}, 200);

    //// LIGHT
    setTimeout(function(){
		console.log("start light");
      gpio.write(LIGHT_OUT, true);

      setTimeout(function(){
		console.log("finish light");
        gpio.write(LIGHT_OUT, false);
      }, tm.lightFinish);
    }, tm.lightStart);

    //// PROJ
    setTimeout(function(){
		console.log("start proj");
      gpio.write(PROJ_OUT, true);

      setTimeout(function(){
		console.log("finish proj");
        gpio.write(PROJ_OUT, false);
      }, tm.projectorFinish);
    }, tm.projectorStart);

  });

}, 10000);
