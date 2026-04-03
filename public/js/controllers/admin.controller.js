'use strict';
angular.module('stageAlpha')
.controller('AdminCtrl', ['$scope', '$http',
function($scope, $http) {
  $scope.stats = {};
  $scope.recentBookings = [];
  $scope.inventory = [];

  // Load dashboard stats
  $http.get('/api/v1/analytics/dashboard').then(function(res) {
    $scope.stats = res.data.data || res.data || {};
  }).catch(function() {
    $scope.stats = {};
  });

  // Load recent bookings
  $http.get('/api/v1/bookings?limit=15').then(function(res) {
    $scope.recentBookings = res.data.data || res.data || [];
  }).catch(function() {});

  // Load inventory
  $http.get('/api/v1/equipment').then(function(res) {
    $scope.inventory = res.data.data || res.data || [];
  }).catch(function() {});

  // Actions
  $scope.confirmBooking = function(id) {
    $http.patch('/api/v1/bookings/' + id, { status: 'confirmed' }).then(function() {
      var b = $scope.recentBookings.find(function(b) { return b.booking_id === id; });
      if (b) b.status = 'confirmed';
    });
  };

  $scope.cancelBooking = function(id) {
    $http.patch('/api/v1/bookings/' + id, { status: 'cancelled' }).then(function() {
      var b = $scope.recentBookings.find(function(b) { return b.booking_id === id; });
      if (b) b.status = 'cancelled';
    });
  };

  // Revenue chart
  $http.get('/api/v1/analytics/monthly-revenue').then(function(res) {
    var data = res.data.data || res.data || [];
    setTimeout(function() {
      var ctx = document.getElementById('revenueChart');
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
    }, 200);
  }).catch(function() {});
}]);
