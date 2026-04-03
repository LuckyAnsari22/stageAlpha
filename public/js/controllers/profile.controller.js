'use strict';
angular.module('stageAlpha')
.controller('ProfileCtrl', ['$scope', '$http', 'AuthService', 'ToastService', '$location',
function($scope, $http, AuthService, ToastService, $location) {
  $scope.user = angular.copy(AuthService.getUser()) || {};
  $scope.saving = false;
  $scope.accountStats = {};

  // Load account stats
  $http.get('/api/v1/bookings').then(function(res) {
    var bookings = res.data.data || res.data || [];
    $scope.accountStats = {
      total_bookings: bookings.length,
      total_spent: bookings.reduce(function(s, b) { return s + parseFloat(b.total_price || 0); }, 0),
      completed: bookings.filter(function(b) { return b.status === 'completed'; }).length
    };
  }).catch(function() {});

  $scope.updateProfile = function() {
    $scope.saving = true;
    $http.put('/api/v1/auth/me', { name: $scope.user.name }).then(function() {
      var u = AuthService.getUser();
      u.name = $scope.user.name;
      AuthService.setUser(u);
      ToastService.show('Profile updated', 'success');
      $scope.saving = false;
    }).catch(function() {
      ToastService.show('Update failed', 'error');
      $scope.saving = false;
    });
  };

  $scope.logout = function() {
    AuthService.logout();
    $location.path('/login');
  };
}]);
