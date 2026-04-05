'use strict';
angular.module('stageAlpha')
.controller('AdminIntelligenceCtrl', ['$scope', '$http', 'ToastService', '$timeout', function($scope, $http, ToastService, $timeout) {
  
  $scope.activeTab = 'rpaed';
  
  // States
  $scope.rpaed = [];
  $scope.roi = [];
  $scope.rfm = null;
  $scope.forecast = null;
  $scope.pricingConfig = null;

  $scope.init = function() {
    $scope.loadRpaed();
  };

  $scope.setTab = function(tab) {
    $scope.activeTab = tab;
    if (tab === 'rpaed' && !$scope.rpaed.length) $scope.loadRpaed();
    if (tab === 'roi' && !$scope.roi.length) $scope.loadRoi();
    if (tab === 'rfm' && !$scope.rfm) $scope.loadRfm();
  };

  $scope.loadRpaed = function() {
    $http.get('/api/v1/intelligence/rpaed').then(function(res) {
      $scope.rpaed = res.data.data;
    }).catch(function(err) {
      ToastService.show('Failed to load RPAED data', 'error');
    });
  };

  $scope.loadRoi = function() {
    $http.get('/api/v1/intelligence/roi').then(function(res) {
      $scope.roi = res.data.data;
    }).catch(function(err) {
      ToastService.show('Failed to load ROI data', 'error');
    });
  };

  $scope.loadRfm = function() {
    $http.get('/api/v1/intelligence/rfm').then(function(res) {
      $scope.rfm = res.data.data;
      $scope.renderRfmChart();
    }).catch(function(err) {
      ToastService.show('Failed to load RFM data', 'error');
    });
  };

  var rfmChart = null;
  $scope.renderRfmChart = function() {
    if (!$scope.rfm || !$scope.rfm.customers) return;
    $timeout(function() {
      var ctx = document.getElementById('rfmChart');
      if (!ctx) return;
      if (rfmChart) rfmChart.destroy();

      var colorMap = {
        'CHAMPION': 'rgba(0, 240, 255, 0.7)',
        'LOYAL': 'rgba(108, 99, 255, 0.7)',
        'AT_RISK': 'rgba(255, 165, 0, 0.7)',
        'LOST': 'rgba(255, 51, 51, 0.7)',
        'PROMISING_NEW': 'rgba(0, 255, 0, 0.7)',
        'NEEDS_ATTENTION': 'rgba(150, 150, 150, 0.7)'
      };

      var datasets = {};
      $scope.rfm.customers.forEach(function(c) {
        if (!datasets[c.segment]) {
          datasets[c.segment] = {
            label: c.segment,
            data: [],
            backgroundColor: colorMap[c.segment] || colorMap['NEEDS_ATTENTION']
          };
        }
        datasets[c.segment].data.push({
          x: parseInt(c.frequency),
          y: parseFloat(c.monetary),
          r: Math.max(5, 20 - (c.recency_days / 30) * 5),
          customerName: c.name
        });
      });

      rfmChart = new Chart(ctx, {
        type: 'bubble',
        data: { datasets: Object.values(datasets) },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  var item = context.raw;
                  return item.customerName + ' (Freq: ' + item.x + ', ₹' + item.y + ')';
                }
              }
            },
            legend: { labels: { color: '#ccc' } }
          },
          scales: {
            x: { title: { display: true, text: 'Frequency (Bookings)', color: '#ccc' }, ticks: { color: '#aaa' } },
            y: { title: { display: true, text: 'Monetary (₹ Revenue)', color: '#ccc' }, ticks: { color: '#aaa' } }
          }
        }
      });
    });
  };

  // Run initial tab setup
  $scope.init();
}]);
