(function() {
  'use strict';

  angular
    .module('sc2')
    .directive('scannerItem', ScannerItem);

  /** @ngInject */
  function ScannerItem($log, $rootScope) {
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
    function ScannerItemController() {
      var vm = this;
      vm.defaultImage = 'assets/images/temp.png'

/*
      exSocket.on('file-preview', function (data) {
        if($rootScope.preview && $rootScope.preview.ip == data.ip) {
          $rootScope.preview.preview = data.preview;
        }
      });
*/

      vm.openPreview = function(item) {
        if (!item) {
          delete $rootScope.preview;
          return;
        }
        $rootScope.preview = item;
      };
    }
  }

})();
