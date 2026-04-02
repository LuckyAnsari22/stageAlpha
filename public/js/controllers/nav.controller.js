angular.module('stageAlpha').controller('NavController',
['$scope', '$rootScope', 'AuthService', 'CartService', 'ToastService', 'SocketService',
function($scope, $root, Auth, Cart, Toast, Socket) {
  $scope.isLoggedIn  = Auth.isLoggedIn();
  $scope.isAdmin     = Auth.isAdmin();
  $scope.currentUser = Auth.getUser();
  $scope.cartCount   = Cart.count();

  $scope.$on('cart:updated', function() { $scope.cartCount = Cart.count(); });
  $scope.$watch(function() { return Auth.isLoggedIn(); }, function(v) {
    if (v && !$scope.isLoggedIn) Socket.connect();
    $scope.isLoggedIn = v;
    $scope.isAdmin    = Auth.isAdmin();
    $scope.currentUser = Auth.getUser();
  });

  // Listen for live operational intel (WebSockets)
  Socket.on('booking:new', function(data) {
    if ($scope.isAdmin) {
      Toast.success('NEW SECURED OP: ' + data.type.toUpperCase() + ' // YIELD: ₹' + data.total);
    }
  });

  $scope.logout = function() { Auth.logout(); Socket.disconnect(); };
}]);
