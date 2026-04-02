angular.module('stageAlpha').controller('BookingStatusCtrl',
['$scope', '$routeParams', '$interval', 'ApiService', 'SocketService', 'ToastService',
function($scope, $routeParams, $interval, Api, Socket, Toast) {
  $scope.booking = null;
  $scope.loading = true;
  var timer;

  function loadBooking() {
    Api.get('/bookings/' + $routeParams.id).then(function(res) {
      $scope.booking = res.data.data;
    }).catch(function() {
      Toast.error('Booking not found or access denied');
    }).finally(function() {
      $scope.loading = false;
    });
  }

  $scope.statusClass = function(status) {
    if (status === 'completed') return 'badge-success';
    if (status === 'confirmed') return 'badge-accent';
    if (status === 'cancelled') return 'badge-danger';
    return 'badge-warning'; // pending
  };

  loadBooking();

  // Polling fallback
  timer = $interval(function() {
    if ($scope.booking && ($scope.booking.status === 'pending' || $scope.booking.status === 'confirmed')) {
      loadBooking();
    }
  }, 30000); 

  // Socket driven live-push if admin acts
  Socket.on('booking:updated', function(data) {
    if ($scope.booking && $scope.booking.booking_id == data.id) {
       $scope.booking.status = data.status;
       Toast.info('Booking status updated to ' + data.status);
    }
  });

  $scope.$on('$destroy', function() {
    if (timer) $interval.cancel(timer);
    Socket.off('booking:updated');
  });
}]);
