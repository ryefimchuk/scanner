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
    function ControlPanelController(moment, optionsConfig, exSocket, connector) {
      var vm = this;
      vm.options = optionsConfig.getOptions();

      vm.light = {
        lightStart:0,
        lightFinish:500,
        projectorStart:500,
        projectorFinish:500
      };

      var _photo = null;
      var _light = null;

      try
      {
        _photo = JSON.parse(window.localStorage.photo);
        _light = JSON.parse(window.localStorage.light);

        vm.light = _light;

        for(var i = 0; i < vm.options.length; i++){
          var cmd = vm.options[i].command;
          vm.options[i].value = _photo[cmd];
        }
      }
      catch(e){}

      vm.updateFileUrl = '';
      vm.updateFileDest = '/home/pi/server.js';

      vm.shellFeedback = connector.getScanners().shellFeedback;

      vm.change = function(){
        vm.resultCommand = {};

        for(var i = 0; i < vm.options.length; i++){
          var opt = vm.options[i];

          if(!opt.value || opt.value == ""){
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

        window.localStorage.light = JSON.stringify(vm.light);
        window.localStorage.photo = JSON.stringify(vm.resultCommand);
      }

      vm.setupConfig = function(){
        exSocket.emit("setup command", {
          command: JSON.stringify(vm.resultCommand),
          light: JSON.stringify(vm.light)
        });
      }

      vm.updateFile = function() {
         exSocket.emit("update-file", {
           url: vm.updateFileUrl,
           dest: vm.updateFileDest
         });
      }

      vm.execShell = function(){
        console.log("shell: " + vm.shellCommand);
        exSocket.emit("shell", vm.shellCommand);
      }

      vm.softExecute = function(){
          exSocket.emit("soft trigger");
      }

      vm.execute = function(){
          exSocket.emit("start command");
      }

      vm.change();
    }
  }

})();
