angular.module('stageAlpha').controller('PricingCtrl',
['$scope', '$timeout', 'ApiService', 'ToastService',
function($scope, $timeout, Api, Toast) {
  $scope.equipment = [];
  $scope.selectedId = null;
  $scope.selectedDate = '';
  $scope.pricing = null;
  $scope.priceHistory = [];
  $scope.updating = false;
  $scope.recalculating = false;

  Api.get('/equipment?limit=100').then(function(res) {
    $scope.equipment = res.data.data;
  });

  $scope.calculate = function() {
    if (!$scope.selectedId || !$scope.selectedDate) return;
    
    Api.get('/pricing/estimate/' + $scope.selectedId + '?event_date=' + $scope.selectedDate)
      .then(function(res) {
        $scope.pricing = res.data.data;
        loadHistory();
      })
      .catch(function(err) {
        Toast.error('Pricing estimate failed: ' + (err.data?.message || 'Error'));
      });
  };

  function loadHistory() {
    Api.get('/equipment/' + $scope.selectedId + '/price-history').then(function(res) {
      $scope.priceHistory = res.data.data;
      $scope.initChart();
    });
  }

  $scope.updateAllPrices = function() {
    $scope.updating = true;
    Api.post('/pricing/update-all', {}).then(function(res) {
      Toast.success('Prices updated for ' + res.data.data.length + ' items');
    }).catch(function() {
      Toast.error('Failed to run batch update');
    }).finally(function() {
      $scope.updating = false;
    });
  };

  $scope.recalculateElasticity = function() {
    if (!$scope.selectedId) return;
    $scope.recalculating = true;
    Api.post('/pricing/elasticity/' + $scope.selectedId + '/recalculate', {})
      .then(function(res) {
        Toast.success('Elasticity profile recalculation complete');
      })
      .catch(function() {
        Toast.error('Failed to recalculate elasticity');
      })
      .finally(function() {
        $scope.recalculate = false;
        $scope.recalculating = false;
      });
  };

  $scope.initChart = function() {
    if (!$scope.priceHistory || $scope.priceHistory.length === 0) return;
    
    $timeout(function() {
      var ctx = document.getElementById('pricingChart');
      if (!ctx) return;
      
      var dataRows = angular.copy($scope.priceHistory).reverse();
      var labels = dataRows.map(function(r) { return new Date(r.changed_at).toLocaleDateString(); });
      var data = dataRows.map(function(r) { return parseFloat(r.new_price); });

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
             label: 'Optimal Price (₹)',
             data: data,
             borderColor: '#f97316',
             backgroundColor: 'transparent',
             tension: 0.1
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { grid: { color: '#252538' } }, x: { grid: { display: false } } },
          plugins: { legend: { display: false } }
        }
      });
    }, 100);
  };
}]);
