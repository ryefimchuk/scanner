(function() {
  'use strict';

  angular
    .module('sc2')
    .directive('scannerItem', ScannerItem);

  /** @ngInject */
  function ScannerItem($log, $rootScope, exSocket, connector) {
    var directive = {
      restrict: 'EA',
      templateUrl: 'app/components/scannerItem/scannerItem.html',
      scope: {
        creationDate: '=',
        item: '='
      },
      controller: ScannerItemController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;

    /** @ngInject */
    function ScannerItemController(moment) {
      var vm = this;
      vm.defaultImage = 'assets/images/temp.png'

      exSocket.on('file-preview', function (data) {
        if($rootScope.preview && $rootScope.preview.ip == data.ip) {
          $rootScope.preview.preview = data.preview;
        }
      });

      vm.openPreview = function(item){
        connector.loadPreview(item);
      }
    }
  }

})();
