angular.module('stageAlpha').controller('ProfileCtrl',
['$scope', 'ApiService', 'ToastService',
function($scope, Api, Toast) {
  $scope.bookings = [];
  $scope.loading = true;

  function loadBookings() {
    $scope.loading = true;
    Api.get('/bookings?limit=50').then(function(res) {
      $scope.bookings = res.data.data;
    }).catch(function(err) {
      Toast.error('Failed to load operational history');
    }).finally(function() {
      $scope.loading = false;
    });
  }

  $scope.cancelBooking = function(id) {
    if(!confirm('Are you sure you want to abort this operation?')) return;
    
    Api.patch('/bookings/' + id + '/status', { status: 'cancelled' }).then(function() {
      Toast.success('Operation aborted successfully.');
      loadBookings();
    }).catch(function(err) {
      Toast.error(err.data.message || 'Failed to abort operation');
    });
  };

  loadBookings();
}]);
