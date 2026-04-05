'use strict';
angular.module('stageAlpha')
.controller('AdminDashboardCtrl', ['$scope', '$http', '$timeout', 'ToastService',
function($scope, $http, $timeout, ToastService) {
  
  $scope.isLoading = true;
  $scope.stats = {
    todayBookings: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    lowStockItems: 0
  };
  
  $scope.recentBookings = [];
  var revenueChart = null; // Store chart instance

  // Load dashboard data
  function loadDashboard() {
    $scope.isLoading = true;
    $http.get('/api/v1/analytics/dashboard').then(function(res) {
      var data = res.data.data || res.data || {};
      $scope.stats = {
        todayBookings: data.today_bookings || 0,
        totalRevenue: data.today_revenue || 0,
        activeCustomers: data.active_customers_today || 0,
        lowStockItems: data.low_stock_items || 0,
        pendingBookings: data.pending_bookings || 0
      };
      $scope.recentBookings = data.recent_bookings || [];
      $scope.isLoading = false;
      
      // Trigger pulse animation
      $scope.pulseAnimation = true;
      $timeout(function() {
        $scope.pulseAnimation = false;
      }, 600);
    }).catch(function(err) {
      ToastService.show('Error loading dashboard: ' + (err.data?.message || 'Unknown error'), 'error');
      $scope.isLoading = false;
    });
  }

  // Initial load
  loadDashboard();

  // Refresh button
  $scope.refreshDashboard = function() {
    loadDashboard();
  };

  // Chart configuration with REAL data
  $http.get('/api/v1/analytics/monthly-revenue?months=7').then(function(res) {
    var chartData = res.data.data || [];
    if (chartData.length === 0) return;
    
    $timeout(function() {
      var revenueCtx = document.getElementById('revenueChart');
      if (revenueCtx && typeof Chart !== 'undefined') {
        if (revenueChart) {
          revenueChart.destroy();
        }
        
        revenueChart = new Chart(revenueCtx, {
          type: 'line',
          data: {
            labels: chartData.map(function(d) { return new Date(d.report_month).toLocaleDateString('en-IN', { month: 'short' }); }),
            datasets: [{
              label: 'Revenue (₹)',
              data: chartData.map(function(d) { return parseFloat(d.gross_revenue || 0); }),
              borderColor: '#00f0ff',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#6c63ff',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, labels: { color: '#ccc' } }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { color: '#aaa', callback: function(v) { return '₹' + (v/1000).toFixed(0) + 'k'; } },
                grid: { color: 'rgba(255,255,255,0.05)' }
              },
              x: {
                ticks: { color: '#aaa' },
                grid: { display: false }
              }
            }
          }
        });
      }
    }, 100);
  }).catch(function(err) {
    console.error('Failed to load revenue data for chart', err);
  });

  // Cleanup on destroy
  $scope.$on('$destroy', function() {
    if (revenueChart) {
      revenueChart.destroy();
    }
  });

  // Confirm booking from dashboard quick-action
  $scope.confirmBooking = function(booking) {
    var bookingId = booking.booking_id || booking.id;
    if (!bookingId) {
      ToastService.show('Error: Booking ID not found', 'error');
      return;
    }
    $http.patch('/api/v1/bookings/' + bookingId + '/status', { status: 'confirmed' })
      .then(function() {
        booking.status = 'confirmed';
        ToastService.show('Booking confirmed!', 'success');
        loadDashboard();
      })
      .catch(function(err) {
        ToastService.show('Error: ' + (err.data && err.data.message || 'Failed to confirm'), 'error');
      });
  };

}]);
