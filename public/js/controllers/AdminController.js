/**
 * ADMINCONTROLLER - Admin Dashboard
 */

angular.module('stageAlpha')
  .controller('AdminController', [
    '$scope', '$interval', '$q', 'ApiService', 'SocketService',
    function($scope, $interval, $q, ApiService, SocketService) {

      // ===== STATE =====
      $scope.stats = null;
      $scope.chartData = {
        revenue: null,
        equipment: null,
      };
      $scope.recentBookings = [];
      $scope.loading = { stats: true, charts: true, bookings: true };
      $scope.error = null;

      // ===== INITIALIZATION =====
      $scope.initialize = function() {
        $scope.loadStats();
        $scope.loadCharts();
        $scope.loadRecentBookings();

        const refreshInterval = $interval(function() {
          $scope.loadStats();
          $scope.loadRecentBookings();
        }, 5 * 60 * 1000);

        $scope.$on('$destroy', function() {
          $interval.cancel(refreshInterval);
        });
      };

      // ===== DATA LOADING =====
      $scope.loadStats = function() {
        $scope.loading.stats = true;
        ApiService.get('/analytics/dashboard')
          .then(function(response) {
            if (response.success) {
              $scope.stats = response.data;
            }
            $scope.loading.stats = false;
          })
          .catch(function(error) {
            $scope.error = error.message;
            $scope.loading.stats = false;
          });
      };

      $scope.loadCharts = function() {
        $scope.loading.charts = true;
        $q.all([
          ApiService.get('/analytics/revenue'),
          ApiService.get('/analytics/equipment')
        ])
          .then(function(results) {
            if (results[0].success) {
              $scope.chartData.revenue = buildRevenueChart(results[0].data);
            }
            if (results[1].success) {
              $scope.chartData.equipment = buildEquipmentChart(results[1].data.slice(0, 10)); // Top 10
            }
            $scope.loading.charts = false;
          })
          .catch(function(error) {
            $scope.loading.charts = false;
          });
      };

      $scope.loadRecentBookings = function() {
        $scope.loading.bookings = true;
        ApiService.get('/bookings', { limit: 10 })
          .then(function(response) {
            if (response.success) {
              $scope.recentBookings = response.data.slice(0, 10);
            }
            $scope.loading.bookings = false;
          })
          .catch(function(error) {
            $scope.loading.bookings = false;
          });
      };

      // ===== CHART BUILDERS =====
      function buildRevenueChart(data) {
        return {
          type: 'line',
          data: {
            labels: data.map(d => d.period),
            datasets: [
              {
                label: 'Monthly Revenue',
                data: data.map(d => parseFloat(d.revenue)),
                borderColor: '#6c63ff',
                backgroundColor: 'rgba(108, 99, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Revenue Trend (12 Months)' } },
            scales: { y: { beginAtZero: true } }
          }
        };
      }

      function buildEquipmentChart(data) {
        return {
          type: 'bar',
          data: {
            labels: data.map(d => d.name),
            datasets: [{
              label: 'Revenue',
              data: data.map(d => parseFloat(d.total_revenue)),
              backgroundColor: 'rgba(108, 99, 255, 0.1)',
              borderColor: '#6c63ff',
              borderWidth: 1
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { title: { display: true, text: 'Top Equipment (by Revenue)' }, legend: { display: false } }
          }
        };
      }

      $scope.refresh = function() {
        $scope.initialize();
      };
      
      $scope.initialize();
    }
  ]);
