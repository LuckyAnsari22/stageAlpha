/**
 * HOMECONTROLLER — Dashboard / landing page
 * 
 * Shows different content based on auth state:
 * - Guest: Hero + features
 * - Customer: Dashboard with booking history
 * - Admin: KPI overview + quick links
 */

angular.module('stageAlpha')
  .controller('HomeController',
    ['$scope', '$location', '$rootScope', 'AuthService', 'ApiService', 'ToastService',
      function($scope, $location, $rootScope, AuthService, ApiService, ToastService) {

      $rootScope.pageTitle = 'Dashboard';

      // State
      $scope.isLoggedIn = AuthService.isLoggedIn();
      $scope.isAdmin = AuthService.isAdmin();
      $scope.currentUser = AuthService.getUser();
      $scope.loading = true;
      $scope.error = null;
      $scope.stats = null;
      $scope.featuredEquipment = [];

      // Initialization
      function init() {
        if ($scope.isAdmin) {
          loadAdminDashboard();
        } else if ($scope.isLoggedIn) {
          loadUserProfile();
        } else {
          loadFeaturedEquipment();
        }
      }

      // Admin: load analytics dashboard
      function loadAdminDashboard() {
        ApiService.get('/analytics/dashboard')
          .then(function(response) {
            if (response.success) {
              $scope.stats = response.data;
            }
            $scope.loading = false;
          })
          .catch(function() {
            $scope.loading = false;
          });
      }

      // Customer: load profile with booking stats
      function loadUserProfile() {
        ApiService.get('/customers/me')
          .then(function(response) {
            if (response.success) {
              $scope.userProfile = response.data;
            }
            $scope.loading = false;
          })
          .catch(function() {
            $scope.loading = false;
          });
      }

      // Guest: load featured equipment
      function loadFeaturedEquipment() {
        ApiService.get('/equipment', { availableOnly: true })
          .then(function(response) {
            if (response.success) {
              $scope.featuredEquipment = (response.data || []).slice(0, 6);
            }
            $scope.loading = false;
          })
          .catch(function() {
            $scope.loading = false;
          });
      }

      // Navigation helpers
      $scope.browseEquipment = function() { $location.path('/equipment'); };
      $scope.viewBooking = function(id) { $location.path('/booking/' + id); };
      $scope.goToAdmin = function() { $location.path('/admin'); };
      $scope.goToPricing = function() { $location.path('/admin/pricing'); };
      $scope.goToBacktest = function() { $location.path('/admin/backtest'); };

      init();
    }]);
