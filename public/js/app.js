'use strict';
angular.module('stageAlpha', ['ngRoute'])

.config(['$routeProvider', '$locationProvider', function($routeProvider) {
  $routeProvider
    .when('/', { templateUrl: '/views/home.html', controller: 'HomeCtrl', title: 'Dashboard' })
    .when('/equipment', { templateUrl: '/views/equipment-list.html', controller: 'EquipmentListCtrl', title: 'Equipment' })
    .when('/equipment/:id', { templateUrl: '/views/equipment-detail.html', controller: 'EquipmentDetailCtrl', title: 'Equipment Details' })
    .when('/booking', { templateUrl: '/views/booking.html', controller: 'BookingCtrl', title: 'Book Equipment', requireAuth: true })
    .when('/booking/:id', { templateUrl: '/views/booking-status.html', controller: 'BookingStatusCtrl', title: 'Booking Status', requireAuth: true })
    .when('/admin', { templateUrl: '/views/admin.html', controller: 'AdminCtrl', title: 'Admin Dashboard', requireAdmin: true })
    .when('/admin/pricing', { templateUrl: '/views/pricing.html', controller: 'PricingCtrl', title: 'Pricing Engine', requireAdmin: true })
    .when('/admin/backtest', { templateUrl: '/views/backtest.html', controller: 'BacktestCtrl', title: 'Backtest', requireAdmin: true })
    .when('/login', { templateUrl: '/views/login.html', controller: 'AuthCtrl', title: 'Sign In', redirectIfAuth: true })
    .when('/register', { templateUrl: '/views/register.html', controller: 'AuthCtrl', title: 'Register', redirectIfAuth: true })
    .otherwise({ redirectTo: '/' });
}])

.run(['$rootScope', '$location', 'AuthService', 'CartService', function($rootScope, $location, AuthService, CartService) {
  // Route guard
  $rootScope.$on('$routeChangeStart', function(evt, next) {
    $rootScope.pageTitle = next.title || 'StageAlpha';
    if (next.requireAuth && !AuthService.isLoggedIn()) {
      $location.path('/login');
    }
    if (next.requireAdmin && !AuthService.isAdmin()) {
      $location.path('/');
    }
    if (next.redirectIfAuth && AuthService.isLoggedIn()) {
      $location.path('/');
    }
  });

  // Restore auth state on page load
  $rootScope.currentUser = AuthService.getUser();
  $rootScope.isLoggedIn  = AuthService.isLoggedIn();
  $rootScope.isAdmin     = AuthService.isAdmin();
  $rootScope.cartCount   = CartService.count();

  // Cart count watcher
  $rootScope.$on('cart:updated', function() {
    $rootScope.cartCount = CartService.count();
  });
}])

// $http interceptor — attaches JWT to every request, handles 401
.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push(['$window', '$q', function($window, $q) {
    return {
      request: function(config) {
        var token = $window.localStorage.getItem('sa_access_token');
        if (token) config.headers.Authorization = 'Bearer ' + token;
        return config;
      },
      responseError: function(rejection) {
        if (rejection.status === 401) {
          $window.localStorage.removeItem('sa_access_token');
          $window.location.href = '#!/login';
        }
        return $q.reject(rejection);
      }
    };
  }]);
}]);
