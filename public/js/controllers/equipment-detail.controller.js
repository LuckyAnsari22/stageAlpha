angular.module('stageAlpha').controller('EquipmentDetailCtrl',
['$scope', '$routeParams', 'ApiService', 'CartService', 'ToastService',
function($scope, $routeParams, Api, Cart, Toast) {
  $scope.equipment = null;
  $scope.loading = true;
  $scope.eventDate = '';
  $scope.pricing = null;
  $scope.loadingPrice = false;
  $scope.priceHistory = [];

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  $scope.minDate = tomorrow.toISOString().split('T')[0];

  function loadDetail() {
    Api.get('/equipment/' + $routeParams.id).then(function(res) {
      $scope.equipment = res.data.data;
      loadPriceHistory();
      loadReviews();
    }).catch(function() {
      Toast.error('Equipment not found');
    }).finally(function() {
      $scope.loading = false;
    });
  }

  function loadReviews() {
    $scope.reviews = [];
    Api.get('/equipment/' + $routeParams.id + '/reviews').then(function(res) {
      $scope.reviews = res.data.data;
    });
  }

  function loadPriceHistory() {
    Api.get('/equipment/' + $routeParams.id + '/price-history').then(function(res) {
      $scope.priceHistory = res.data.data;
      $scope.initChart();
    });
  }

  $scope.calculatePrice = function() {
    if (!$scope.eventDate) return;
    $scope.loadingPrice = true;
    $scope.pricing = null;
    Api.get('/equipment/' + $routeParams.id + '/price?event_date=' + $scope.eventDate)
      .then(function(res) {
        $scope.pricing = res.data.data;
      })
      .catch(function(err) {
        Toast.error('Pricing error: ' + (err.data?.message || 'Calculation failed'));
      })
      .finally(function() {
        $scope.loadingPrice = false;
      });
  };

  $scope.addToCart = function() {
    if (!$scope.equipment) return;
    var priceToUse = ($scope.pricing && $scope.pricing.final_optimal_price) 
        ? parseFloat($scope.pricing.final_optimal_price) 
        : parseFloat($scope.equipment.current_price);
    
    var item = Object.assign({}, $scope.equipment, { algorithm_price: priceToUse });
    Cart.add(item, 1);
    
    if ($scope.eventDate) {
      Cart.setEventDate($scope.eventDate);
    }
    
    Toast.success($scope.equipment.name + ' added to booking');
  };

  $scope.isInCart = function() {
    return $scope.equipment && Cart.has($scope.equipment.id);
  };

  $scope.initChart = function() {
    if (!$scope.priceHistory || $scope.priceHistory.length === 0) return;
    
    // Defer chart init to ensure DOM canvas mounts
    setTimeout(function() {
      var ctx = document.getElementById('priceHistoryChart');
      if (!ctx) return;
      
      var dataRows = angular.copy($scope.priceHistory).reverse();
      var chartLabels = dataRows.map(function(r) { return new Date(r.changed_at).toLocaleDateString(undefined, {month:'short', day:'numeric'}); });
      var chartData = dataRows.map(function(r) { return r.new_price; });

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Algo Price',
            data: chartData,
            borderColor: '#7c6ff7',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#7c6ff7',
            pointBorderColor: '#080810',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { grid: { color: '#252538' }, ticks: { color: '#9090b0', callback: function(v) { return '₹' + v; } } },
            x: { grid: { display: false }, ticks: { color: '#9090b0', maxTicksLimit: 6 } }
          },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#171726', titleColor: '#eeeef8', bodyColor: '#7c6ff7' } }
        }
      });
    }, 50);
  };

  loadDetail();
}]);
