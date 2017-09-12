(function() {
  'use strict';

  angular
    .module('sc2')
    .controller('ClientController', ClientController);

  /** @ngInject */
  function ClientController($rootScope, $timeout, toastr, connector, exSocket) {
    var vm = this;


    vm.data = connector.getScanners();


    vm.saveSessionSettings = function(){

      exSocket.emit('set-session', {
        firstName: vm.firstName,
        lastName: vm.lastName,
        id: (new Date()).getTime()
      });

    }

    vm.closeSession = function(){
      exSocket.emit('set-session', null);
    }

  }
})();
