'use strict';
angular.module('stageAlpha')
.controller('AdminBookingsCtrl', ['$scope', '$http', '$timeout', 'ToastService',
function($scope, $http, $timeout, ToastService) {
  
  $scope.isLoading = true;
  $scope.bookings = [];
  $scope.selectedBooking = null;
  $scope.showModal = false;
  
  // Filters
  $scope.filters = {
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  };
  
  // Sort options
  $scope.sortBy = 'event_date';
  $scope.sortDesc = true;

  // Status options
  $scope.statusOptions = ['pending', 'confirmed', 'completed', 'cancelled'];
  
  // Load bookings
  function loadBookings() {
    $scope.isLoading = true;
    $http.get('/api/v1/bookings', {
      params: {
        status: $scope.filters.status || undefined,
        search: $scope.filters.search || undefined
      }
    }).then(function(res) {
      $scope.bookings = res.data.data || [];
      $scope.isLoading = false;
    }).catch(function(err) {
      ToastService.show('Error loading bookings: ' + (err.data?.message || 'Unknown error'), 'error');
      $scope.isLoading = false;
    });
  }

  // Initial load
  loadBookings();

  // Refresh bookings
  $scope.refreshBookings = function() {
    loadBookings();
  };

  // Filter bookings
  $scope.applyFilters = function() {
    loadBookings();
  };

  // Clear filters
  $scope.clearFilters = function() {
    $scope.filters = {
      status: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    };
    loadBookings();
  };

  // View booking detail
  $scope.viewBooking = function(booking) {
    $scope.selectedBooking = angular.copy(booking);
    $scope.showModal = true;
  };

  // Close modal
  $scope.closeModal = function() {
    $scope.showModal = false;
    $scope.selectedBooking = null;
  };

  // Confirm booking
  $scope.confirmBooking = function(booking) {
    if (!booking) booking = $scope.selectedBooking;
    if (!booking) return;

    // Use booking_id from API, or id if it exists
    var bookingId = booking.booking_id || booking.id;
    if (!bookingId) {
      ToastService.show('Error: Booking ID not found', 'error');
      return;
    }

    var payload = { status: 'confirmed' };
    $http.patch('/api/v1/bookings/' + bookingId + '/status', payload)
      .then(function() {
        ToastService.show('Booking confirmed!', 'success');
        booking.status = 'confirmed';
        if ($scope.selectedBooking) $scope.selectedBooking.status = 'confirmed';
        loadBookings();
      })
      .catch(function(err) {
        ToastService.show('Error: ' + (err.data?.message || 'Failed to confirm'), 'error');
      });
  };

  // Cancel booking
  $scope.cancelBooking = function(booking) {
    if (!booking) booking = $scope.selectedBooking;
    if (!booking) return;

    if (!confirm('Are you sure you want to cancel this booking?')) return;

    // Use booking_id from API, or id if it exists
    var bookingId = booking.booking_id || booking.id;
    if (!bookingId) {
      ToastService.show('Error: Booking ID not found', 'error');
      return;
    }

    var payload = { status: 'cancelled' };
    $http.patch('/api/v1/bookings/' + bookingId + '/status', payload)
      .then(function() {
        ToastService.show('Booking cancelled', 'success');
        booking.status = 'cancelled';
        if ($scope.selectedBooking) $scope.selectedBooking.status = 'cancelled';
        loadBookings();
      })
      .catch(function(err) {
        ToastService.show('Error: ' + (err.data?.message || 'Failed to cancel'), 'error');
      });
  };

  // Complete booking
  $scope.completeBooking = function(booking) {
    if (!booking) booking = $scope.selectedBooking;
    if (!booking) return;

    // Use booking_id from API, or id if it exists
    var bookingId = booking.booking_id || booking.id;
    if (!bookingId) {
      ToastService.show('Error: Booking ID not found', 'error');
      return;
    }

    var payload = { status: 'completed' };
    $http.patch('/api/v1/bookings/' + bookingId + '/status', payload)
      .then(function() {
        ToastService.show('Booking completed!', 'success');
        booking.status = 'completed';
        if ($scope.selectedBooking) $scope.selectedBooking.status = 'completed';
        loadBookings();
      })
      .catch(function(err) {
        ToastService.show('Error: ' + (err.data?.message || 'Failed to complete'), 'error');
      });
  };

  // Get status color
  $scope.getStatusColor = function(status) {
    var colors = {
      'pending': '#ffa500',
      'confirmed': '#6c63ff',
      'completed': '#00ff00',
      'cancelled': '#ff3333'
    };
    return colors[status] || '#ccc';
  };

}]);
