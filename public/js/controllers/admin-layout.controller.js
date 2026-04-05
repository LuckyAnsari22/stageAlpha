'use strict';
angular.module('stageAlpha')
.controller('AdminLayoutCtrl', ['$scope', '$location', '$http', 'AuthService', 'ToastService',
function($scope, $location, $http, AuthService, ToastService) {
  
  // Verify admin access
  if (!AuthService.isAdmin()) {
    $location.path('/');
    return;
  }

  $scope.currentUser = AuthService.getUser() || { name: 'Admin' };
  $scope.sidebarOpen = true;
  $scope.mobileMenuOpen = false;

  // Sidebar menu items — ALL admin pages
  $scope.menuItems = [
    { title: 'Dashboard',  icon: '📊', url: '/admin/dashboard' },
    { title: 'Bookings',   icon: '📅', url: '/admin/bookings' },
    { title: 'Inventory',  icon: '📦', url: '/admin/inventory' },
    { title: 'Customers',  icon: '👥', url: '/admin/customers' },
    { title: 'Reports',    icon: '📈', url: '/admin/reports' },
    { title: 'Analytics',  icon: '📉', url: '/admin/analytics' },
    { title: 'Calendar',   icon: '🗓️', url: '/admin/calendar' },
    { title: 'Staff',      icon: '🧑‍🔧', url: '/admin/staff' },
    { title: 'Quotes',     icon: '📝', url: '/admin/quotes' },
    { title: 'Pricing',    icon: '💰', url: '/admin/pricing' },
    { title: 'Backtest',   icon: '🧪', url: '/admin/backtest' },
    { title: 'Live View',  icon: '🔴', url: '/admin/live' },
    { title: 'Diagnostics', icon: '🔧', url: '/admin/diagnostic' },
    { title: 'Intelligence', icon: '🧠', url: '/admin/intelligence' }
  ];

  // Update active menu item
  var updateActiveItem = function() {
    var currentPath = $location.path();
    $scope.menuItems.forEach(function(item) {
      item.active = (currentPath === item.url || currentPath.indexOf(item.url + '/') === 0);
    });
  };

  $scope.$on('$routeChangeSuccess', function() {
    updateActiveItem();
  });

  // Initial active state
  updateActiveItem();

  // Toggle sidebar
  $scope.toggleSidebar = function() {
    $scope.sidebarOpen = !$scope.sidebarOpen;
  };

  // Navigate
  $scope.navigate = function(url) {
    $location.path(url);
  };

  // Logout
  $scope.logout = function() {
    AuthService.logout();
    if ($scope.$root) {
      $scope.$root.currentUser = null;
      $scope.$root.isLoggedIn = false;
      $scope.$root.isAdmin = false;
    }
    ToastService.show('Logged out successfully', 'success');
    $location.path('/login');
  };
}]);
