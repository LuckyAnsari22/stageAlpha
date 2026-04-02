angular.module('stageAlpha').controller('AuthCtrl',
['$scope', '$location', '$rootScope', 'AuthService', 'ToastService',
function($scope, $location, $root, Auth, Toast) {
  $scope.loginData = {};
  $scope.registerData = {};
  $scope.loading = false;
  $scope.errors = {};
  $scope.showPwd = false;

  $scope.togglePwd = function() { $scope.showPwd = !$scope.showPwd; };

  $scope.login = function() {
    if ($scope.loading) return;
    $scope.loading = true; $scope.errors = {};
    Auth.login($scope.loginData.email, $scope.loginData.password)
      .then(function(data) {
        $root.currentUser = data.user;
        $root.isLoggedIn  = true;
        $root.isAdmin     = data.user.role === 'admin';
        Toast.success('Welcome back, ' + data.user.name + '!');
        $location.path(data.user.role === 'admin' ? '/admin' : '/');
      })
      .catch(function(err) {
        $scope.errors.general = err.data?.message || 'Login failed';
        Toast.error($scope.errors.general);
      })
      .finally(function() { $scope.loading = false; });
  };

  $scope.checkStrength = function() {
    var p = $scope.registerData.password || '';
    return {
      len: p.length >= 8,
      upper: /[A-Z]/.test(p),
      num: /[0-9]/.test(p),
      spec: /[@$!%*?&]/.test(p)
    };
  };

  $scope.register = function() {
    if ($scope.loading) return;
    if ($scope.registerData.password !== $scope.registerData.confirmPassword) {
      $scope.errors.confirmPassword = 'Passwords do not match'; return;
    }
    $scope.loading = true; $scope.errors = {};
    Auth.register($scope.registerData)
      .then(function(data) {
        $root.currentUser = data.user; $root.isLoggedIn = true;
        Toast.success('Account created! Welcome to StageAlpha.');
        $location.path('/');
      })
      .catch(function(err) {
        var errors = err.data?.errors || [];
        errors.forEach(function(e) { $scope.errors[e.path] = e.msg; });
        $scope.errors.general = err.data?.message || 'Registration failed';
      })
      .finally(function() { $scope.loading = false; });
  };
}]);
