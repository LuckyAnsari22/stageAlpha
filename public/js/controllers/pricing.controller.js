'use strict';
angular.module('stageAlpha')
.controller('PricingCtrl', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  $scope.equipment = [];
  $scope.pricingData = [];
  $scope.selectedEq = {};
  $scope.selectedEqId = '';
  $scope.recalculating = false;

  $http.get('/api/v1/equipment').then(function(res) {
    $scope.equipment = res.data.data || res.data || [];
  });

  $http.get('/api/v1/equipment').then(function(res) {
    $scope.pricingData = (res.data.data || res.data || []).map(function(e) {
      return { equipment_id: e.id, name: e.name, base_price: e.base_price, current_price: e.current_price };
    });
  }).catch(function() {});

  $scope.loadPricingData = function() {
    if (!$scope.selectedEqId) return;
    $http.get('/api/v1/pricing/estimate/' + $scope.selectedEqId + '?event_date=' + new Date().toISOString().split('T')[0]).then(function(res) {
      var d = res.data.data || res.data;
      $scope.selectedEq = {
        base_price: d.base_price,
        marginal_cost: d.marginal_cost,
        elasticity: d.elasticity,
        lerner_price: d.lerner_price,
        seasonal_mult: d.seasonal_multiplier,
        optimal_price: d.final_optimal_price
      };
    }).catch(function() {});
  };

  $scope.selectEquipment = function(item) {
    $scope.selectedEqId = item.equipment_id;
    $scope.loadPricingData();
  };

  $scope.recalculateAll = function() {
    $scope.recalculating = true;
    $http.post('/api/v1/pricing/update-all').then(function() {
      ToastService.show('All prices recalculated!', 'success');
      $scope.recalculating = false;
      $http.get('/api/v1/equipment').then(function(res) {
        $scope.pricingData = (res.data.data || res.data || []).map(function(e) {
          return { equipment_id: e.id, name: e.name, base_price: e.base_price, current_price: e.current_price };
        });
      });
    }).catch(function() {
      ToastService.show('Recalculation failed', 'error');
      $scope.recalculating = false;
    });
  };
}]);
