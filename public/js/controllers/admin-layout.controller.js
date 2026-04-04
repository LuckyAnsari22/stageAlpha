'use strict';
angular.module('stageAlpha')
.controller('AdminLayoutCtrl', ['$scope', '$location', '$http', 'AuthService', 'ToastService',
function($scope, $location, $http, AuthService, ToastService) {
  
  // Verify admin access
  if (!AuthService.isAdmin()) {
    $location.path('/');
    return;
  }

  $scope.currentUser = AuthService.getUser();
  $scope.sidebarOpen = true;
  $scope.mobileMenuOpen = false;

  // Sidebar menu items
  $scope.menuItems = [
    { title: 'Dashboard', icon: 'dashboard', url: '/admin/dashboard', active: true },
    { title: 'Bookings', icon: 'calendar-check', url: '/admin/bookings' },
    { title: 'Inventory', icon: 'box-seam', url: '/admin/inventory' },
    { title: 'Customers', icon: 'people', url: '/admin/customers' },
    { title: 'Reports', icon: 'bar-chart', url: '/admin/reports' },
    { title: 'Analytics', icon: 'graph-up', url: '/admin/analytics' },
    { title: 'Settings', icon: 'gear', url: '/admin/settings' }
  ];

  // Update active menu item
  $scope.$on('$routeChangeSuccess', function() {
    $scope.menuItems.forEach(function(item) {
      item.active = ($location.path().indexOf(item.url) === 0);
    });
  });

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
    ToastService.show('Logged out successfully', 'success');
    $location.path('/login');
  };
}]);
