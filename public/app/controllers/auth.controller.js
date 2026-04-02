angular.module('stageAlpha').controller('AuthState',
    ['$scope', '$location', 'AuthService',
    function($scope, $location, AuthService) {

    $scope.credentials = {};
    $scope.error = '';
    $scope.loading = false;

    $scope.login = function() {
        $scope.loading = true;
        $scope.error = '';
        
        AuthService.login($scope.credentials).then(function(res) {
            AuthService.saveToken(res.data.data.token, res.data.data.user);
            $scope.loading = false;
            
            if (res.data.data.user.role === 'admin') {
                $location.path('/admin');
            } else {
                $location.path('/equipment');
            }
        }).catch(function(err) {
            $scope.loading = false;
            $scope.error = err.data ? err.data.message : 'Login failed. Please try again.';
        });
    };

    $scope.register = function() {
        $scope.loading = true;
        $scope.error = '';
        
        AuthService.register($scope.credentials).then(function(res) {
            AuthService.saveToken(res.data.data.token, res.data.data.user);
            $scope.loading = false;
            $location.path('/equipment');
        }).catch(function(err) {
            $scope.loading = false;
            $scope.error = err.data ? err.data.message : 'Registration failed. Please try again.';
        });
    };
}]);
