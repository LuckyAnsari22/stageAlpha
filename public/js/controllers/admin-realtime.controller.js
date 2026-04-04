'use strict';
angular.module('stageAlpha')
.controller('AdminRealtimeCtrl', ['$scope', '$http', '$timeout', 'ToastService', 'SocketService',
function($scope, $http, $timeout, ToastService, SocketService) {
  $scope.stats = {
    today_bookings: 0,
    pending_bookings: 0,
    low_stock_items: 0,
    active_customers_today: 0,
    today_revenue: 0,
    activeAdmins: 0
  };
  $scope.recentBookings = [];
  $scope.inventory = [];
  $scope.isLoading = true;
  $scope.lastUpdateTime = '';
  $scope.connectionStatus = 'connecting';
  $scope.adminCount = 1;
  
  // Initialize Socket Connection for Admin
  SocketService.emit('admin:join', {});
  
  // Listen for dashboard updates
  SocketService.on('dashboard:update', function(data) {
    $scope.$apply(function() {
      $scope.stats = data;
      $scope.recentBookings = data.recent_bookings || [];
      $scope.lastUpdateTime = new Date(data.timestamp).toLocaleTimeString('en-IN');
      
      // Trigger pulse animation on update
      $scope.pulseAnimation = true;
      $timeout(function() {
        $scope.pulseAnimation = false;
      }, 600);
    });
  });
  
  // Listen for inventory updates
  SocketService.on('inventory:changed', function(equipment) {
    $scope.$apply(function() {
      // Find and update equipment in inventory list
      var existing = $scope.inventory.find(function(e) { return e.id === equipment.id; });
      if (existing) {
        existing.stock_qty = equipment.stock_qty;
        existing.current_price = equipment.current_price;
        // Show stock alert if low
        if (equipment.stock_qty <= 3) {
          ToastService.show('⚠️ Low stock alert: ' + equipment.name, 'warning');
        }
      }
    });
  });
  
  // Listen for new bookings
  SocketService.on('booking:new', function(booking) {
    $scope.$apply(function() {
      // Add to top of recent bookings
      $scope.recentBookings.unshift(booking);
      // Keep only last 10
      if ($scope.recentBookings.length > 10) {
        $scope.recentBookings.pop();
      }
      ToastService.show('🎉 New booking received!', 'success');
    });
  });
  
  // Listen for admin connection status
  SocketService.on('admin:connection-status', function(data) {
    $scope.$apply(function() {
      $scope.adminCount = data.activeAdmins;
    });
  });
  
  // Connection status
  SocketService.on('connect', function() {
    $scope.$apply(function() {
      $scope.connectionStatus = 'connected';
    });
  });
  
  SocketService.on('disconnect', function() {
    $scope.$apply(function() {
      $scope.connectionStatus = 'disconnected';
    });
  });
  
  // Initial load
  $http.get('/api/v1/analytics/dashboard').then(function(res) {
    $scope.stats = res.data.data || {};
    $scope.isLoading = false;
  }).catch(function(err) {
    ToastService.show('Error loading dashboard: ' + (err.data?.message || 'Unknown error'), 'error');
    $scope.isLoading = false;
  });
  
  // Load inventory
  $http.get('/api/v1/equipment?limit=20').then(function(res) {
    $scope.inventory = res.data.data || [];
  }).catch(function(err) {
    ToastService.show('Error loading inventory: ' + (err.data?.message || 'Unknown error'), 'error');
  });
  
  // Manual refresh button
  $scope.refreshDashboard = function() {
    $scope.isLoading = true;
    $http.get('/api/v1/analytics/dashboard').then(function(res) {
      $scope.stats = res.data.data || {};
      $scope.isLoading = false;
      ToastService.show('Dashboard refreshed', 'success');
    }).catch(function(err) {
      ToastService.show('Error refreshing: ' + (err.data?.message || 'Unknown error'), 'error');
      $scope.isLoading = false;
    });
  };
  
  // Actions
  $scope.confirmBooking = function(booking) {
    $http.patch('/api/v1/bookings/' + booking.id, { status: 'confirmed' }).then(function() {
      booking.status = 'confirmed';
      ToastService.show('Booking confirmed ✓', 'success');
    }).catch(function(err) {
      ToastService.show('Error: ' + (err.data?.message || 'Unknown error'), 'error');
    });
  };
  
  $scope.cancelBooking = function(booking) {
    if (confirm('Cancel this booking? This cannot be undone.')) {
      $http.patch('/api/v1/bookings/' + booking.id, { status: 'cancelled' }).then(function() {
        booking.status = 'cancelled';
        ToastService.show('Booking cancelled', 'info');
      }).catch(function(err) {
        ToastService.show('Error: ' + (err.data?.message || 'Unknown error'), 'error');
      });
    }
  };
  
  // Status badge styling
  $scope.getStatusClass = function(status) {
    var statusMap = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-default';
  };
  
  // Stock level indicator
  $scope.getStockClass = function(qty) {
    if (qty <= 1) return 'stock-critical';
    if (qty <= 3) return 'stock-low';
    if (qty <= 5) return 'stock-medium';
    return 'stock-high';
  };
  
  // Cleanup on destroy
  $scope.$on('$destroy', function() {
    SocketService.emit('admin:leave', {});
  });
}]);
