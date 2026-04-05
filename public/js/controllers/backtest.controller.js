'use strict';
angular.module('stageAlpha')
.controller('BacktestCtrl', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  $scope.backtest = {};
  $scope.running = false;
  $scope.result = null;
  $scope.historicalResults = [];

  // Load historical results
  $http.get('/api/v1/backtest/results').then(function(res) {
    $scope.historicalResults = res.data.data || res.data || [];
  }).catch(function() {});

  $scope.runBacktest = function() {
    $scope.running = true;
    $scope.result = null;
    $http.post('/api/v1/backtest/run', {
      start_date: $scope.backtest.startDate,
      end_date: $scope.backtest.endDate
    }).then(function(res) {
      $scope.result = res.data.data || res.data;
      $scope.running = false;
      ToastService.show('Backtest complete!', 'success');

      // Render comparison chart
      setTimeout(function() {
        var ctx = document.getElementById('backtestChart');
        if (!ctx || !$scope.result) return;
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Base Pricing', 'Algorithm Pricing'],
            datasets: [{
              data: [parseFloat($scope.result.actual_revenue), parseFloat($scope.result.algorithm_revenue)],
              backgroundColor: ['rgba(240,240,245,0.1)', 'rgba(108,99,255,0.6)'],
              borderColor: ['rgba(240,240,245,0.3)', '#6c63ff'],
              borderWidth: 1,
              borderRadius: 8
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: 'rgba(240,240,245,0.5)' } },
              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,240,245,0.4)', callback: function(v) { return '₹' + (v/1000).toFixed(0) + 'k'; } } }
            }
          }
        });
      }, 200);
    }).catch(function(err) {
      $scope.running = false;
      ToastService.show((err.data && err.data.message) || 'Backtest failed', 'error');
    });
  };
}]);
