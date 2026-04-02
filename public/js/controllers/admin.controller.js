angular.module('stageAlpha').controller('AdminCtrl',
['$scope', '$interval', '$timeout', 'ApiService', 'ToastService',
function($scope, $interval, $timeout, Api, Toast) {
  $scope.stats = {};
  $scope.bookings = [];
  $scope.equipment = [];
  $scope.editing = null;
  $scope.revenueData = null;
  $scope.equipmentData = null;

  function loadDashboard() {
    Api.get('/analytics/dashboard').then(function(res) {
      $scope.stats = res.data.data;
    });
    
    Api.get('/bookings?limit=10').then(function(res) {
      $scope.bookings = res.data.data;
    });

    Api.get('/equipment?limit=20').then(function(res) {
      $scope.equipment = res.data.data;
    });

    if (!$scope.revenueData) {
      Api.get('/analytics/revenue?months=6').then(function(res) {
        $scope.revenueData = res.data.data || { labels: [], datasets: [] };
        if ($scope.revenueData.labels && $scope.revenueData.labels.length > 0) {
          $scope.initRevenueChart();
        }
      });
    }

    if (!$scope.equipmentData) {
      Api.get('/analytics/top-equipment?limit=8').then(function(res) {
        $scope.equipmentData = res.data.data || [];
        if ($scope.equipmentData.length > 0) {
           $scope.initEquipmentChart();
        }
      });
    }
  }

  $scope.initRevenueChart = function() {
    $timeout(function() {
      var ctx = document.getElementById('revenueChart');
      if (!ctx || !$scope.revenueData) return;
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: $scope.revenueData.labels,
          datasets: [{
            label: 'Revenue (₹)',
            data: $scope.revenueData.datasets[0].data,
            borderColor: '#7c6ff7',
            backgroundColor: 'rgba(124,111,247,0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { grid: { color: '#252538' } }, x: { grid: { display: false } } }
        }
      });
    }, 200);
  };

  $scope.initEquipmentChart = function() {
    $timeout(function() {
      var ctx = document.getElementById('equipmentChart');
      if (!ctx || !$scope.equipmentData) return;
      
      var labels = $scope.equipmentData.map(function(e) { return e.name.substring(0,20) + (e.name.length>20?'...':''); });
      var data = $scope.equipmentData.map(function(e) { return e.rank_revenue || e.revenue || 0; });

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Revenue (₹)',
            data: data,
            backgroundColor: '#f97316'
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { color: '#252538' } }, y: { grid: { display: false } } }
        }
      });
    }, 200);
  };

  $scope.updateAllPrices = function() {
    Api.post('/pricing/update-all', {}).then(function(res) {
      Toast.success('Batch update complete');
      loadDashboard();
    }).catch(function() { Toast.error('Failed to run batch update'); });
  };

  $scope.editEquipment = function(item) {
    if ($scope.editing && $scope.editing.id === item.id) $scope.editing = null;
    else $scope.editing = angular.copy(item);
  };

  $scope.saveEquipment = function(item) {
    Api.patch('/equipment/' + item.id, item).then(function() {
      Toast.success('Equipment saved');
      $scope.editing = null;
      loadDashboard();
    }).catch(function() { Toast.error('Save failed'); });
  };

  $scope.toggleActive = function(item) {
    item.is_active = !item.is_active;
    Api.patch('/equipment/' + item.id, { is_active: item.is_active }).then(function() {
      Toast.info(item.name + (item.is_active ? ' marked active' : ' marked inactive'));
    });
  };

  $scope.updateStatus = function(id, status) {
    Api.patch('/bookings/' + id + '/status', { status: status }).then(function() {
      Toast.success('Booking status updated');
      loadDashboard();
    });
  };

  loadDashboard();
  $scope.refreshInterval = $interval(loadDashboard, 60000);
  $scope.$on('$destroy', function() { $interval.cancel($scope.refreshInterval); });
}]);
