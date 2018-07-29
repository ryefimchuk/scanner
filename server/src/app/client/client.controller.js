(function() {
  'use strict';

  angular
    .module('sc2')
    .controller('ClientController', ClientController);

  /** @ngInject */
  function ClientController($scope, $rootScope, $timeout, $document, optionsConfig, toastr, connector, exSocket) {
    var vm = this;

    exSocket.emit('get-galleries')

    vm.cities = optionsConfig.getCities();

    vm.city = localStorage.city;

    vm.data = connector.getScanners();

    vm.createNewClient = function(){

      localStorage.city = vm.city;

      exSocket.emit('set-client', {
        clientId: (new Date()).getTime()
      });
    }

    vm.galleryLable = function(gallery){
      if(gallery){
        return (new Date(gallery))
      }
    }

    vm.isSelected = function(gallery){
      return gallery == vm.galleryId ? "white" : "lightgray"
    }

    vm.selColor = "red"
    vm.unselColor = "gray"

    function removeSession(sessionId){


      var pos = vm.data.galleries.indexOf(sessionId);
      if(pos != -1){

        if(!confirm("Do you want to remove selected session?")){
          return;
        }

        vm.data.galleries.splice(pos, 1)

        if(pos > 0){
          pos--;
          vm.selectGallery(vm.data.galleries[pos])
        }else{
          vm.selectGallery()
        }

        exSocket.emit('remove-session', {
          sessionId: sessionId
        });
      }
    }

    function keyupHandler(keyEvent) {
      if(keyEvent.target.tagName == "INPUT"){
        return;
      }

      var keyCode = keyEvent.keyCode;

      console.log('keyup', keyEvent);

      if(keyCode >= 49 && keyCode <= 57){

        var key = keyCode - 49;

        if(key >= vm.data.galleries.length){
          return
        }

        var galleryId = vm.data.galleries[key];
        vm.selectGallery(galleryId)

        $scope.$apply(); // remove this line if not need
      }

      if(keyCode == 107){
        vm.selectGallery()
      }

      if(keyCode == 46){
        removeSession(vm.galleryId)
      }
    }

    $document.on('keyup', keyupHandler);

    vm.removeSession = function(){
      removeSession(vm.galleryId)
    }

    vm.saveSessionSettings = function(){

      if(!vm.size){
        alert("Size is required field")
        return
      }

      exSocket.emit('set-session', {
        firstName: vm.firstName,
        lastName: vm.lastName,
        comments: vm.comments,
        size: vm.size,
        city: vm.city,
        id: (new Date()).getTime()
      });
    };

    vm.syncDevices = function(){
      exSocket.emit('shell', {
        shellCommand: "sudo /etc/init.d/ntp stop && sudo ntpd -q -g && sudo /etc/init.d/ntp start",
        target: null,
        includeProjector: true
      });
    };

    vm.selectGallery = function(gallery){
      vm.galleryId = gallery
    }


    vm.execute = function(){
      exSocket.emit('start command', {});
    }

    vm.executeSoft = function(){
      vm.stage = 1

      vm.counter = 3

      $timeout(function(){
        vm.counter = 2
      },1000)

      $timeout(function(){
        vm.counter = 1
      },2000)


      $timeout(function(){
        vm.counter = 0
        vm.stage = 2
      },3000)


      //vm.data.isBusy = true

      exSocket.emit('soft trigger', {});
    }

    vm.closeSession = function(){
      vm.selectGallery()
      exSocket.emit('set-session', null);
    }

    vm.closeClient = function(){
      if(confirm("Do you want to close curent client?")) {
        vm.selectGallery()
        exSocket.emit('set-client', {
          clientId: null
        });
      }
    }

  }
})();
