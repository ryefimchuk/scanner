var _ = require('lodash');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 80;
var fs = require('fs');
var ss = require('socket.io-stream');



app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});



var scanners = [];
var controllers = [];
var mainTrigger = null;





io.on('connection', function(socket){

  // add clients


    socket.on('disconnect', function(){

        //console.log("disconnect");
		
        var pos = scanners.indexOf(socket);
        if(pos != -1){
            scanners.splice(pos, 1);
        //    console.log("disconnected scanner. IP: " + socket.scanner.ip);
        }
        var pos = controllers.indexOf(socket);
        if(pos != -1){
            controllers.splice(pos, 1);
         //   console.log("disconnected controller");
        }

        if(mainTrigger === socket){
            mainTrigger = null;
           // console.log("disconnected trigger");
        }

        updateControllers();


        //io.emit('chat message', msg);
    });

  socket.on('add scanner', function(scanner){
	socket.scanner = scanner;
	scanners.push(socket);
      updateControllers();

      //console.log("added scanner. IP: " + scanner.ip);
    //io.emit('chat message', msg);
  });

  socket.on('add controller', function(controller){
	socket.controller = controller;
	controllers.push(socket);
      updateControllers();

      //console.log("added controller");
    //io.emit('chat message', msg);
  });

  socket.on('add trigger', function(trigger){
	socket.trigger = trigger;
	mainTrigger = socket;
      updateControllers();

      //console.log("added trigger");
    //io.emit('chat message', msg);
  });
  
  
  
  

      ss(socket).on('file', function(stream,data) {
        console.log('received' + data.ip);
		
		stream.pipe(fs.createWriteStream(__dirname + "/photos/" + data.ip + "_" + data.index + ".jpg" ));
      });
  
  
  /*socket.on('send-file', function(name, data){
	console.log(">>>>> " + name);
		
	fs.open( __dirname + "/photos/" + name, 'w', 0755, function(err, fd) {
		if (err) throw err;

		fs.write(fd, data, null, 'Binary', function(err, written, buff) {
			fs.close(fd, function() {
				console.log('File saved successful!');
			});
		})
	});

  });*/
  

  // 


  socket.on('setup command', function(cmd){
	for(var i = 0; i < scanners.length; i++){
        scanners[i].emit('setup command', cmd);
    }
      //updateControllers();
  });

    socket.on('start command', function(cmd){
        if(mainTrigger){
            mainTrigger.emit('start command', cmd);
        }
        //updateControllers();
    });

    socket.on('update data', function(cmd){
        updateControllers();
    });

});


function updateControllers(){

    var data = {
        scanners: _.map(scanners, function(scanner){
            return{
                id: scanner.id,
                data: scanner.scanner
            }
        }),
        trigger: mainTrigger? {
                id: mainTrigger.id,
                data: mainTrigger.trigger
            }: null
    };

    for(var i = 0; i < controllers.length; i++){
        controllers[i].emit('update data', data);
    }
}

http.listen(port, function(){
  //console.log('listening on *:' + port);
});




