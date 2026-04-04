'use strict';
angular.module('stageAlpha')
.controller('NavController', ['$scope', '$rootScope', '$location', '$http', '$timeout', 'AuthService', 'CartService', 'ToastService',
function($scope, $rootScope, $location, $http, $timeout, AuthService, CartService, ToastService) {
  $scope.mobileMenuOpen = false;
  $scope.showNotifPanel = false;
  $scope.showResults = false;
  $scope.searchQuery = '';
  $scope.searchResults = [];
  $scope.notifications = [];
  $scope.unreadCount = 0;
  $scope.bellAnimating = false;
  var searchTimeout;

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

  // Search with debounce
  $scope.search = function() {
    if (searchTimeout) $timeout.cancel(searchTimeout);
    
    if (!$scope.searchQuery || $scope.searchQuery.length < 2) {
      $scope.showResults = false;
      $scope.searchResults = [];
      return;
    }
    
    searchTimeout = $timeout(function() {
      $http.get('/api/v1/equipment?search=' + encodeURIComponent($scope.searchQuery)).then(function(res) {
        $scope.searchResults = (res.data.data || res.data || []).slice(0, 6);
        $scope.showResults = $scope.searchResults.length > 0;
      }).catch(function(err) {
        ToastService.show('Search error: ' + (err.data?.message || 'Unknown error'), 'error');
        $scope.searchResults = [];
      });
    }, 300);
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
      }).catch(function(err) {
        ToastService.show('Error loading notifications: ' + (err.data?.message || 'Unknown error'), 'error');
      });
    }
  };

  $scope.markAllRead = function() {
    $http.patch('/api/v1/notifications/read-all').then(function() {
      $scope.notifications.forEach(function(n) { n.is_read = true; });
      $scope.unreadCount = 0;
      ToastService.show('All notifications marked as read', 'success');
    }).catch(function(err) {
      ToastService.show('Error marking notifications: ' + (err.data?.message || 'Unknown error'), 'error');
    });
  };

  // Load initial notification count
  if ($scope.isLoggedIn) {
    $http.get('/api/v1/notifications/unread-count').then(function(res) {
      $scope.unreadCount = (res.data.data && res.data.data.count) || 0;
    }).catch(function(err) {
      // Silent fail for unread count, not critical
    });
  }

  // Logout
  $scope.logout = function() {
    AuthService.logout();
    $rootScope.$broadcast('auth:changed');
    ToastService.show('Logged out successfully', 'success');
    $location.path('/login');
  };
}]);
