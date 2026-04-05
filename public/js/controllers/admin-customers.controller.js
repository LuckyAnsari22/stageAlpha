'use strict';
angular.module('stageAlpha')
.controller('AdminCustomersCtrl', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  
  console.log('=== AdminCustomersCtrl Initialized ===');
  
  // ===== STATE =====
  $scope.isLoading = false;
  $scope.isSaving = false;
  $scope.customers = [];
  $scope.filteredCustomers = [];
  $scope.selectedCustomer = null;
  $scope.showModal = false;
  $scope.isEditing = false;
  $scope.gridView = false;
  
  $scope.searchText = '';
  $scope.segmentFilter = '';
  $scope.sortBy = 'name';
  $scope.currentPage = 1;
  $scope.itemsPerPage = 10;
  
  // ===== FORM MODEL =====
  $scope.form = {
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    segment: 'Regular',
    notes: ''
  };

  // ===== LOAD CUSTOMERS =====
  var loadCustomers = function() {
    console.log('[Customers] Loading all customers...');
    $scope.isLoading = true;
    
    $http.get('/api/v1/customers')
      .then(function(response) {
        console.log('[Customers] Success:', response.data);
        $scope.customers = response.data.data || response.data || [];
        console.log('[Customers] Customer count:', $scope.customers.length);
        $scope.filteredCustomers = $scope.customers;
        $scope.isLoading = false;
      })
      .catch(function(error) {
        console.error('[Customers] Error:', error);
        $scope.isLoading = false;
        var msg = 'Error loading customers';
        if (error.data && error.data.message) msg += ': ' + error.data.message;
        if (error.statusText) msg += ' (' + error.statusText + ')';
        ToastService.show(msg, 'error');
      });
  };

  // Initial load
  loadCustomers();

  // ===== SEARCH & FILTER =====
  
  $scope.$watch('searchText', function() {
    applyFilters();
  });

  var applyFilters = function() {
    var filtered = $scope.customers;
    
    // Search filter
    if ($scope.searchText) {
      var search = $scope.searchText.toLowerCase();
      filtered = filtered.filter(function(c) {
        return c.name.toLowerCase().includes(search) ||
               c.email.toLowerCase().includes(search) ||
               (c.phone && c.phone.includes(search));
      });
    }
    
    // Segment filter
    if ($scope.segmentFilter) {
      filtered = filtered.filter(function(c) {
        return c.segment === $scope.segmentFilter;
      });
    }
    
    // Sort
    filtered = filterAndSort(filtered);
    
    $scope.filteredCustomers = filtered;
    $scope.currentPage = 1;
  };

  var filterAndSort = function(arr) {
    var sorted = arr.slice();
    
    switch($scope.sortBy) {
      case 'name':
        sorted.sort(function(a, b) { return a.name.localeCompare(b.name); });
        break;
      case 'spend':
        sorted.sort(function(a, b) { return (b.total_spend || 0) - (a.total_spend || 0); });
        break;
      case 'bookings':
        sorted.sort(function(a, b) { return (b.booking_count || 0) - (a.booking_count || 0); });
        break;
      case 'recent':
        sorted.sort(function(a, b) {
          var aDate = new Date(a.last_booking_date || 0);
          var bDate = new Date(b.last_booking_date || 0);
          return bDate - aDate;
        });
        break;
    }
    
    return sorted;
  };

  $scope.filterCustomers = function() {
    applyFilters();
  };

  $scope.sortCustomers = function() {
    applyFilters();
  };

  // ===== PAGINATION =====
  
  $scope.getTotalPages = function() {
    return Math.ceil($scope.filteredCustomers.length / $scope.itemsPerPage);
  };

  $scope.getPaginatedCustomers = function() {
    var start = ($scope.currentPage - 1) * $scope.itemsPerPage;
    var end = start + $scope.itemsPerPage;
    return $scope.filteredCustomers.slice(start, end);
  };

  $scope.nextPage = function() {
    if ($scope.currentPage < $scope.getTotalPages()) {
      $scope.currentPage++;
    }
  };

  $scope.previousPage = function() {
    if ($scope.currentPage > 1) {
      $scope.currentPage--;
    }
  };

  // Override filteredCustomers getter for pagination
  Object.defineProperty($scope, 'paginatedCustomers', {
    get: function() {
      return $scope.getPaginatedCustomers();
    }
  });

  // ===== ACTIONS =====
  
  $scope.refreshCustomers = function() {
    console.log('[Customers] Refresh clicked');
    loadCustomers();
  };

  $scope.openAddModal = function() {
    console.log('[Customers] Open add modal');
    $scope.form = {
      name: '',
      email: '',
      phone: '',
      city: '',
      address: '',
      segment: 'Regular',
      notes: ''
    };
    $scope.selectedCustomer = null;
    $scope.isEditing = true;
    $scope.showModal = true;
  };

  $scope.viewCustomer = function(customer) {
    console.log('[Customers] View customer:', customer);
    $http.get('/api/v1/customers/' + customer.id)
      .then(function(response) {
        $scope.selectedCustomer = response.data.data || response.data;
        $scope.isEditing = false;
        $scope.showModal = true;
      })
      .catch(function(error) {
        console.error('[Customers] Error loading details:', error);
        ToastService.show('Error loading customer details', 'error');
      });
  };

  $scope.editCustomer = function(customer) {
    console.log('[Customers] Edit customer:', customer);
    if (!customer) customer = $scope.selectedCustomer;
    if (!customer) {
      console.warn('[Customers] No customer selected');
      ToastService.show('No customer selected', 'error');
      return;
    }
    $scope.form = angular.copy(customer);
    $scope.selectedCustomer = customer;
    $scope.isEditing = true;
    if (!$scope.showModal) {
      $scope.showModal = true;
    }
  };

  $scope.saveCustomer = function() {
    console.log('[Customers] Save customer:', $scope.form);
    
    if (!$scope.form.name || $scope.form.name.trim() === '') {
      ToastService.show('Please enter customer name', 'error');
      return;
    }
    if (!$scope.form.email || $scope.form.email.trim() === '') {
      ToastService.show('Please enter customer email', 'error');
      return;
    }

    $scope.isSaving = true;
    var isNew = !$scope.form.id;
    var method = isNew ? 'POST' : 'PUT';
    var url = isNew ? '/api/v1/customers' : '/api/v1/customers/' + $scope.form.id;
    
    console.log('[Customers] Saving:', method, url);
    
    $http({
      method: method,
      url: url,
      data: $scope.form
    })
      .then(function(response) {
        console.log('[Customers] Save success:', response.data);
        $scope.isSaving = false;
        ToastService.show(isNew ? 'Customer added!' : 'Customer updated!', 'success');
        loadCustomers();
        $scope.closeModal();
      })
      .catch(function(error) {
        console.error('[Customers] Save error:', error);
        $scope.isSaving = false;
        var msg = 'Failed to save customer';
        if (error.data && error.data.message) msg += ': ' + error.data.message;
        ToastService.show(msg, 'error');
      });
  };

  $scope.deleteCustomer = function(customer) {
    console.log('[Customers] Delete customer:', customer);
    
    if (!customer || !customer.id) {
      console.warn('[Customers] Cannot delete - no ID');
      ToastService.show('Invalid customer', 'error');
      return;
    }

    if (!confirm('Delete "' + customer.name + '"? This cannot be undone.')) {
      console.log('[Customers] Delete cancelled');
      return;
    }

    console.log('[Customers] Deleting ID:', customer.id);
    $http.delete('/api/v1/customers/' + customer.id)
      .then(function(response) {
        console.log('[Customers] Delete success:', response.data);
        ToastService.show('Customer deleted', 'success');
        loadCustomers();
      })
      .catch(function(error) {
        console.error('[Customers] Delete error:', error);
        var msg = 'Failed to delete';
        if (error.data && error.data.message) msg += ': ' + error.data.message;
        ToastService.show(msg, 'error');
      });
  };

  $scope.closeModal = function() {
    console.log('[Customers] Close modal');
    $scope.showModal = false;
    $scope.selectedCustomer = null;
    $scope.isEditing = false;
    $scope.form = {
      name: '',
      email: '',
      phone: '',
      city: '',
      address: '',
      segment: 'Regular',
      notes: ''
    };
  };

  // ===== UTILITY FUNCTIONS =====
  
  $scope.getSegmentColor = function(segment) {
    switch(segment) {
      case 'VIP': return '#ff6b6b';      // Red
      case 'Regular': return '#4ecdc4';  // Teal
      case 'One-time': return '#95e1d3'; // Light teal
      default: return '#95a5a6';          // Gray
    }
  };

  $scope.getTotalRevenue = function() {
    return $scope.customers.reduce(function(sum, c) {
      return sum + (c.total_spend || 0);
    }, 0);
  };

  $scope.getActiveThisMonth = function() {
    var thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return $scope.customers.filter(function(c) {
      var lastDate = new Date(c.last_booking_date);
      return lastDate >= thirtyDaysAgo;
    }).length;
  };

  $scope.exportCustomers = function() {
    console.log('[Customers] Exporting to CSV');
    
    if ($scope.customers.length === 0) {
      ToastService.show('No customers to export', 'error');
      return;
    }

    // Create CSV header
    var csv = 'Name,Email,Phone,City,Segment,Total Bookings,Total Spent,Last Booking\n';
    
    // Add rows
    $scope.customers.forEach(function(c) {
      var row = [
        '"' + (c.name || '') + '"',
        c.email || '',
        c.phone || '',
        c.city || '',
        c.segment || '',
        c.booking_count || 0,
        c.total_spend || 0,
        (c.last_booking_date ? new Date(c.last_booking_date).toLocaleDateString() : '')
      ];
      csv += row.join(',') + '\n';
    });

    // Create blob and download
    var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'customers_' + new Date().toISOString().split('T')[0] + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ToastService.show('Customers exported successfully', 'success');
  };

}]);
