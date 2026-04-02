angular.module('stageAlpha').controller('MyBookingsState',
    ['$scope', '$location', '$http', 'AuthService',
    function($scope, $location, $http, AuthService) {

    if (!AuthService.isLoggedIn()) {
        $location.path('/login');
        return;
    }

    $scope.bookings = [];
    $scope.loading = true;

    $scope.loadBookings = function() {
        $scope.loading = true;
        $http.get('/api/bookings/my').then(function(res) {
            $scope.bookings = res.data.data;
            $scope.loading = false;
        }).catch(function(err) {
            $scope.loading = false;
            console.error('Failed to load bookings:', err);
        });
    };

    $scope.cancelBooking = function(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        
        $http.patch('/api/bookings/' + bookingId + '/cancel').then(function() {
            $scope.loadBookings();
        }).catch(function(err) {
            alert(err.data ? err.data.message : 'Cancellation failed.');
        });
    };

    $scope.getStatusClass = function(status) {
        switch(status) {
            case 'Confirmed': return 'status-confirmed';
            case 'Completed': return 'status-completed';
            case 'Cancelled': return 'status-cancelled';
            default: return 'status-pending';
        }
    };

    $scope.loadBookings();
}]);
