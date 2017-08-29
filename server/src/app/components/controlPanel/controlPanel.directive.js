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
    function ControlPanelController(moment, optionsConfig, exSocket) {
      var vm = this;
      vm.options = optionsConfig.getOptions();

      vm.setupConfig = function(){

      }

      vm.change = function(){
        vm.resultCommand = {};

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
                vm.resultCommand[opt.command] = opt.value;
                break;
              };
          }
        }
		
		vm.resultCommand['thumb'] = 'none'
		vm.resultCommand['nopreview'] = true;
      }
	  	  
	  vm.setupConfig = function(){		  
        exSocket.emit("setup command", JSON.stringify(vm.resultCommand));
	  }

	  vm.execShell = function(){
		  
		console.log("shell: " + vm.shellCommand);
		exSocket.emit("shell", vm.shellCommand);
	  }	  
	  
	  vm.softExecute = function(){
		  
        exSocket.emit("soft trigger", "");
	  }
	  
	  vm.execute = function(){
		  
        //exSocket.emit("soft trigger", "");
        exSocket.emit("start command", "");
	  }

      vm.change();
    }
  }

})();
