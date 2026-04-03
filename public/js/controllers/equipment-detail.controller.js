'use strict';
angular.module('stageAlpha')
.controller('EquipmentDetailCtrl', ['$scope', '$routeParams', '$http', '$rootScope', 'AuthService', 'CartService', 'ToastService',
function($scope, $routeParams, $http, $rootScope, AuthService, CartService, ToastService) {
  $scope.loading = true;
  $scope.error = false;
  $scope.equipment = {};
  $scope.priceHistory = [];
  $scope.reviews = [];
  $scope.isLoggedIn = AuthService.isLoggedIn();
  $scope.surgePct = 0;

  var catMap = {
    'PA Systems':      { icon: '🔊', cls: 'cat-sound' },
    'DJ Equipment':    { icon: '🎧', cls: 'cat-dj' },
    'Stage Lighting':  { icon: '💡', cls: 'cat-light' },
    'Microphones':     { icon: '🎤', cls: 'cat-mic' },
    'Cables & Stands': { icon: '🔌', cls: 'cat-cable' }
  };
  $scope.getCatClass = function(n) { return (catMap[n] || {}).cls || 'cat-default'; };
  $scope.getCatIcon = function(n) { return (catMap[n] || {}).icon || '🎵'; };

  var eqId = $routeParams.id;

  // Load equipment detail
  $http.get('/api/v1/equipment/' + eqId).then(function(res) {
    $scope.equipment = res.data.data || res.data;
    $scope.surgePct = (($scope.equipment.current_price - $scope.equipment.base_price) / $scope.equipment.base_price * 100);
    $scope.loading = false;

    // Load price history
    $http.get('/api/v1/pricing/history/' + eqId).then(function(res2) {
      $scope.priceHistory = res2.data.data || res2.data || [];
      if ($scope.priceHistory.length > 0) {
        setTimeout(function() { renderPriceChart(); }, 100);
      }
    }).catch(function() {});

    // Load reviews
    $http.get('/api/v1/equipment/' + eqId + '/reviews').then(function(res3) {
      $scope.reviews = res3.data.data || res3.data || [];
    }).catch(function() {});
  }).catch(function() {
    $scope.loading = false;
    $scope.error = true;
  });

  $scope.addToCart = function() {
    CartService.add($scope.equipment);
    $rootScope.$broadcast('cart:updated');
    ToastService.show($scope.equipment.name + ' added to cart', 'success');
  };

  function renderPriceChart() {
    var ctx = document.getElementById('priceChart');
    if (!ctx) return;
    var labels = $scope.priceHistory.map(function(p) {
      return new Date(p.changed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    var data = $scope.priceHistory.map(function(p) { return parseFloat(p.new_price); });

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Price (₹)',
          data: data,
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108,99,255,0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6c63ff',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,240,245,0.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(240,240,245,0.4)', font: { size: 11 }, callback: function(v) { return '₹' + v; } } }
        }
      }
    });
  }
}]);
