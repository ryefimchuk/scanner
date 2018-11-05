(function() {
  'use strict';

  angular
    .module('sc2')
    .directive('gallery', Gallery);

  /** @ngInject */
  function Gallery() {
    var directive = {
      restrict: 'EA',
      templateUrl: 'app/components/gallery/gallery.html',
      scope: {
        galleryId: '='
      },
      controller: GalleryController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;

    /** @ngInject */
    function GalleryController(moment, $scope, $document, connector) {

      var position = {
        x: 3,
        y: 3
      }
      var vm = this;

      vm.scannerService  = connector.getScanners()

      vm.defaultImage = 'assets/images/temp.png'
      vm.galleryRows = []

      if(localStorage.galleryMap) {
        vm.galleryMap = angular.fromJson(atob(localStorage.galleryMap));
      }
      else{
        vm.galleryMap = connector.initMap();
      }

      var _y = 9
      var _x = 9

      var stepX = 1
      var stepY = 1

      var initMatrix = function(posX, posY){
        var sessionId = vm.galleryId

        var matrix3x3 = []
        if(sessionId) {

          if (posX > _x - (stepX * 3))
            posX = _x - (stepX * 3)

          if (posY > _y - (stepY * 3))
            posY = _y - (stepY * 3)

          for (var i = 0; i < 3; i++) { // rows
            var row = []
            for (var j = 0; j < 3; j++) { // columns

              var numb = vm.galleryMap[posY + i][posX + j].numb
              //var numb = ((stepX * j) + posX) * _x + (stepY * i) + posY + 1
              row.push({
                "url": (location.protocol + '//' + location.hostname + ':81') + "/images/" + sessionId + "/normal/" + numb + ".jpg"
              })
            }
            matrix3x3.push(row)
          }
        }

        //console.log(matrix3x3)
        vm.galleryRows = matrix3x3
      }

      $scope.$watch('vm.galleryId', function(){
        initMatrix(position.x, position.y)
      })

      initMatrix(0, 0)

      vm.moveLeft = function() {
        position.x-=3;
        if(position.x < 0)
          position.x = 0;

        initMatrix(position.x, position.y)
      }

      vm.moveRight = function() {
        position.x+=3;
        if(position.x > _x - (stepX * 3))
          position.x = _x - (stepX * 3);

        initMatrix(position.x, position.y)
      }

      vm.moveUp = function() {
        position.y-=3;
        if(position.y < 0)
          position.y = 0;

        initMatrix(position.x, position.y)
      }

      vm.moveDown = function() {
        position.y+=3;
        if(position.y > _y - (stepY * 3))
          position.y = _y - (stepY * 3);

        initMatrix(position.x, position.y)
      }


      function keyupHandler(keyEvent) {
        if(keyEvent.target.tagName == "INPUT"){
          return;
        }


        switch(keyEvent.keyCode){
          case 38:
            vm.moveUp()
            break;
          case 40:
            vm.moveDown()
            break;
          case 39:
            vm.moveRight()
            break;
          case 37:
            vm.moveLeft()
            break;
          default:
        }


        $scope.$apply(); // remove this line if not need
      }

      $document.on('keyup', keyupHandler);

    }
  }

})();
