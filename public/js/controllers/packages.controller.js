'use strict';
angular.module('stageAlpha')
.controller('PackagesCtrl', ['$scope', '$http',
function($scope, $http) {
  $scope.packages = [];
  $scope.loading = true;
  $http.get('/api/v1/packages').then(function(res) {
    $scope.packages = res.data.data || res.data || [];
    $scope.loading = false;
  }).catch(function() { $scope.loading = false; });
}])
.controller('PackageDetailCtrl', ['$scope', '$routeParams', '$http', '$location', 'CartService', 'ToastService', '$rootScope',
function($scope, $routeParams, $http, $location, CartService, ToastService, $rootScope) {
  $scope.loading = true;
  $scope.error = false;
  $scope.package = {};
  $scope.packageItems = [];
  $scope.packageTotal = 0;
  $scope.packageSavings = 0;

  $http.get('/api/v1/packages/' + $routeParams.slug).then(function(res) {
    var data = res.data.data || res.data;
    $scope.package = data;
    $scope.packageItems = data.items || [];
    var rawTotal = $scope.packageItems.reduce(function(s, i) { return s + (i.current_price * i.qty); }, 0);
    $scope.packageSavings = rawTotal * (data.discount_pct || 0) / 100;
    $scope.packageTotal = rawTotal - $scope.packageSavings;
    $scope.loading = false;
  }).catch(function() { $scope.loading = false; $scope.error = true; });

  $scope.bookPackage = function() {
    $scope.packageItems.forEach(function(item) {
      CartService.add({ id: item.equipment_id || item.id, name: item.name, current_price: item.current_price, category_name: item.category_name || '', stock_qty: 99 }, item.qty);
    });
    $rootScope.$broadcast('cart:updated');
    ToastService.show('Package added to cart!', 'success');
    $location.path('/booking');
  };
}]);
