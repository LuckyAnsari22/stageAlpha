'use strict';
angular.module('stageAlpha')
.controller('BookingCtrl', ['$scope', '$location', '$http', 'CartService', 'AuthService', 'ToastService', '$rootScope',
function($scope, $location, $http, CartService, AuthService, ToastService, $rootScope) {
  $scope.cart = CartService.getAll();
  $scope.step = 1;
  $scope.booking = { event_type: 'general' };
  $scope.venues = [];
  $scope.submitting = false;

  // Calculate totals
  function calcTotals() {
    $scope.subtotal = $scope.cart.reduce(function(sum, item) {
      return sum + (item.current_price * item.qty);
    }, 0);
    $scope.taxAmount = Math.round($scope.subtotal * 0.18);
    $scope.grandTotal = $scope.subtotal + $scope.taxAmount;
  }
  calcTotals();

  // Load venues
  $http.get('/api/v1/venues').then(function(res) {
    $scope.venues = res.data.data || res.data || [];
  }).catch(function() {});

  $scope.updateQty = function(item, delta) {
    CartService.updateQty(item.id, item.qty + delta);
    $scope.cart = CartService.getAll();
    $rootScope.$broadcast('cart:updated');
    calcTotals();
  };

  $scope.removeFromCart = function(item) {
    CartService.remove(item.id);
    $scope.cart = CartService.getAll();
    $rootScope.$broadcast('cart:updated');
    calcTotals();
  };

  $scope.clearCart = function() {
    CartService.clear();
    $scope.cart = [];
    $rootScope.$broadcast('cart:updated');
    calcTotals();
  };

  $scope.submitBooking = function() {
    if ($scope.submitting) return;
    $scope.submitting = true;

    var items = $scope.cart.map(function(item) {
      return { equipment_id: item.id, qty: item.qty };
    });

    $http.post('/api/v1/bookings', {
      event_date: $scope.booking.event_date,
      event_type: $scope.booking.event_type,
      venue_id: $scope.booking.venue_id || null,
      special_requests: $scope.booking.special_requests || null,
      items: items
    }).then(function(res) {
      CartService.clear();
      $rootScope.$broadcast('cart:updated');
      ToastService.show('Booking created successfully!', 'success');
      var dataObj = res.data.data || res.data;
      var bookingId = dataObj.booking_id || dataObj.id || '';
      if(bookingId) {
        $location.path('/booking/' + bookingId);
      } else {
        $location.path('/account');
      }
    }).catch(function(err) {
      $scope.submitting = false;
      ToastService.show((err.data && err.data.message) || 'Booking failed. Please try again.', 'error');
    });
  };
}]);
