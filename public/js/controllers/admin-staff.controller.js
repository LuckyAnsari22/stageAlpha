'use strict';
angular.module('stageAlpha')
.controller('AdminStaffCtrl', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  $scope.staff = [];
  $scope.showAddForm = false;
  $scope.newStaff = {};

  $http.get('/api/v1/staff').then(function(res) {
    $scope.staff = res.data.data || res.data || [];
  }).catch(function() {});

  $scope.addStaff = function() {
    $http.post('/api/v1/staff', $scope.newStaff).then(function(res) {
      $scope.staff.push(res.data.data || res.data);
      $scope.newStaff = {};
      $scope.showAddForm = false;
      ToastService.show('Staff member added', 'success');
    }).catch(function() {
      ToastService.show('Failed to add staff', 'error');
    });
  };

  $scope.toggleAvailability = function(s) {
    $http.patch('/api/v1/staff/' + s.id, { is_available: !s.is_available }).then(function() {
      s.is_available = !s.is_available;
    }).catch(function() {});
  };
}]);
