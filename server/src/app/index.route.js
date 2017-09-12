(function() {
  'use strict';

  angular
    .module('sc2')
    .config(routerConfig);

  /** @ngInject */
  function routerConfig($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: 'app/client/client.html',
        controller: 'ClientController',
        controllerAs: 'vm'
      })
      .state('admin', {
        url: '/admin',
        templateUrl: 'app/main/main.html',
        controller: 'MainController',
        controllerAs: 'main'
      });

    $urlRouterProvider.otherwise('/');
  }

})();
