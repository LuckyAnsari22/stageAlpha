'use strict';
angular.module('stageAlpha')
.controller('EquipmentListCtrl', ['$scope', '$http', '$rootScope', 'CartService', 'ToastService',
function($scope, $http, $rootScope, CartService, ToastService) {
  $scope.equipment = [];
  $scope.filteredEquipment = [];
  $scope.categories = [];
  $scope.loading = true;
  $scope.searchQuery = '';
  $scope.selectedCategory = null;
  $scope.sortBy = 'name';
  $scope.sortDir = 'asc';
  $scope.compareList = [];

  var catMap = {
    'PA Systems':      { icon: '🔊', cls: 'cat-sound' },
    'DJ Equipment':    { icon: '🎧', cls: 'cat-dj' },
    'Stage Lighting':  { icon: '💡', cls: 'cat-light' },
    'Microphones':     { icon: '🎤', cls: 'cat-mic' },
    'Cables & Stands': { icon: '🔌', cls: 'cat-cable' }
  };

  $scope.getCatClass = function(catName) { return (catMap[catName] || {}).cls || 'cat-default'; };
  $scope.getCatIcon = function(catName) { return (catMap[catName] || {}).icon || '🎵'; };

  // Load equipment
  $http.get('/api/v1/equipment').then(function(res) {
    $scope.equipment = res.data.data || res.data || [];
    applyFilters();
    $scope.loading = false;
  }).catch(function() {
    $scope.loading = false;
  });

  // Load categories
  $http.get('/api/v1/categories').then(function(res) {
    $scope.categories = res.data.data || res.data || [];
  });

  // Filtering
  $scope.filterCategory = function(catName) {
    $scope.selectedCategory = catName;
    applyFilters();
  };

  $scope.sortEquipment = function(field) {
    if ($scope.sortBy === field) {
      $scope.sortDir = $scope.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      $scope.sortBy = field;
      $scope.sortDir = 'asc';
    }
    applyFilters();
  };

  $scope.resetFilters = function() {
    $scope.searchQuery = '';
    $scope.selectedCategory = null;
    $scope.sortBy = 'name';
    $scope.sortDir = 'asc';
    applyFilters();
  };

  $scope.$watch('searchQuery', function() { applyFilters(); });

  function applyFilters() {
    var result = $scope.equipment.slice();

    // Category filter
    if ($scope.selectedCategory) {
      result = result.filter(function(eq) { return eq.category_name === $scope.selectedCategory; });
    }

    // Search filter
    if ($scope.searchQuery) {
      var q = $scope.searchQuery.toLowerCase();
      result = result.filter(function(eq) {
        return eq.name.toLowerCase().indexOf(q) > -1 ||
               (eq.category_name && eq.category_name.toLowerCase().indexOf(q) > -1);
      });
    }

    // Sorting
    var dir = $scope.sortDir === 'asc' ? 1 : -1;
    result.sort(function(a, b) {
      var va = a[$scope.sortBy], vb = b[$scope.sortBy];
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });

    $scope.filteredEquipment = result;
  }

  // Cart
  $scope.addToCart = function(eq) {
    CartService.add(eq);
    $rootScope.$broadcast('cart:updated');
    ToastService.show(eq.name + ' added to cart', 'success');
  };
}]);
