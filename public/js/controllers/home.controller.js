angular.module('stageAlpha').controller('HomeCtrl',
['$scope', 'ApiService', 'AuthService',
function($scope, Api, Auth) {
  $scope.isAdmin = Auth.isAdmin();
  $scope.stats = {};
  $scope.featuredEquipment = [];
  $scope.loadingStats = false;
  $scope.loadingEq = true;

  if ($scope.isAdmin) {
    $scope.loadingStats = true;
    Api.get('/analytics/dashboard').then(function(res) {
      $scope.stats = res.data.data;
    }).finally(function() { $scope.loadingStats = false; });
  }

  Api.get('/equipment?limit=6&page=1').then(function(res) {
    $scope.featuredEquipment = res.data.data;
  }).finally(function() { $scope.loadingEq = false; });
}]);
