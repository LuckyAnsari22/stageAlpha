'use strict';
angular.module('stageAlpha')
.controller('ComparisonCtrl', ['$scope', 'CartService', 'ToastService', '$rootScope',
function($scope, CartService, ToastService, $rootScope) {
  // Load compare list from localStorage
  var stored = localStorage.getItem('sa_compare');
  $scope.compareItems = stored ? JSON.parse(stored) : [];

  $scope.addToCart = function(item) {
    CartService.add(item);
    $rootScope.$broadcast('cart:updated');
    ToastService.show(item.name + ' added to cart', 'success');
  };
}]);
