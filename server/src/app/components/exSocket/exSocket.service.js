(function() {
  'use strict';

  angular
    .module('sc2')
    .factory('exSocket', exSocket);

  /** @ngInject */
  function exSocket($rootScope) {

    var rootApi = "localhost";
    //var rootApi = "192.168.1.99:8080";
    var socket = io.connect(rootApi);

    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  }

})();

