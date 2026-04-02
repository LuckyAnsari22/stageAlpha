angular.module('stageAlpha').controller('NavController',
['$scope', '$rootScope', 'AuthService', 'CartService',
function($scope, $root, Auth, Cart) {
  $scope.isLoggedIn  = Auth.isLoggedIn();
  $scope.isAdmin     = Auth.isAdmin();
  $scope.currentUser = Auth.getUser();
  $scope.cartCount   = Cart.count();

  $scope.$on('cart:updated', function() { $scope.cartCount = Cart.count(); });
  $scope.$watch(function() { return Auth.isLoggedIn(); }, function(v) {
    $scope.isLoggedIn = v;
    $scope.isAdmin    = Auth.isAdmin();
    $scope.currentUser = Auth.getUser();
  });

  $scope.logout = function() { Auth.logout(); };
}]);
