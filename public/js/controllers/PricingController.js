/**
 * PRICING CONTROLLER - Simulator and Batch Update
 */

angular.module('stageAlpha')
  .controller('PricingController', [
    '$scope', '$location', 'ApiService', 'ToastService', 'SocketService',
    function($scope, $location, ApiService, ToastService, SocketService) {

      // ===== STATE =====
      $scope.equipmentList = [];
      $scope.selectedEquipmentId = null;
      $scope.targetDate = null;
      $scope.result = null;

      $scope.batchLoading = false;
      $scope.batchProgress = 0;

      // ===== INIT =====
      function loadEquipment() {
        ApiService.get('/equipment')
          .then(function(response) {
            $scope.equipmentList = response.data.data || response.data;
          })
          .catch(function(err) {});
      }

      // ===== CALCULATE PRICE =====
      $scope.calculatePrice = function() {
        if (!$scope.selectedEquipmentId || !$scope.targetDate) {
          $scope.result = null;
          return;
        }

        // POST /pricing/calculate/:id
        ApiService.post('/pricing/calculate/' + $scope.selectedEquipmentId, {
          event_date: $scope.targetDate
        })
          .then(function(response) {
            if (response.success) {
              $scope.result = response.data;
            }
          })
          .catch(function(err) {
            ToastService.error(err.data?.message || 'Calculation failed');
            $scope.result = null;
          });
      };

      // ===== BATCH UPDATE =====
      $scope.batchUpdate = function() {
        if (!confirm('Update ALL equipment prices based on latest data?')) return;

        $scope.batchLoading = true;
        $scope.batchProgress = 0;

        ApiService.post('/pricing/update-all', {})
          .then(function(response) {
            ToastService.info(response.message || 'Batch update started...');
          })
          .catch(function(err) {
            ToastService.error(err.data?.message || 'Batch update failed');
            $scope.batchLoading = false;
          });
      };

      // Real-time progress
      SocketService.on('backtest:progress', function(data) {
        if (data.stage === 'pricing:batch') {
          $scope.batchProgress = data.progress;
        } else if (data.stage === 'pricing:complete') {
          $scope.batchProgress = 100;
          $scope.batchLoading = false;
          ToastService.success('Batch update complete!');
        }
        $scope.$apply();
      });

      $scope.$on('$destroy', function() {
        SocketService.off('backtest:progress');
      });

      loadEquipment();
    }
  ]);
