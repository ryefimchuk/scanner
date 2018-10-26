(function() {
  'use strict';

  angular
    .module('sc2')
    .controller('ClientController', ClientController);

  /** @ngInject */
  function ClientController($window, $scope, $rootScope, $timeout, $document, optionsConfig, toastr, connector, exSocket) {
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

    exSocket.on("read-gallery", function(data){
      vm.editedGalleryId = vm.galleryId
      vm.galleryId = null


      vm.comments = data.comments
      vm.size = data.size
    })

    $scope.$watch("vm.data.session", function(newValue, oldValue){
      if(newValue !== oldValue && !newValue){
        $timeout(function(){
          selectLastGallery()
        },10)
      }
    });

    vm.galleryLable = function(gallery){
      if(gallery){
        return (new Date(gallery))
      }
    }

    vm.isSelected = function(gallery){
      return gallery == vm.galleryId ? "white" : "gray"
    }

    vm.selColor = "red"
    vm.unselColor = "gray"

    function selectLastGallery() {
      var pos = vm.data.galleries.length - 1;
      if(pos != -1) {
        vm.selectGallery(vm.data.galleries[pos])
      }
    }

    function editSession(sessionId){
      exSocket.emit('open-session', vm.galleryId)
    }


    vm.updateSession = function(){
      if(!vm.size){
        alert("Size is required field")
        return
      }

      exSocket.emit('update-session', {
        firstName: vm.firstName,
        lastName: vm.lastName,
        comments: vm.comments,
        size: vm.size,
        city: vm.city,
        id: vm.editedGalleryId
      });
      vm.galleryId = vm.editedGalleryId
    }

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

      //console.log('keyup', keyEvent);

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

    vm.editSession = function(){
      editSession(vm.galleryId)
    }

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
      vm.editedGalleryId = null
    }


    vm.execute = function(){
      exSocket.emit('start command', {});
    }

    vm.executeSoft = function(){
      vm.data.isBusy = true;
      vm.stage = 1
      vm.counter = 3
      exSocket.emit('soft trigger', {});

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


    }

    vm.closeSession = function(){
      vm.selectGallery()
      exSocket.emit('set-session', null);
    }

    vm.closeClient = function(){
      if(confirm("Do you want to close current client?")) {
        vm.selectGallery()
        exSocket.emit('set-client', {
          clientId: null
        });
      }
    }

    if ($window.parent && $window.parent !== $window) {

      var isLoadEventTriggered = false;
      var getParameterByName = function (name, url) {

        if (!url) {

          url = $window.location.href;
        }

        name = name.replace(/[\[\]]/g, "\\$&");

        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        var results = regex.exec(url);

        if (!results) {

          return null;
        }

        if (!results[2]) {

          return '';
        }

        return decodeURIComponent(results[2].replace(/\+/g, " "));
      };

      var origin = getParameterByName('origin');
      var city = getParameterByName('city');
      var comments = getParameterByName('comments');
      var size = getParameterByName('size');

      if (vm.cities.indexOf(city) !== -1) {

        vm.city = city;
        vm.comments = comments;
        vm.size = size;

        vm.createNewClient();
      } else {

        vm.city = localStorage.city;
      }

      vm.isEmbedded = true;

      $scope.$watch("vm.data.clientId", function (newValue, oldValue) {

        if (newValue && !oldValue && !isLoadEventTriggered) {

          vm.saveSessionSettings();

          $window.parent.postMessage({
            command: 'load'
          }, origin);

          isLoadEventTriggered = true;
        }
      });

      $window.addEventListener('message', function (event) {

        switch (event.data.command) {
          case 'close': {

            if (vm.galleryId) {

              $window.parent.postMessage({
                command: 'result',
                result: {
                  gallery_id: vm.galleryId
                }
              }, origin);
            } else {

              $window.parent.postMessage({
                command: 'close'
              }, origin);
            }

            break;
          }
        }
      });
    } else {

      vm.city = localStorage.city;
      vm.isEmbedded = false;
    }
  }
})();
