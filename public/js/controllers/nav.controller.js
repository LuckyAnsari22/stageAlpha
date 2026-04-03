'use strict';
angular.module('stageAlpha')
.controller('NavController', ['$scope', '$rootScope', '$location', '$http', 'AuthService', 'CartService',
function($scope, $rootScope, $location, $http, AuthService, CartService) {
  $scope.mobileMenuOpen = false;
  $scope.showNotifPanel = false;
  $scope.showResults = false;
  $scope.searchQuery = '';
  $scope.searchResults = [];
  $scope.notifications = [];
  $scope.unreadCount = 0;
  $scope.bellAnimating = false;

  function refreshAuth() {
    $scope.isLoggedIn = AuthService.isLoggedIn();
    $scope.isAdmin = AuthService.isAdmin();
    $scope.currentUser = AuthService.getUser();
    $scope.cartCount = CartService.count();
  }
  refreshAuth();

  $rootScope.$on('$routeChangeSuccess', function() {
    refreshAuth();
    $scope.mobileMenuOpen = false;
    $scope.showNotifPanel = false;
    $scope.showResults = false;
  });

  $rootScope.$on('cart:updated', function() {
    $scope.cartCount = CartService.count();
  });

  $rootScope.$on('auth:changed', function() {
    refreshAuth();
  });

  // Search
  $scope.search = function() {
    if (!$scope.searchQuery || $scope.searchQuery.length < 2) {
      $scope.showResults = false;
      $scope.searchResults = [];
      return;
    }
    $http.get('/api/v1/equipment?search=' + encodeURIComponent($scope.searchQuery)).then(function(res) {
      $scope.searchResults = (res.data.data || res.data || []).slice(0, 6);
      $scope.showResults = $scope.searchResults.length > 0;
    });
  };

  $scope.goToEquipment = function(id) {
    $scope.showResults = false;
    $scope.searchQuery = '';
    $location.path('/equipment/' + id);
  };

  $scope.closeSearch = function() {
    $scope.showResults = false;
  };

  // Notifications
  $scope.toggleNotifPanel = function() {
    $scope.showNotifPanel = !$scope.showNotifPanel;
    if ($scope.showNotifPanel && $scope.isLoggedIn) {
      $http.get('/api/v1/notifications').then(function(res) {
        $scope.notifications = res.data.data || res.data || [];
        $scope.unreadCount = $scope.notifications.filter(function(n) { return !n.is_read; }).length;
      }).catch(function() {});
    }
  };

  $scope.markAllRead = function() {
    $http.patch('/api/v1/notifications/read-all').then(function() {
      $scope.notifications.forEach(function(n) { n.is_read = true; });
      $scope.unreadCount = 0;
    }).catch(function() {});
  };

  // Load initial notification count
  if ($scope.isLoggedIn) {
    $http.get('/api/v1/notifications/unread-count').then(function(res) {
      $scope.unreadCount = (res.data.data && res.data.data.count) || 0;
    }).catch(function() {});
  }

  // Logout
  $scope.logout = function() {
    AuthService.logout();
    $rootScope.$broadcast('auth:changed');
    $location.path('/login');
  };
}]);
