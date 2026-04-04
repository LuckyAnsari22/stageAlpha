'use strict';
angular.module('stageAlpha')
.controller('AdminDiagnosticCtrl', ['$scope', '$http', 'AuthService', 'ToastService',
function($scope, $http, AuthService, ToastService) {
  
  // Check auth
  if (!AuthService.isAdmin()) {
    $scope.error = 'Not authenticated as admin';
    return;
  }

  $scope.currentUser = AuthService.getUser();
  $scope.diagnostics = {
    authStatus: 'Logged in as: ' + $scope.currentUser.name + ' (' + $scope.currentUser.email + ')',
    tests: []
  };

  // Test 1: Dashboard API
  function testDashboard() {
    return $http.get('/api/v1/analytics/dashboard')
      .then(function(res) {
        return {
          name: 'Dashboard API',
          status: 'SUCCESS',
          data: res.data,
          statusCode: res.status
        };
      })
      .catch(function(err) {
        return {
          name: 'Dashboard API',
          status: 'FAILED',
          error: err.data || err.statusText,
          statusCode: err.status
        };
      });
  }

  // Test 2: Bookings API
  function testBookings() {
    return $http.get('/api/v1/bookings')
      .then(function(res) {
        return {
          name: 'Bookings API',
          status: 'SUCCESS',
          data: res.data,
          statusCode: res.status
        };
      })
      .catch(function(err) {
        return {
          name: 'Bookings API',
          status: 'FAILED',
          error: err.data || err.statusText,
          statusCode: err.status
        };
      });
  }

  // Test 3: Equipment API
  function testEquipment() {
    return $http.get('/api/v1/equipment')
      .then(function(res) {
        return {
          name: 'Equipment API',
          status: 'SUCCESS',
          data: res.data,
          statusCode: res.status
        };
      })
      .catch(function(err) {
        return {
          name: 'Equipment API',
          status: 'FAILED',
          error: err.data || err.statusText,
          statusCode: err.status
        };
      });
  }

  // Run all tests
  $scope.runTests = function() {
    $scope.testing = true;
    Promise.all([
      testDashboard(),
      testBookings(),
      testEquipment()
    ]).then(function(results) {
      $scope.diagnostics.tests = results;
      $scope.testing = false;
      $scope.$apply();
    });
  };

  // Run tests on load
  $scope.runTests();

}]);
