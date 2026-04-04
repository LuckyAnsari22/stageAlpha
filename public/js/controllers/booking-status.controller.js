'use strict';
angular.module('stageAlpha')
.controller('BookingStatusCtrl', ['$scope', '$routeParams', '$http', '$location', 'ToastService',
function($scope, $routeParams, $http, $location, ToastService) {
  $scope.loading = true;
  $scope.error = false;
  $scope.booking = {};
  $scope.items = [];
  $scope.payment = null;

  var id = $routeParams.id;

  $http.get('/api/v1/bookings/' + id).then(function(res) {
    var data = res.data.data || res.data;
    $scope.booking = data;
    $scope.items = data.items || [];
    $scope.payment = data.payment || null;
    $scope.loading = false;
  }).catch(function() {
    $scope.loading = false;
    $scope.error = true;
  });

  $scope.cancelBooking = function() {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    $http.patch('/api/v1/bookings/' + id + '/status', { status: 'cancelled' }).then(function() {
      $scope.booking.status = 'cancelled';
      ToastService.show('Booking cancelled', 'success');
    }).catch(function() {
      ToastService.show('Failed to cancel booking', 'error');
    });
  };
}]);
