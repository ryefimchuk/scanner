(function() {
  'use strict';

  angular
    .module('sc2')
    .directive('navbar', acmeNavbar);

  /** @ngInject */
  function acmeNavbar() {
    var directive = {
      restrict: 'EA',
      templateUrl: 'app/components/navbar/navbar.html',
      scope: {
        creationDate: '='
      },
      controller: NavbarController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;

    /** @ngInject */
    function NavbarController($rootScope, moment, exSocket, connector) {
      var vm = this;

      vm.scannersData = connector.getScanners();

      //// CONTROLS
      vm.openSetupMode = function() {

        debugger;

        ///alert("openSetupMode ")
        $rootScope.setupMode = true;
      }

      vm.openStandbyMode = function() {
        $rootScope.setupMode = false;
      }

      vm.rebootDevices = function(){
        //exSocket.emit('shell', "sudo reboot");
      }

      // "vm.creationDate" is available by directive option "bindToController: true"
      //vm.relativeDate = moment(vm.creationDate).fromNow();
    }
  }

})();
