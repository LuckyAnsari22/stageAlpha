'use strict';
angular.module('stageAlpha')
.controller('AvailabilityCtrl', ['$scope', '$http', 'CartService', 'ToastService', '$rootScope',
function($scope, $http, CartService, ToastService, $rootScope) {
  $scope.checkDate = null;
  $scope.selectedCategory = '';
  $scope.categories = [];
  $scope.availabilityResults = [];
  $scope.loading = false;

  var catMap = {
    'PA Systems': { icon: '🔊', cls: 'cat-sound' }, 'DJ Equipment': { icon: '🎧', cls: 'cat-dj' },
    'Stage Lighting': { icon: '💡', cls: 'cat-light' }, 'Microphones': { icon: '🎤', cls: 'cat-mic' },
    'Cables & Stands': { icon: '🔌', cls: 'cat-cable' }
  };
  $scope.getCatClass = function(n) { return (catMap[n] || {}).cls || 'cat-default'; };
  $scope.getCatIcon = function(n) { return (catMap[n] || {}).icon || '🎵'; };

  $http.get('/api/v1/categories').then(function(res) {
    $scope.categories = res.data.data || res.data || [];
  });

  $scope.checkAvailability = function() {
    if (!$scope.checkDate) return;
    $scope.loading = true;
    var url = '/api/v1/equipment?available_on=' + $scope.checkDate;
    if ($scope.selectedCategory) url += '&category_id=' + $scope.selectedCategory;
    $http.get(url).then(function(res) {
      $scope.availabilityResults = (res.data.data || res.data || []).map(function(eq) {
        eq.available_qty = eq.stock_qty;
        return eq;
      });
      $scope.loading = false;
    }).catch(function() { $scope.loading = false; });
  };

  $scope.addToCart = function(eq) {
    CartService.add(eq);
    $rootScope.$broadcast('cart:updated');
    ToastService.show(eq.name + ' added to cart', 'success');
  };
}]);
