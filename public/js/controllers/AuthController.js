/**
 * AUTH CONTROLLER
 * 
 * Handles authentication flows: login and registration.
 * Uses AuthService for token management (login/register handle everything).
 */

angular.module('stageAlpha')
  .controller('AuthController', [
    '$scope',
    '$location',
    '$timeout',
    'AuthService',
    'ToastService',
    function($scope, $location, $timeout, AuthService, ToastService) {

      // ========================================================================
      // STATE INITIALIZATION
      // ========================================================================

      $scope.credentials = {
        name: '',
        email: '',
        password: '',
        phone: ''
      };

      $scope.loading = false;
      $scope.error = null;

      // ========================================================================
      // LOGIN
      // ========================================================================

      $scope.login = function() {
        if (!$scope.credentials.email || !$scope.credentials.password) {
          $scope.error = 'Please enter email and password';
          return;
        }

        $scope.loading = true;
        $scope.error = null;

        AuthService.login($scope.credentials.email, $scope.credentials.password)
          .then(function(user) {
            ToastService.success('Welcome back, ' + user.name + '!');

            // Check for redirect query param
            var redirect = $location.search().redirect || '/';
            $location.search('redirect', null);
            $location.path(redirect);
          })
          .catch(function(err) {
            $scope.error = typeof err === 'string' ? err : (err.message || 'Login failed');
            $scope.loading = false;
          });
      };

      // ========================================================================
      // REGISTER
      // ========================================================================

      $scope.register = function() {
        if (!$scope.credentials.name || !$scope.credentials.email || !$scope.credentials.password) {
          $scope.error = 'Please complete all required fields';
          return;
        }

        $scope.loading = true;
        $scope.error = null;

        AuthService.register(
          $scope.credentials.email,
          $scope.credentials.password,
          $scope.credentials.name,
          $scope.credentials.phone
        )
          .then(function(user) {
            ToastService.success('Account created! Welcome, ' + user.name);
            $location.path('/');
          })
          .catch(function(err) {
            $scope.error = typeof err === 'string' ? err : (err.message || 'Registration failed');
            $scope.loading = false;
          });
      };

    }
  ]);
