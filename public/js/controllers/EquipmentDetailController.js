/**
 * EQUIPMENTDETAILCONTROLLER
 * 
 * Show detail for a single equipment item with pricing breakdown.
 * Uses correct API endpoints:
 *   GET /api/v1/equipment/:id        — Equipment details
 *   GET /api/v1/pricing/history/:id  — Price history (admin)
 *   POST /api/v1/pricing/calculate/:id — Compute optimal price
 */

angular.module('stageAlpha')
  .controller('EquipmentDetailController', [
    '$scope', '$routeParams', '$location',
    'ApiService', 'CartService', 'SocketService', 'ToastService',
    function($scope, $routeParams, $location,
             ApiService, CartService, SocketService, ToastService) {

      // ===== STATE =====
      $scope.equipmentId = $routeParams.id;
      $scope.equipment = null;
      $scope.error = null;
      $scope.loading = true;
      $scope.selectedQty = 1;

      // ===== LOAD EQUIPMENT DETAIL =====
      function loadEquipment() {
        $scope.loading = true;

        ApiService.get('/equipment/' + $scope.equipmentId)
          .then(function(response) {
            if (response.success) {
              $scope.equipment = response.data;
            } else {
              $scope.error = response.message || 'Equipment not found';
            }
            $scope.loading = false;
          })
          .catch(function(err) {
            $scope.error = err.message || 'Failed to load equipment';
            $scope.loading = false;
          });
      }

      // ===== QUANTITY CONTROLS =====
      $scope.incrementQty = function() {
        if ($scope.equipment && $scope.selectedQty < $scope.equipment.stock_qty) {
          $scope.selectedQty++;
        }
      };

      $scope.decrementQty = function() {
        if ($scope.selectedQty > 1) {
          $scope.selectedQty--;
        }
      };

      // ===== CART =====
      $scope.addToCart = function() {
        if (!$scope.equipment) return;

        CartService.add({
          equipment_id: $scope.equipment.id,
          name: $scope.equipment.name,
          price: parseFloat($scope.equipment.current_price),
          qty: $scope.selectedQty
        });

        ToastService.success($scope.equipment.name + ' added to cart');
      };

      // ===== REAL-TIME PRICE UPDATES =====
      SocketService.on('price:updated', function(data) {
        if (data.equipment_id === parseInt($scope.equipmentId) && $scope.equipment) {
          $scope.equipment.current_price = data.new_price;
          $scope.$apply();
          ToastService.info('Price updated to ₹' + data.new_price);
        }
      });

      // ===== CLEANUP =====
      $scope.$on('$destroy', function() {
        SocketService.off('price:updated');
      });

      // ===== INIT =====
      loadEquipment();
    }
  ]);
