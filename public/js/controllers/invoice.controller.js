'use strict';
angular.module('stageAlpha')
.controller('InvoiceCtrl', ['$scope', '$routeParams', '$http', 'AuthService',
function($scope, $routeParams, $http, AuthService) {
  $scope.booking = null;
  $scope.items = [];
  $scope.customer = AuthService.getUser() || {};
  $scope.payment = null;

  var id = $routeParams.id;
  $http.get('/api/v1/bookings/' + id).then(function(res) {
    var data = res.data.data || res.data;
    $scope.booking = data;
    $scope.items = data.items || [];
    $scope.payment = data.payment || null;
  });
}]);
