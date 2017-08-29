(function() {
  'use strict';

  angular
    .module('sc2')
    .directive('controlPanel', ControlPanel);

  /** @ngInject */
  function ControlPanel($log, $rootScope, exSocket, connector) {
    var directive = {
      restrict: 'EA',
      templateUrl: 'app/components/controlPanel/controlPanel.html',
      scope: {
        /*item: '='*/
      },
      controller: ControlPanelController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;

    /** @ngInject */
    function ControlPanelController(moment, optionsConfig) {
      var vm = this;
      vm.options = optionsConfig.getOptions();

      vm.setupConfig = function(){

      }

      vm.change = function(){
        vm.resultCommand = "";

        for(var i = 0; i < vm.options.length; i++){
          var opt = vm.options[i];
          if(!opt.value){
            continue;
          }
          switch(opt.type){
            case "int":
            case "string":
            case "list":
              {
                vm.resultCommand += (" " + opt.command + " " + opt.value);
                break;
              };
          }
        }
      }

      vm.change();
    }
  }

})();
