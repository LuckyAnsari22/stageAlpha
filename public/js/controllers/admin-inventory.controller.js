'use strict';
angular.module('stageAlpha')
.controller('AdminInventoryCtrl', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  
  console.log('=== AdminInventoryCtrl Initialized ===');
  
  // ===== STATE =====
  $scope.isLoading = false;
  $scope.isSaving = false;
  $scope.equipment = [];
  $scope.selectedItem = null;
  $scope.showModal = false;
  $scope.isEditing = false;
  
  // ===== FORM MODEL =====
  $scope.form = {
    name: '',
    category: '',
    description: '',
    price_per_day: 0,
    quantity: 0,
    low_stock_threshold: 5
  };
  
  $scope.categories = ['PA Systems', 'DJ Equipment', 'Stage Lighting', 'Microphones', 'Cables & Stands'];

  // ===== LOAD INVENTORY =====
  var loadInventory = function() {
    console.log('[Inventory] Loading equipment...');
    $scope.isLoading = true;
    
    $http.get('/api/v1/equipment')
      .then(function(response) {
        console.log('[Inventory] Success:', response.data);
        var rawData = response.data.data || response.data || [];
        
        // Map API fields to display fields
        $scope.equipment = rawData.map(function(item) {
          return {
            id: item.id,
            name: item.name,
            category: getCategoryName(item.category_id),
            category_id: item.category_id,
            description: item.description,
            price_per_day: item.base_price || item.current_price || 0,
            base_price: item.base_price,
            current_price: item.current_price,
            quantity: item.stock_qty || 0,
            stock_qty: item.stock_qty,
            specs: item.specs,
            low_stock_threshold: (item.specs && typeof item.specs === 'object' && item.specs.low_stock_threshold) ? item.specs.low_stock_threshold : 5
          };
        });
        
        console.log('[Inventory] Equipment count:', $scope.equipment.length);
        $scope.isLoading = false;
      })
      .catch(function(error) {
        console.error('[Inventory] Error:', error);
        $scope.isLoading = false;
        var msg = 'Error loading inventory';
        if (error.data && error.data.message) msg += ': ' + error.data.message;
        if (error.statusText) msg += ' (' + error.statusText + ')';
        ToastService.show(msg, 'error');
      });
  };

  // Initial load
  loadInventory();

  // ===== ACTIONS =====
  
  $scope.refreshInventory = function() {
    console.log('[Inventory] Refresh clicked');
    loadInventory();
  };

  $scope.openAddModal = function() {
    console.log('[Inventory] Open add modal');
    $scope.form = {
      name: '',
      category: '',
      description: '',
      price_per_day: 0,
      quantity: 0,
      low_stock_threshold: 5
    };
    $scope.selectedItem = null;
    $scope.isEditing = true;
    $scope.showModal = true;
  };

  $scope.viewItem = function(item) {
    console.log('[Inventory] View item:', item);
    $scope.selectedItem = angular.copy(item);
    $scope.isEditing = false;
    $scope.showModal = true;
  };

  $scope.editItem = function(item) {
    console.log('[Inventory] Edit item:', item);
    if (!item) item = $scope.selectedItem;
    if (!item) {
      console.warn('[Inventory] No item selected for editing');
      ToastService.show('No item selected', 'error');
      return;
    }
    
    // Map API fields back to form fields
    $scope.form = {
      id: item.id,
      name: item.name,
      category: getCategoryName(item.category_id),  // Convert ID back to name
      description: item.description,
      price_per_day: item.base_price || item.current_price || 0,
      quantity: item.stock_qty || 0,
      low_stock_threshold: (item.specs && typeof item.specs === 'object' && item.specs.low_stock_threshold) ? item.specs.low_stock_threshold : 5
    };
    
    $scope.selectedItem = item;
    $scope.isEditing = true;
    // Modal should already be open from viewItem or can be opened here
    if (!$scope.showModal) {
      $scope.showModal = true;
    }
  };

  $scope.saveItem = function() {
    console.log('[Inventory] Save item:', $scope.form);
    
    if (!$scope.form.name || $scope.form.name.trim() === '') {
      ToastService.show('Please enter equipment name', 'error');
      console.warn('[Inventory] Validation failed: name is empty');
      return;
    }

    if (!$scope.form.category || $scope.form.category.trim() === '') {
      ToastService.show('Please select a category', 'error');
      console.warn('[Inventory] Validation failed: category is empty', { category: $scope.form.category });
      return;
    }

    $scope.isSaving = true;
    var isNew = !$scope.form.id;
    var method = isNew ? 'POST' : 'PUT';
    var url = isNew ? '/api/v1/equipment' : '/api/v1/equipment/' + $scope.form.id;
    
    // Map form fields to API fields
    var categoryId = getCategoryId($scope.form.category);
    var apiData = {
      name: $scope.form.name,
      category_id: categoryId,
      description: $scope.form.description || '',
      base_price: parseInt($scope.form.price_per_day) || 0,
      current_price: parseInt($scope.form.price_per_day) || 0,
      stock_qty: parseInt($scope.form.quantity) || 0,
      specs: {
        low_stock_threshold: parseInt($scope.form.low_stock_threshold) || 5
      },
      image_url: '',
      is_active: true
    };
    
    console.log('[Inventory] Form:', $scope.form);
    console.log('[Inventory] Category ID mapped:', categoryId, 'from:', $scope.form.category);
    console.log('[Inventory] Saving:', method, url);
    console.log('[Inventory] API Data:', JSON.stringify(apiData, null, 2));
    
    $http({
      method: method,
      url: url,
      data: apiData
    })
      .then(function(response) {
        console.log('[Inventory] Save success:', response.data);
        $scope.isSaving = false;
        ToastService.show(isNew ? 'Equipment added!' : 'Equipment updated!', 'success');
        loadInventory();
        $scope.closeModal();
      })
      .catch(function(error) {
        console.error('[Inventory] Save error:', error);
        $scope.isSaving = false;
        var msg = 'Failed to save equipment';
        if (error.data && error.data.message) msg += ': ' + error.data.message;
        if (error.status === 400) msg = 'Invalid data: ' + (error.data && error.data.message ? error.data.message : 'Check all required fields');
        if (error.status === 500) msg = 'Server error: ' + (error.data && error.data.message ? error.data.message : 'Check category ID');
        console.error('[Inventory] Error details:', { status: error.status, message: error.data });
        ToastService.show(msg, 'error');
      });
  };
  
  // Helper to convert category name to ID
  var getCategoryId = function(categoryName) {
    var categoryMap = {
      'PA Systems': 1,
      'DJ Equipment': 2,
      'Stage Lighting': 3,
      'Microphones': 4,
      'Cables & Stands': 5
    };
    return categoryMap[categoryName] || 1;
  };

  $scope.deleteItem = function(item) {
    console.log('[Inventory] Delete item:', item);
    
    if (!item || !item.id) {
      console.warn('[Inventory] Cannot delete - no ID');
      ToastService.show('Invalid item', 'error');
      return;
    }

    if (!confirm('Delete "' + item.name + '"? This cannot be undone.')) {
      console.log('[Inventory] Delete cancelled');
      return;
    }

    console.log('[Inventory] Deleting ID:', item.id);
    $http.delete('/api/v1/equipment/' + item.id)
      .then(function(response) {
        console.log('[Inventory] Delete success:', response.data);
        ToastService.show('Equipment deleted', 'success');
        loadInventory();
      })
      .catch(function(error) {
        console.error('[Inventory] Delete error:', error);
        var msg = 'Failed to delete';
        if (error.data && error.data.message) msg += ': ' + error.data.message;
        ToastService.show(msg, 'error');
      });
  };

  $scope.closeModal = function() {
    console.log('[Inventory] Close modal');
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

  // ===== UTILITY FUNCTIONS =====
  
  // Helper to convert category ID back to name
  var getCategoryName = function(categoryId) {
    var categoryMap = {
      1: 'PA Systems',
      2: 'DJ Equipment',
      3: 'Stage Lighting',
      4: 'Microphones',
      5: 'Cables & Stands'
    };
    return categoryMap[categoryId] || 'PA Systems';
  };
  
  $scope.isLowStock = function(item) {
    if (!item) return false;
    var threshold = item.low_stock_threshold || 5;
    return item.quantity <= threshold;
  };

  $scope.getStockColor = function(item) {
    if (!item) return '#999';
    if (item.quantity === 0) return '#ff3333';
    if (item.quantity <= (item.low_stock_threshold || 5)) return '#ffa500';
    return '#00ff00';
  };

}]);
