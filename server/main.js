$(function () {

    var isSetupMode = false;

    var allScanners = [];



    //// SOCKET IO

    var socket = io();
    socket.on('connect', function (c) {
        console.log("connected to server");

        socket.emit("add controller", {});

        setTimeout(function () {
            socket.emit("update data", {});
        }, 3000)
    });
    socket.on('update data', function (data) {
        console.log("scanner data:", data);
    });
    socket.on('disconnect', function (e) {
        console.log("disconnected from server");
    });


    //// CONTROLS

    var divSetup = $('#modeSetup')[0];
    var divStandBy = $('#modeSetup')[0];

    function openSetupMode() {
        divSetup.style.display = "block";
    }

    function closeSetupMode() {
        divSetup.style.display = "none";
    }

    //closeSetupMode(); //close setup mode by default


    $('#goSetupMode').click(function () {
        isSetupMode = true;
        openSetupMode();
        return false;
    });

    $('#goStandByMode').click(function () {
        isSetupMode = false;
        closeSetupMode();
        return false;
    });



    $('#execute').click(function () {
        socket.emit('start command', "");
        return false;
    });

    $('#setup').click(function () {
        socket.emit('setup command', $('#m').val());
        $('#m').val('');
        return false;
    });

    $('#shell').click(function () {
        socket.emit('shell', $('#m').val());
        return false;
    });


    /*$('form').submit(function(){
     socket.emit('setup command', $('#m').val());
     $('#m').val('');
     return false;
     });*/

    /*socket.on('chat message', function(msg){
     $('#messages').append($('<li>').text(msg));
     window.scrollTo(0, document.body.scrollHeight);
     });*/

    socket.on('update data', function (data) {

        allScanners = data.scanners;

        var _configured = [];
        var _notConfigured = [];


        for (var i = 0; i < allScanners.length; i++) {

            var sc = allScanners[i];

            if(sc.data.numb){
                _configured.push(sc);

            } else{
                _notConfigured.push(sc);

            }
        }



        var groupedByNumb = _.groupBy (_configured, function(scanner){
            return scanner.data.numb;
        });


        //debugger;

        $('#setupCameras').html("");

        if(_notConfigured.length > 0){
            for (var i = 0; i < _notConfigured.length; i++) {
                var sc = _notConfigured[i];

                $('#setupCameras').append($('<li class="scanner">').text("Scanner :" + sc.data.ip));
            }
        }


        /*            $('#cameras').html("");

         for (var i = 0; i < data.scanners.length; i++) {
         var sc = data.scanners[i];
         $('#cameras').append($('<li class="scanner">').text("Scanner :" + sc.data.ip));
         }*/

        window.scrollTo(0, document.body.scrollHeight);
    });

});
