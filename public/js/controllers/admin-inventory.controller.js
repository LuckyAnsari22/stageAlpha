'use strict';
angular.module('stageAlpha')
.controller('AdminInventoryCtrl', ['$scope', '$http', '$timeout', 'ToastService',
function($scope, $http, $timeout, ToastService) {
  
  $scope.isLoading = true;
  $scope.equipment = [];
  $scope.selectedItem = null;
  $scope.showModal = false;
  $scope.isEditing = false;

  // Form for adding/editing
  $scope.form = {
    name: '',
    category: '',
    description: '',
    price_per_day: 0,
    quantity: 0,
    low_stock_threshold: 5
  };

  // Categories
  $scope.categories = ['Audio', 'Lighting', 'Stage', 'Video', 'Other'];

  // Load inventory
  function loadInventory() {
    $scope.isLoading = true;
    $http.get('/api/v1/equipment').then(function(res) {
      $scope.equipment = res.data.data || [];
      $scope.isLoading = false;
    }).catch(function(err) {
      ToastService.show('Error loading inventory: ' + (err.data?.message || 'Unknown error'), 'error');
      $scope.isLoading = false;
    });
  }

  // Initial load
  loadInventory();

  // Refresh
  $scope.refreshInventory = function() {
    loadInventory();
  };

  // View item details
  $scope.viewItem = function(item) {
    $scope.selectedItem = angular.copy(item);
    $scope.isEditing = false;
    $scope.showModal = true;
  };

  // Edit item
  $scope.editItem = function(item) {
    if (!item) item = $scope.selectedItem;
    $scope.form = angular.copy(item);
    $scope.isEditing = true;
  };

  // Save item
  $scope.saveItem = function() {
    if (!$scope.form.name) {
      ToastService.show('Please enter equipment name', 'error');
      return;
    }

    var method = $scope.form.id ? 'PUT' : 'POST';
    var url = $scope.form.id ? ('/api/v1/equipment/' + $scope.form.id) : '/api/v1/equipment';
    
    $http({
      method: method,
      url: url,
      data: $scope.form
    }).then(function() {
      ToastService.show($scope.form.id ? 'Equipment updated!' : 'Equipment added!', 'success');
      loadInventory();
      $scope.closeModal();
    }).catch(function(err) {
      ToastService.show('Error: ' + (err.data?.message || 'Failed to save'), 'error');
    });
  };

  // Delete item
  $scope.deleteItem = function(item) {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    $http.delete('/api/v1/equipment/' + item.id)
      .then(function() {
        ToastService.show('Equipment deleted', 'success');
        loadInventory();
      })
      .catch(function(err) {
        ToastService.show('Error: ' + (err.data?.message || 'Failed to delete'), 'error');
      });
  };

  // Open add modal
  $scope.openAddModal = function() {
    $scope.form = {
      name: '',
      category: '',
      description: '',
      price_per_day: 0,
      quantity: 0,
      low_stock_threshold: 5
    };
    $scope.isEditing = true;
    $scope.selectedItem = null;
    $scope.showModal = true;
  };

  // Close modal
  $scope.closeModal = function() {
    $scope.showModal = false;
    $scope.selectedItem = null;
    $scope.isEditing = false;
    $scope.form = {
      name: '',
      category: '',
      description: '',
      price_per_day: 0,
      quantity: 0,
      low_stock_threshold: 5
    };
  };

  // Check if low stock
  $scope.isLowStock = function(item) {
    return item.quantity <= (item.low_stock_threshold || 5);
  };

  // Get stock color
  $scope.getStockColor = function(item) {
    if (item.quantity === 0) return '#ff3333';
    if (item.quantity <= (item.low_stock_threshold || 5)) return '#ffa500';
    return '#00ff00';
  };

}]);
