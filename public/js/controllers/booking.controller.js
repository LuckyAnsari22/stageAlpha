angular.module('stageAlpha').controller('BookingCtrl',
['$scope', '$location', '$q', 'ApiService', 'CartService', 'ToastService',
function($scope, $location, $q, Api, Cart, Toast) {
  $scope.step = 1;
  $scope.cart = Cart.getItems();
  $scope.eventDate = Cart.getEventDate() || '';
  $scope.venue_id = null;
  $scope.venues = [];
  $scope.eventType = 'wedding';
  $scope.specialRequests = '';
  $scope.pricing = {};
  $scope.submitting = false;

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  $scope.minDate = tomorrow.toISOString().split('T')[0];

  Api.get('/venues').then(function(res) {
    $scope.venues = res.data.data;
  });

  $scope.refreshCart = function() {
    $scope.cart = Cart.getItems();
  };

  $scope.$on('cart:updated', $scope.refreshCart);

  $scope.updatePrices = function() {
    if (!$scope.eventDate) return;
    Cart.setEventDate($scope.eventDate);
    
    var promises = $scope.cart.map(function(item) {
      return Api.get('/equipment/' + item.equipment_id + '/price?event_date=' + $scope.eventDate)
        .then(function(res) {
          $scope.pricing[item.equipment_id] = res.data.data;
          item.algorithm_price = res.data.data.final_optimal_price;
        }).catch(function() {
          $scope.pricing[item.equipment_id] = null;
        });
    });
    
    $q.all(promises).then(function() {
      // Optional logging
    });
  };

  $scope.updateQty = function(id, qty) {
    Cart.updateQty(id, parseInt(qty));
  };
  
  $scope.removeItem = function(id) {
    Cart.remove(id);
  };

  $scope.subtotal = function() {
    return $scope.cart.reduce(function(sum, item) {
      var p = item.algorithm_price || item.base_price;
      return sum + (p * item.qty);
    }, 0);
  };

  $scope.tax = function() {
    return $scope.subtotal() * 0.18;
  };

  $scope.total = function() {
    return $scope.subtotal() + $scope.tax();
  };

  $scope.nextStep = function() {
    if ($scope.step === 1) {
      if (!$scope.eventDate) return Toast.error('Please select an event date.');
      var selectedDate = new Date($scope.eventDate);
      var min = new Date($scope.minDate);
      // Strip time bounds cleanly
      selectedDate.setHours(0,0,0,0); min.setHours(0,0,0,0);
      if (selectedDate < min) {
        return Toast.error('Please select a valid future event date.');
      }
      if (!$scope.venue_id) {
        return Toast.error('Please select a venue.');
      }
      $scope.updatePrices();
      $scope.step = 2;
    } 
    else if ($scope.step === 2) {
      if ($scope.cart.length === 0) return Toast.error('Your cart is empty.');
      $scope.step = 3;
    }
    else if ($scope.step === 3) {
      $scope.step = 4;
    }
  };

  $scope.prevStep = function() {
    if ($scope.step > 1) $scope.step--;
  };

  $scope.submitBooking = function() {
    $scope.submitting = true;
    
    var payload = {
      event_date: $scope.eventDate,
      venue_id: $scope.venue_id,
      event_type: $scope.eventType,
      special_requests: $scope.specialRequests,
      items: $scope.cart.map(function(i) { return { equipment_id: i.equipment_id, qty: i.qty }; })
    };

    Api.post('/bookings', payload).then(function(res) {
      Cart.clear();
      Toast.success('Booking successfully placed!');
      $location.path('/booking/' + res.data.data.booking_id);
    }).catch(function(err) {
      Toast.error(err.data?.message || 'Failed to place booking.');
    }).finally(function() {
      $scope.submitting = false;
    });
  };
}]);
