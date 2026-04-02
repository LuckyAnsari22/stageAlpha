angular.module('stageAlpha').controller('BookingState',
    ['$scope', '$location', 'CartService', 'AuthService', '$http',
    function($scope, $location, CartService, AuthService, $http) {

    if (!AuthService.isLoggedIn()) {
        $location.path('/login');
        return;
    }

    $scope.cartItems = CartService.getCart();
    $scope.bookingData = { start_date: '', end_date: '' };
    $scope.error = '';
    $scope.loading = false;

    $scope.calculateTotals = function() {
        if (!$scope.bookingData.start_date || !$scope.bookingData.end_date) {
            $scope.days = 1;
        } else {
            var s = new Date($scope.bookingData.start_date);
            var e = new Date($scope.bookingData.end_date);
            $scope.days = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
        }
        
        $scope.subtotal = $scope.cartItems.reduce(function(sum, item) {
            return sum + (item.price_per_day * item.quantity * $scope.days);
        }, 0);
        $scope.taxAmount = Math.round($scope.subtotal * 0.18);
        $scope.total = $scope.subtotal + $scope.taxAmount;
    };

    $scope.removeFromCart = function(equipmentId) {
        $scope.cartItems = CartService.removeFromCart(equipmentId);
        $scope.calculateTotals();
    };

    $scope.updateQty = function(item, delta) {
        var newQty = item.quantity + delta;
        if (newQty >= 1 && newQty <= item.stock) {
            item.quantity = newQty;
            CartService.saveCart($scope.cartItems);
            $scope.calculateTotals();
        }
    };

    $scope.createBooking = function() {
        if (!$scope.bookingData.start_date || !$scope.bookingData.end_date) {
            $scope.error = 'Please select start and end dates.';
            return;
        }

        $scope.loading = true;
        $scope.error = '';

        var payload = {
            start_date: $scope.bookingData.start_date,
            end_date: $scope.bookingData.end_date,
            items: $scope.cartItems.map(function(item) {
                return { equipment_id: item.equipment_id, quantity: item.quantity };
            })
        };

        $http.post('/api/bookings', payload).then(function(res) {
            CartService.clearCart();
            $scope.loading = false;
            $location.path('/my-bookings');
        }).catch(function(err) {
            $scope.loading = false;
            $scope.error = err.data ? err.data.message : 'Booking failed. Please try again.';
        });
    };

    $scope.calculateTotals();
}]);
