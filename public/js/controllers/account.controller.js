'use strict';
angular.module('stageAlpha')
.controller('AccountController', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  $scope.bookings = [];
  $scope.filteredBookings = [];
  $scope.statusFilter = null;
  $scope.loading = true;

  $http.get('/api/v1/bookings').then(function(res) {
    if (res.data && Array.isArray(res.data.data)) {
      $scope.bookings = res.data.data;
    } else {
      $scope.bookings = [];
    }
    $scope.filteredBookings = $scope.bookings;
    $scope.loading = false;
  }).catch(function() {
    $scope.loading = false;
  });

  $scope.countByStatus = function(status) {
    return $scope.bookings.filter(function(b) { return b.status === status; }).length;
  };

  $scope.$watch('statusFilter', function(val) {
    if (!val) {
      $scope.filteredBookings = $scope.bookings;
    } else {
      $scope.filteredBookings = $scope.bookings.filter(function(b) { return b.status === val; });
    }
  });

  $scope.cancelBooking = function(id) {
    if (!confirm('Cancel this booking?')) return;
    $http.patch('/api/v1/bookings/' + id + '/status', { status: 'cancelled' }).then(function() {
      var b = $scope.bookings.find(function(b) { return b.id === id; });
      if (b) b.status = 'cancelled';
      ToastService.show('Booking cancelled', 'success');
    });
  };
}]);
