(function() {
  'use strict';

  angular
    .module('sc2')
    .controller('MainController', MainController);

  /** @ngInject */
  function MainController($rootScope, $timeout, toastr, connector, exSocket) {
    var vm = this;

    vm.awesomeThings = [];
    vm.classAnimation = '';
    vm.creationDate = 1503675991457;
    vm.showToastr = showToastr;
    vm.defaultImage = 'assets/images/temp.png';

    vm.scannersData = connector.getScanners();

    vm.closePreview = function(){
      $rootScope.preview = null;
    }

    vm.reloadPreview = function(item){
      connector.loadPreview(item);
    }

    vm.submitChangeNumber = function(evt, item){

      evt.preventDefault();

      var ip = item.ip;//divCameraPreview.find("[ip]").text();
      var numb = item.numb; //divCameraPreview.find("input").val();

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
        exSocket.emit('set number', {
          numb: numb,
          ip: ip
        });

        var scanner = connector.getScannerBy(ip);
        scanner.data.numb = numb;

        connector.updateData();
        vm.closePreview();
      }
    }

    function showToastr(msg) {
      toastr.info(msg);
      vm.classAnimation = '';
    }
  }
})();
