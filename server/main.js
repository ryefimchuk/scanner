$(function () {

    var scanner_col = 20;
    var scanner_row = 7;

    var socket = io();

    var isSetupMode = false;

    var allScanners = [];


    var divSetup = $('#modeSetup');
    var divStandBy = $('#modeStandBy');
    var divCameraPreview = $('#modeCameraPreview');
    var standByCameras = $('#standByCameras');

    var goSetupModeBut = $('#goSetupMode');
    var goStandByModeBut = $('#goStandByMode');
    var rebootDevicesBut = $('#rebootDevices');
    var closePreviewBut = $('#closePreview');
    var reloadPreviewBut = $('#reloadPreview');




    //// SOCKET IO
    socket.on('connect', function (c) {
        console.log("connected to server");

        socket.emit("add controller", {});

        setTimeout(function () {
            socket.emit("get-data", {});
        }, 3000)
    });
    socket.on('disconnect', function (e) {
        console.log("disconnected from server");
    });

    socket.on('load data', function (data) {
        allScanners = data.scanners;
        updateData();
    });


    //// CONTROLS
    function openSetupMode() {
        divSetup.show();
        divStandBy.hide();
        goSetupModeBut.attr("disabled", "disabled");
        goStandByModeBut.removeAttr("disabled");
    }

    function closeSetupMode() {
        divSetup.hide();
        divStandBy.show();
        goSetupModeBut.removeAttr("disabled");
        goStandByModeBut.attr("disabled", "disabled");
    }

    closeSetupMode(); //close setup mode by default


    goSetupModeBut.click(function () {
        isSetupMode = true;
        openSetupMode();
        return false;
    });

    goStandByModeBut.click(function () {
        isSetupMode = false;
        closeSetupMode();
        return false;
    });

    rebootDevicesBut.click(function () {
        socket.emit('shell', "sudo reboot");
        return false;
    });


    function closePreview(){
        divCameraPreview.css({
            "background-image": ""
        });
        divCameraPreview.hide();
    }

    closePreviewBut.click(function () {
        closePreview();
        return false;
    });

    reloadPreviewBut.click(function (evt) {


        var ip = $(evt.target).parent().find("[ip]").text();

        if(ip) {
            var data = {
                ip: ip,
                w: 160,
                h: 90
            };

            divCameraPreview.find("img").show();

            socket.emit('preview ip', data);
        }

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

    $('#numberEditorForm').submit(function(evt){
        evt.preventDefault();

        var ip = divCameraPreview.find("[ip]").text();
        var numb = divCameraPreview.find("input").val();

        if(numb != "") {
            var _numb = parseInt(numb);
            if (!isNaN(_numb)){

                if(_numb > 0 && _numb <= 140) {
                    setNumb(_numb);
                }
                else{
                    alert("Range 1 - 140");
                }
            }else{
                alert("Please enter number");
            }
        }else{
            setNumb(""); // clear number
        }

        function setNumb(numb){
            socket.emit('set number', {
                numb: numb,
                ip: ip
            });

            var scanner = getScannerBy(ip);
            scanner.data.numb = numb;

            updateData();
            closePreview();
        }

    });


    function getScannerBy(ip){
        return _.find(allScanners, function(scan){
            return scan.data.ip == ip;
        })
    }

    function getScannerByNumber(numb){
        //debugger;
        return _.find(allScanners, function(scan){
            return scan.data.numb == numb;
        })
    }

    socket.on('update-scanner', function (data) {
        
		
        var scanner = getScannerBy(data.ip);
        if(scanner){
            scanner.data.numb = data.numb;
            scanner.data.thumb = data.thumb;
            scanner.data.files = data.numb.files;
			
			updateData();
        }
    });

    socket.on('file-preview', function (data) {
        divCameraPreview.find("[ip]").text(data.ip);
        //divCameraPreview.find(".panel").show();
        divCameraPreview.find("img").hide();
        divCameraPreview.find("input").val(data.numb);
        divCameraPreview.find("input").focus();

        divCameraPreview.css({
            "background-image": "url(" + data.preview + "?" + Math.round(Math.random() * 10000000) + ")"
        });
    });

/*    socket.on('file-thumb', function (data) {
    });*/


    function updateData(){
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

        // update counters
        $("#totalCameras").text(allScanners.length);
        $("#notConfigured").text(_notConfigured.length);


        // grouping configured cameras by numb
        var groupedByNumb = _.groupBy (_configured, function(scanner){
            return scanner.data.numb;
        });



        ///// setup
        $('#setupCameras').html("");
		
		var url = 'css/temp.png';

        var scannerTemplate =  '<div class="scanner" style="background-image: url([URL])">' +
            '<div ip=""></div>&nbsp;<div numb=""></div>' +
            '</div>';

        if(_notConfigured.length > 0){
            for (var i = 0; i < _notConfigured.length; i++) {
                var sc = _notConfigured[i];

                var node = $(scannerTemplate.replace("[URL]", sc.data.thumb || url)).appendTo($('#setupCameras'));
                node.find("[ip]").text(sc.data.ip);
            }
        }

        ///// stand by
        var table = $('#standByCameras').find('table');
        table.html("");

        var counter = 0;
        for (var i = 0; i < scanner_row; i++) {
            var row = $("<tr class='scanners-row'>").appendTo(table);

            for(var j = 0; j < scanner_col; j++){
                counter  = (scanner_row - i) + (scanner_row * j);

                var scanner = getScannerByNumber(counter);
                if(scanner){
				
					var node = $('<td >' +  scannerTemplate.replace("[URL]", scanner.data.thumb || url) + '</td>').appendTo(row);

					node.attr("number", counter);

                    node.find("[ip]").text(scanner.data.ip);

                    //debugger;
                    if(scanner.data.numb) {
                        node.find("[numb]").text("(" + scanner.data.numb + ")");
                    }
                }
				else{
					var node = $('<td >' +  scannerTemplate.replace("[URL]", url) + '</td>').appendTo(row);

					node.attr("number", counter);
				}

            }
        }

        ///// preview

        $("div.scanner").click(function(evt){
            var ip = $(evt.target).find("[ip]").text();

            if(ip) {
                var data = {
                    ip: ip,
                    w: 160,
                    h: 90
                };
                socket.emit('preview ip', data);
                //divCameraPreview.find(".panel").hide();
                divCameraPreview.find("img").attr("src", "/css/loading.gif");
                divCameraPreview.find("img").show();
                divCameraPreview.show();
            }
        });




        window.scrollTo(0, document.body.scrollHeight);
    }



});
