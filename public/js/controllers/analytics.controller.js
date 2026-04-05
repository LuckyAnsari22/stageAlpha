'use strict';
angular.module('stageAlpha')
.controller('AnalyticsCtrl', ['$scope', '$http',
function($scope, $http) {
  $scope.analytics = {};
  $scope.topEquipment = [];
  $scope.monthlyRevenue = [];
  $scope.selectedPeriod = '30';

  $scope.refreshData = function() {
    // Load analytics
    $http.get('/api/v1/analytics/dashboard').then(function(res) {
      $scope.analytics = res.data.data || res.data || {};
    });

    // Top equipment
    $http.get('/api/v1/analytics/top-equipment').then(function(res) {
      $scope.topEquipment = res.data.data || res.data || [];
    }).catch(function() {});

    // Monthly revenue
    $http.get('/api/v1/analytics/monthly-revenue').then(function(res) {
      $scope.monthlyRevenue = res.data.data || res.data || [];
      setTimeout(renderRevenueChart, 200);
    }).catch(function() {});
  };

  $scope.refreshData();

  function renderRevenueChart() {
    var ctx = document.getElementById('revenueTimeChart');
    if (!ctx || $scope.monthlyRevenue.length === 0) return;
    var existing = Chart.getChart('revenueTimeChart');
    if (existing) existing.destroy();
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: $scope.monthlyRevenue.map(function(d) {
          return new Date(d.report_month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }),
        datasets: [{
          label: 'Revenue',
          data: $scope.monthlyRevenue.map(function(d) { return parseFloat(d.gross_revenue || 0); }),
          borderColor: '#6c63ff', backgroundColor: 'rgba(108,99,255,0.1)',
          borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3
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
  }
}]);
