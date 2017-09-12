(function() {
  'use strict';

  angular
    .module('sc2')
    .service('connector', connector);

  /** @ngInject */
  function connector($rootScope, exSocket, $timeout, $log) {
    var scanner_row = 7;
    var scanner_col = 20;

    var serviceData = {
      shellFeedback:{
        data:"",
        code:""
      },
      allScanners:[],
      configured:[],
      notConfigured:[],
      grid:[],
      preview: null,
      session: null
    };

    function getScannerBy(ip){
      var revScanners = serviceData.allScanners.reverse();
      return revScanners.find( function(scan){
        return scan.data.ip == ip;
      })
    }

    function getScannerByNumber(numb){
      var revScanners = serviceData.allScanners.reverse();
      return revScanners.find( function(scan){
        return scan.data.numb == numb;
      })
    }


    exSocket.on('update-scanner', function (data) {

      var scanner = getScannerBy(data.ip);
      if(scanner){
        scanner.data.numb = data.numb;
        scanner.data.thumb = data.thumb;
        scanner.data.files = data.files;

        $log.log("update scanner", scanner);

        updateData();
      }
    });

    //// SOCKET IO
    exSocket.on('connect', function () {
      $log.log("connected to server");

      exSocket.emit("add controller", {});

      $timeout(function () {
        exSocket.emit("get-data", {});
      }, 3000)
    });
    exSocket.on('disconnect', function () {
      $log.log("disconnected from server");
    });

    exSocket.on('load data', function (data) {
      serviceData.allScanners = data.scanners;


      $log.log("received full scanners data");
      //alert("new data")
      updateData();
    });


    exSocket.on('update-session', function (session) {
      serviceData.session = session;
    });


    exSocket.on('shell-feedback', function (data) {
      if(data.result.data) {
        serviceData.shellFeedback.data = data.result.data.replace(/\n/g, "<RTR>").split("<RTR>").map(function(item){
          return {
            item: item
          };
        });
      }
      else{
        serviceData.shellFeedback.data = [];
      }
    });

    function loadScannerData(item){
      if(item.ip) {
        var data = {
          ip: ip,
          w: 160,
          h: 90
        };
        exSocket.emit('preview ip', data);
      }
    }


    function updateData(){

      $log.log(serviceData.allScanners);

      var _configured = serviceData.configured;
      var _notConfigured = serviceData.notConfigured;
      var allScanners = serviceData.allScanners;
      var grid = serviceData.grid;

      //_configured.slice(0);
      _configured.length = 0;
      _notConfigured.length = 0;
      grid.length = 0;

      for (var i = 0; i < allScanners.length; i++) {

        var sc = allScanners[i];

        if(sc.data.numb){
          _configured.push(sc);

        } else{
          _notConfigured.push(sc);
        }
      }

      var url = 'css/temp.png';

      var counter = 0;
      for (var i = 0; i < scanner_row; i++) {

        var row = {
          cameras:[]
        };

        grid.push(row);

        for(var j = 0; j < scanner_col; j++){
          counter  = i + 1 + (scanner_row * j);

          var scanner = getScannerByNumber(counter);
          if(scanner){
            scanner.number = counter;
           row.cameras.push(scanner);
          }
          else{
            row.cameras.push({
              number: counter
            });
          }
        }
      }
//      window.scrollTo(0, document.body.scrollHeight);
    }


    function loadPreview(item){
      if(!item){
        return;
      }

      var data = {
        ip: item.ip,
        w: 160,
        h: 90
      }

      exSocket.emit('preview ip', data);
      $rootScope.preview = item;

    }

    function getScanners() {
      return serviceData;
    }

    this.updateData = updateData;
    this.loadPreview = loadPreview;
    this.getScannerBy = getScannerBy;
    this.getScannerByNumber = getScannerByNumber;
    this.getScanners = getScanners;
  }

})();
