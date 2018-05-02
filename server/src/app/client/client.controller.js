(function() {
  'use strict';

  angular
    .module('sc2')
    .controller('ClientController', ClientController);

  /** @ngInject */
  function ClientController($rootScope, $timeout, optionsConfig, toastr, connector, exSocket) {
    var vm = this;

    vm.cities = optionsConfig.getCities();

    vm.data = connector.getScanners();

    vm.saveSessionSettings = function(){

      exSocket.emit('set-session', {
        firstName: vm.firstName,
        lastName: vm.lastName,
        comments: vm.comments,
        size: vm.size,
        city: vm.city,
        id: (new Date()).getTime()
      });

    }

    vm.closeSession = function(){
      exSocket.emit('set-session', null);
    }

  }
})();
