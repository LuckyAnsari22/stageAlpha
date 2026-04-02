angular.module('stageAlpha').controller('EquipmentListCtrl',
['$scope', '$location', '$timeout', 'ApiService', 'CartService', 'SocketService', 'ToastService',
function($scope, $location, $timeout, Api, Cart, Socket, Toast) {
  $scope.equipment = [];
  $scope.filtered = [];
  $scope.categories = [];
  
  $scope.filters = { search: '', category_id: '', available_only: false };
  $scope.sort = 'name';
  $scope.page = 1;
  $scope.pageSize = 12;
  
  $scope.loading = true;
  $scope.error = null;

  function loadCategories() {
    Api.get('/categories').then(function(res) {
      $scope.categories = res.data.data;
    });
  }

  $scope.loadEquipment = function() {
    $scope.loading = true;
    $scope.error = null;
    Api.get('/equipment').then(function(res) {
      $scope.equipment = res.data.data;
      $scope.applyFilters();
    }).catch(function(err) {
      $scope.error = err.data?.message || 'Failed to fetch catalog';
    }).finally(function() {
      $scope.loading = false;
    });
  };

  $scope.applyFilters = function() {
    var f = $scope.equipment;
    // Search
    if ($scope.filters.search) {
      var s = $scope.filters.search.toLowerCase();
      f = f.filter(function(e) { return e.name.toLowerCase().includes(s) || (e.description || '').toLowerCase().includes(s); });
    }
    // Category
    if ($scope.filters.category_id) {
      f = f.filter(function(e) { return e.category_id == $scope.filters.category_id; });
    }
    // Available
    if ($scope.filters.available_only) {
      f = f.filter(function(e) { return e.stock_qty > 0; });
    }
    // Sort
    f.sort(function(a, b) {
      if ($scope.sort === 'name') return a.name.localeCompare(b.name);
      if ($scope.sort === 'price_asc') return a.current_price - b.current_price;
      if ($scope.sort === 'price_desc') return b.current_price - a.current_price;
      return 0;
    });
    $scope.filtered = f;
    $scope.page = 1; // reset pagination
  };

  $scope.paginatedItems = function() {
    var start = ($scope.page - 1) * $scope.pageSize;
    return $scope.filtered.slice(start, start + $scope.pageSize);
  };

  $scope.totalPages = function() {
    return Math.ceil($scope.filtered.length / $scope.pageSize) || 1;
  };
  
  $scope.getPagesArray = function() {
    return new Array($scope.totalPages());
  };

  $scope.addToCart = function(item) {
    Cart.add(item, 1);
    Toast.success(item.name + ' added to booking');
  };

  $scope.isInCart = function(id) {
    return Cart.has(id);
  };

  $scope.goToDetail = function(id) {
    $location.path('/equipment/' + id);
  };

  $scope.priceUplift = function(item) {
    if (!item.base_price || item.base_price == 0) return 0;
    return Math.round(((item.current_price - item.base_price) / item.base_price) * 100);
  };

  $scope.priceClass = function(item) {
    var diff = $scope.priceUplift(item);
    if (diff > 0) return 'badge-warning';
    if (diff < 0) return 'badge-success';
    return '';
  };

  // Debounced filter watcher
  var filterTimer;
  $scope.$watch('filters', function(nv, ov) {
    if (nv === ov) return;
    if (filterTimer) $timeout.cancel(filterTimer);
    filterTimer = $timeout($scope.applyFilters, 300);
  }, true);

  $scope.$watch('sort', function(nv, ov) {
    if (nv !== ov) $scope.applyFilters();
  });

  // Socket sync
  Socket.on('inventory:updated', function(data) {
    var eq = $scope.equipment.find(function(e) { return e.id === data.id; });
    if (eq) {
      eq.stock_qty = data.stock_qty;
      $scope.applyFilters();
    }
  });

  $scope.$on('$destroy', function() {
    Socket.off('inventory:updated');
  });

  // Init
  loadCategories();
  $scope.loadEquipment();
}]);
