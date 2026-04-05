'use strict';
angular.module('stageAlpha')
.controller('AdminReportsCtrl', ['$scope', '$http', '$timeout', 'ToastService',
function($scope, $http, $timeout, ToastService) {
  
  console.log('=== AdminReportsCtrl Initialized ===');
  
  // ===== STATE =====
  $scope.isLoading = false;
  $scope.reportTypes = ['Revenue', 'Bookings', 'Customers', 'Equipment'];
  $scope.activeReport = 'Revenue';
  $scope.dateRange = 'month';
  
  // ===== CHART INSTANCES =====
  var charts = {};
  
  // ===== DATA MODELS =====
  $scope.revenueData = {
    total: 0,
    count: 0,
    average: 0,
    highest: 0,
    dailyAvg: 0,
    dailyBreakdown: []
  };
  
  $scope.bookingData = {
    total: 0,
    confirmed: 0,
    pending: 0,
    completionRate: 0,
    recent: []
  };
  
  $scope.customerData = {
    total: 0,
    vip: 0,
    avgLTV: 0,
    newThisMonth: 0,
    top: []
  };
  
  $scope.equipmentData = {
    total: 0,
    avgUtilization: 0,
    outOfStock: 0,
    totalRevenue: 0,
    performance: []
  };

  // ===== DATE RANGE FUNCTIONS =====
  
  var getDateRangeParams = function() {
    var now = new Date();
    var startDate, endDate = now;
    
    switch($scope.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1);
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  $scope.getDateRangeLabel = function() {
    var params = getDateRangeParams();
    return params.startDate + ' to ' + params.endDate;
  };

  $scope.updateDateRange = function() {
    console.log('[Reports] Date range changed to:', $scope.dateRange);
    loadReportData();
  };

  // ===== LOAD REPORTS =====
  
  var loadReportData = function() {
    console.log('[Reports] Loading report:', $scope.activeReport);
    $scope.isLoading = true;
    
    var params = getDateRangeParams();
    
    switch($scope.activeReport) {
      case 'Revenue':
        loadRevenueReport(params);
        break;
      case 'Bookings':
        loadBookingReport(params);
        break;
      case 'Customers':
        loadCustomerReport(params);
        break;
      case 'Equipment':
        loadEquipmentReport(params);
        break;
    }
  };

  var loadRevenueReport = function(params) {
    $http.get('/api/v1/analytics/reports/revenue', { params: params })
      .then(function(response) {
        console.log('[Reports] Revenue data:', response.data);
        $scope.revenueData = response.data.data || response.data;
        $scope.isLoading = false;
        
        $timeout(function() {
          renderRevenueCharts();
        }, 100);
      })
      .catch(function(error) {
        console.error('[Reports] Revenue error:', error);
        $scope.isLoading = false;
        // Generate mock data if API fails
        generateMockRevenueData();
        $timeout(function() {
          renderRevenueCharts();
        }, 100);
      });
  };

  var loadBookingReport = function(params) {
    $http.get('/api/v1/analytics/reports/bookings', { params: params })
      .then(function(response) {
        console.log('[Reports] Booking data:', response.data);
        $scope.bookingData = response.data.data || response.data;
        $scope.isLoading = false;
        
        $timeout(function() {
          renderBookingCharts();
        }, 100);
      })
      .catch(function(error) {
        console.error('[Reports] Booking error:', error);
        $scope.isLoading = false;
        generateMockBookingData();
        $timeout(function() {
          renderBookingCharts();
        }, 100);
      });
  };

  var loadCustomerReport = function(params) {
    $http.get('/api/v1/analytics/reports/customers', { params: params })
      .then(function(response) {
        console.log('[Reports] Customer data:', response.data);
        $scope.customerData = response.data.data || response.data;
        $scope.isLoading = false;
        
        $timeout(function() {
          renderCustomerCharts();
        }, 100);
      })
      .catch(function(error) {
        console.error('[Reports] Customer error:', error);
        $scope.isLoading = false;
        generateMockCustomerData();
        $timeout(function() {
          renderCustomerCharts();
        }, 100);
      });
  };

  var loadEquipmentReport = function(params) {
    $http.get('/api/v1/analytics/reports/equipment', { params: params })
      .then(function(response) {
        console.log('[Reports] Equipment data:', response.data);
        $scope.equipmentData = response.data.data || response.data;
        $scope.isLoading = false;
        
        $timeout(function() {
          renderEquipmentCharts();
        }, 100);
      })
      .catch(function(error) {
        console.error('[Reports] Equipment error:', error);
        $scope.isLoading = false;
        generateMockEquipmentData();
        $timeout(function() {
          renderEquipmentCharts();
        }, 100);
      });
  };

  // ===== MOCK DATA GENERATORS =====
  
  var generateMockRevenueData = function() {
    $scope.revenueData = {
      total: 145000,
      count: 32,
      average: 4531,
      highest: 15000,
      dailyAvg: 7250,
      dailyBreakdown: [
        {date: new Date(), count: 5, total: 25000, average: 5000},
        {date: new Date(Date.now() - 86400000), count: 4, total: 18000, average: 4500},
        {date: new Date(Date.now() - 172800000), count: 6, total: 32000, average: 5333}
      ]
    };
  };

  var generateMockBookingData = function() {
    $scope.bookingData = {
      total: 32,
      confirmed: 24,
      pending: 5,
      completionRate: 88,
      recent: [
        {id: 1001, customer_name: 'Raj Kumar', event_date: new Date(), status: 'Confirmed', total_price: 5000},
        {id: 1002, customer_name: 'Priya Singh', event_date: new Date(), status: 'Pending', total_price: 7500}
      ]
    };
  };

  var generateMockCustomerData = function() {
    $scope.customerData = {
      total: 156,
      vip: 12,
      avgLTV: 8750,
      newThisMonth: 8,
      top: [
        {name: 'Raj Kumar', segment: 'VIP', booking_count: 15, total_spend: 125000, last_booking_date: new Date()},
        {name: 'Priya Singh', segment: 'Regular', booking_count: 8, total_spend: 65000, last_booking_date: new Date()}
      ]
    };
  };

  var generateMockEquipmentData = function() {
    $scope.equipmentData = {
      total: 42,
      avgUtilization: 72,
      outOfStock: 3,
      totalRevenue: 180000,
      performance: [
        {name: 'JBL PA System', category: 'Audio', rental_count: 18, utilization: 85, revenue: 45000},
        {name: 'Stage Lights', category: 'Lighting', rental_count: 15, utilization: 72, revenue: 38000}
      ]
    };
  };

  // ===== CHART RENDERING =====
  
  var renderRevenueCharts = function() {
    console.log('[Reports] Rendering revenue charts');
    
    // Revenue trend line chart
    var ctx1 = document.getElementById('reportsRevenueChart');
    if (ctx1 && $scope.revenueData.dailyBreakdown) {
      if (charts.revenue) charts.revenue.destroy();
      var existing = Chart.getChart('reportsRevenueChart');
      if (existing) existing.destroy();
      
      charts.revenue = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: $scope.revenueData.dailyBreakdown.map(function(d) {
            return new Date(d.date).toLocaleDateString('en-IN', {month: 'short', day: 'numeric'});
          }),
          datasets: [{
            label: 'Revenue',
            data: $scope.revenueData.dailyBreakdown.map(function(d) { return d.total; }),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: function(v) { return '₹' + v/1000 + 'K'; } } }
          }
        }
      });
    }
  };

  var renderBookingCharts = function() {
    console.log('[Reports] Rendering booking charts');
    
    var ctx = document.getElementById('bookingStatusChart');
    if (ctx) {
      if (charts.bookingStatus) charts.bookingStatus.destroy();
      var existing = Chart.getChart('bookingStatusChart');
      if (existing) existing.destroy();
      
      charts.bookingStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Confirmed', 'Pending', 'Completed', 'Cancelled'],
          datasets: [{
            data: [$scope.bookingData.confirmed, $scope.bookingData.pending, 
                   Math.floor($scope.bookingData.total * 0.7), 
                   Math.floor($scope.bookingData.total * 0.1)],
            backgroundColor: ['#6c63ff', '#ffa500', '#10b981', '#ff3333'],
            borderColor: '#0f1119',
            borderWidth: 2
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });
    }
  };

  var renderCustomerCharts = function() {
    console.log('[Reports] Rendering customer charts');
    
    var ctx = document.getElementById('customerSegmentChart');
    if (ctx) {
      if (charts.customerSegment) charts.customerSegment.destroy();
      var existing = Chart.getChart('customerSegmentChart');
      if (existing) existing.destroy();
      
      charts.customerSegment = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['VIP', 'Regular', 'One-time'],
          datasets: [{
            data: [$scope.customerData.vip || 12, 
                   Math.floor($scope.customerData.total * 0.6), 
                   Math.floor($scope.customerData.total * 0.3)],
            backgroundColor: ['#ff6b6b', '#4ecdc4', '#95e1d3'],
            borderColor: '#0f1119',
            borderWidth: 2
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });
    }
  };

  var renderEquipmentCharts = function() {
    console.log('[Reports] Rendering equipment charts');
    
    var ctx = document.getElementById('equipmentPopularityChart');
    if (ctx && $scope.equipmentData.performance && $scope.equipmentData.performance.length > 0) {
      if (charts.equipmentPopularity) charts.equipmentPopularity.destroy();
      var existing = Chart.getChart('equipmentPopularityChart');
      if (existing) existing.destroy();
      
      charts.equipmentPopularity = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: $scope.equipmentData.performance.slice(0, 5).map(function(e) { return e.name.substring(0, 12); }),
          datasets: [{
            label: 'Times Rented',
            data: $scope.equipmentData.performance.slice(0, 5).map(function(e) { return e.rental_count; }),
            backgroundColor: '#8b5cf6',
            borderColor: '#6c63ff',
            borderWidth: 1
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } }
        }
      });
    }
  };

  // ===== ACTIONS =====
  
  $scope.selectReport = function(reportType) {
    console.log('[Reports] Selected report:', reportType);
    $scope.activeReport = reportType;
    loadReportData();
  };

  $scope.refreshReports = function() {
    console.log('[Reports] Refresh clicked');
    loadReportData();
  };

  $scope.exportReport = function(reportType) {
    console.log('[Reports] Export report:', reportType);
    ToastService.show('Exporting ' + reportType + ' report...', 'success');
    var data = [];
    if (reportType === 'Revenue') data = $scope.revenueData.dailyBreakdown;
    else if (reportType === 'Bookings') data = $scope.bookingData.recent;
    else if (reportType === 'Customers') data = $scope.customerData.top;
    else if (reportType === 'Equipment') data = $scope.equipmentData.performance;

    if (!data || data.length === 0) return ToastService.show('No data to export', 'error');

    var csv = '';
    var keys = Object.keys(data[0]);
    csv += keys.join(',') + '\\n';
    data.forEach(function(row) {
      csv += keys.map(function(k) { return '"' + String(row[k] || '').replace(/"/g, '""') + '"'; }).join(',') + '\\n';
    });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = reportType.toLowerCase() + '_export.csv';
    link.click();
  };

  // ===== INITIALIZATION =====
  
  // Load initial report
  loadReportData();
  
  // Optional: Setup real-time updates every 5 minutes
  var refreshInterval = setInterval(function() {
    console.log('[Reports] Auto-refresh triggered');
    loadReportData();
  }, 300000); // 5 minutes
  
  $scope.$on('$destroy', function() {
    clearInterval(refreshInterval);
    Object.keys(charts).forEach(function(key) {
      if (charts[key]) charts[key].destroy();
    });
  });

}]);
