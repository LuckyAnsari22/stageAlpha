'use strict';
angular.module('stageAlpha')
.controller('AuthCtrl', ['$scope', '$location', '$http', 'AuthService', 'ToastService',
function($scope, $location, $http, AuthService, ToastService) {
  $scope.credentials = {};
  $scope.error = null;
  $scope.submitting = false;
  $scope.showPassword = false;
  $scope.success = false;
  $scope.resetEmail = '';

  $scope.login = function() {
    $scope.error = null;
    $scope.submitting = true;
    $http.post('/api/v1/auth/login', {
      email: $scope.credentials.email,
      password: $scope.credentials.password
    }).then(function(res) {
      var data = res.data.data;
      AuthService.setToken(data.access_token);
      AuthService.setUser(data.user);
      ToastService.show('Welcome back, ' + data.user.name + '!', 'success');
      $location.path('/');
    }).catch(function(err) {
      $scope.error = (err.data && err.data.message) || 'Invalid credentials';
      $scope.submitting = false;
    });
  };

  $scope.register = function() {
    if ($scope.credentials.password !== $scope.credentials.confirmPassword) {
      $scope.error = 'Passwords do not match';
      return;
    }
    $scope.error = null;
    $scope.submitting = true;
    $http.post('/api/v1/auth/register', {
      name: $scope.credentials.name,
      email: $scope.credentials.email,
      password: $scope.credentials.password,
      phone: $scope.credentials.phone || null
    }).then(function(res) {
      var data = res.data.data;
      AuthService.setToken(data.access_token);
      AuthService.setUser(data.user);
      ToastService.show('Account created! Welcome to StageAlpha.', 'success');
      $location.path('/');
    }).catch(function(err) {
      $scope.error = (err.data && err.data.message) || 'Registration failed';
      $scope.submitting = false;
    });
  };

  $scope.resetPassword = function() {
    $scope.submitting = true;
    // Simulate — in production this would send an email
    setTimeout(function() {
      $scope.$apply(function() {
        $scope.success = true;
        $scope.submitting = false;
      });
    }, 1000);
  };

  $scope.loginWithGoogle = function() {
    $scope.submittingGoogle = true;
    $scope.error = null;
    
    // For demo/academic purposes, we simulate the OAuth popup and direct fallback
    // In production, attach the real Google Identity SDK and pass the id_token
    setTimeout(function() {
      $scope.$apply(function() {
        $http.post('/api/v1/auth/google', {
          token: 'mock-google-id-token'
        }).then(function(res) {
          var data = res.data.data;
          AuthService.setToken(data.access_token);
          AuthService.setUser(data.user);
          ToastService.show('Successfully logged in with Google!', 'success');
          $location.path('/');
        }).catch(function(err) {
          $scope.error = (err.data && err.data.message) || 'Google authentication failed';
          $scope.submittingGoogle = false;
        });
      });
    }, 1000);
  };
}]);
