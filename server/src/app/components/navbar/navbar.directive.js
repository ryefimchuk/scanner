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

        //debugger;

        ///alert("openSetupMode ")
        $rootScope.setupMode = true;
      }

      vm.openStandbyMode = function() {
        $rootScope.setupMode = false;
      }

      vm.rebootDevices = function(){
        exSocket.emit('shell', {
          shellCommand: "sudo reboot",
          target: null,
          syncExecution: true
        });
      }

      vm.syncDevices = function(){
        exSocket.emit('shell', {
          shellCommand: "sudo /etc/init.d/ntp stop && sudo ntpd -q -g && sudo /etc/init.d/ntp start",
          target: null,
          includeProjector: true
        });
      }

      vm.updateDevices = function(){
        exSocket.emit('shell', {
          shellCommand: "sudo curl https://amakaroff82.github.io/scanner/scanerPI/server.py --output /home/pi/server.py && sudo reboot",
          target: null
        });
      }

      // "vm.creationDate" is available by directive option "bindToController: true"
      //vm.relativeDate = moment(vm.creationDate).fromNow();
    }
  }

})();
