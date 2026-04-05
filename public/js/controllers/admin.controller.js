'use strict';
angular.module('stageAlpha')
.controller('AdminCtrl', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  $scope.stats = {};
  $scope.recentBookings = [];
  $scope.inventory = [];
  $scope.isLoading = false;

  // Load dashboard stats
  $scope.isLoading = true;
  $http.get('/api/v1/analytics/dashboard').then(function(res) {
    $scope.stats = res.data.data || res.data || {};
    $scope.isLoading = false;
  }).catch(function(err) {
    ToastService.show('Error loading dashboard: ' + (err.data?.message || 'Unknown error'), 'error');
    $scope.stats = {};
    $scope.isLoading = false;
  });

  // Load recent bookings
  $http.get('/api/v1/bookings?limit=15').then(function(res) {
    $scope.recentBookings = res.data.data || res.data || [];
  }).catch(function(err) {
    ToastService.show('Error loading bookings: ' + (err.data?.message || 'Unknown error'), 'error');
  });

  // Load inventory
  $http.get('/api/v1/equipment').then(function(res) {
    $scope.inventory = res.data.data || res.data || [];
  }).catch(function(err) {
    ToastService.show('Error loading inventory: ' + (err.data?.message || 'Unknown error'), 'error');
  });

  // Actions
  $scope.confirmBooking = function(id) {
    $http.patch('/api/v1/bookings/' + id + '/status', { status: 'confirmed' }).then(function() {
      var b = $scope.recentBookings.find(function(b) { return b.booking_id === id; });
      if (b) b.status = 'confirmed';
      ToastService.show('Booking confirmed', 'success');
    }).catch(function(err) {
      ToastService.show('Error confirming booking: ' + (err.data?.message || 'Unknown error'), 'error');
    });
  };

  $scope.cancelBooking = function(id) {
    $http.patch('/api/v1/bookings/' + id + '/status', { status: 'cancelled' }).then(function() {
      var b = $scope.recentBookings.find(function(b) { return b.booking_id === id; });
      if (b) b.status = 'cancelled';
      ToastService.show('Booking cancelled', 'success');
    }).catch(function(err) {
      ToastService.show('Error cancelling booking: ' + (err.data?.message || 'Unknown error'), 'error');
    });
  };

  // Revenue chart
  $http.get('/api/v1/analytics/monthly-revenue').then(function(res) {
    var data = res.data.data || res.data || [];
    setTimeout(function() {
      var ctx = document.getElementById('classicRevenueChart');
      if (!ctx || data.length === 0) return;
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.map(function(d) { return new Date(d.report_month).toLocaleDateString('en-IN', { month: 'short' }); }),
          datasets: [{
            label: 'Revenue (₹)',
            data: data.map(function(d) { return parseFloat(d.gross_revenue || 0); }),
            backgroundColor: 'rgba(108,99,255,0.5)',
            borderColor: '#6c63ff',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(240,240,245,0.4)' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,240,245,0.4)', callback: function(v) { return '₹' + (v/1000).toFixed(0) + 'k'; } } }
          }
        }
      });
    }, 500);
   }).catch(function(err) {
     ToastService.show('Error loading revenue data: ' + (err.data?.message || 'Unknown error'), 'error');
   });
}]);
