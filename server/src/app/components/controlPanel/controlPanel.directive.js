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
      vm.data = optionsConfig.getOptions();

      vm.updateFileUrl = '';
      vm.updateFileDest = '/home/pi/server.js';

      vm.shellFeedback = connector.getScanners().shellFeedback;

      vm.newPreset = '';

      vm.changePreset = function(){

        var preset = vm.data.presets.find(function(item){
          return item.name === vm.data.selectedPreset;
        });

        if(preset){
          vm.data.photoSettings = preset.photoSettings;
          vm.data.lightSettings = preset.lightSettings;

          for(var i = 0; i < vm.data.options.length; i++){
            var cmd = vm.data.options[i].command;
            vm.data.options[i].value = vm.data.photoSettings[cmd];
          }
        }
      }

      vm.saveNewPreset = function(){

        //debugger;
        vm.data.presets.push({
          name: vm.newPreset,
          lightSettings: vm.data.lightSettings,
          photoSettings: vm.data.photoSettings,
        });

        vm.data.selectedPreset = vm.newPreset;

        exSocket.emit("save preset", {
          lightSettings: vm.data.lightSettings,
          photoSettings: vm.data.photoSettings,
          presets: vm.data.presets,
          selectedPreset: vm.data.selectedPreset
        });

        vm.newPreset = '';
      }

      vm.change = function(){

        vm.data.selectedPreset = '';

        var resultCommand = {};

        for(var i = 0; i < vm.data.options.length; i++){
          var opt = vm.data.options[i];

          if(!opt.value || opt.value == ""){
            continue;
          }
          switch(opt.type){
            case "int":
            case "string":
            case "list":
              {
                resultCommand[opt.command] = opt.value;
                break;
              };
          }
        }

        resultCommand['thumb'] = 'none'
        resultCommand['nopreview'] = true;

        vm.data.photoSettings = resultCommand;
      }

      vm.setupConfig = function(){
        exSocket.emit("setup settings", {
          selectedPreset: vm.data.selectedPreset,
          photo: vm.data.photoSettings,
          light: vm.data.lightSettings
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
