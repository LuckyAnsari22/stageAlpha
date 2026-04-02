/**
 * BACKTEST CONTROLLER
 * 
 * Features:
 * - Run backtest: select date range → POST /api/v1/backtest/run
 * - Real-time progress via Socket.IO
 * - Results display:
 *   * Headline: "Algorithm would have earned ₹X more (+Y%)"
 *   * Line chart: actual vs algorithm revenue by month
 *   * Bar chart: improvement % by equipment
 *   * Tables: top uplift + conservative-pricing bookings
 * 
 * Teaching: This controller demonstrates:
 * - Async backend communication (fire-and-forget pattern)
 * - Socket.IO event listening
 * - Real-time UI progress binding
 * - Chart.js integration with dynamic data
 * - Memory cleanup ($scope.$on('$destroy'))
 */

angular.module('stageAlpha')
  .controller('BacktestController', [
    '$scope', '$interval', '$location', 'ApiService', 'SocketService',
    function($scope, $interval, $location, ApiService, SocketService) {

      // ===== STATE =====

      $scope.form = {
        startDate: '',
        endDate: ''
      };

      $scope.state = {
        idle: true,           // True when not running
        running: false,       // True when backtest in progress
        completed: false,     // True when backtest finished
        error: null
      };

      $scope.progress = {
        message: '',
        percentage: 0,
        currentBooking: 0,
        stage: 'idle'         // 'fetching', 'processing', 'complete', 'error'
      };

      $scope.results = null;  // Backtest result data
      $scope.charts = {};     // Chart.js configs

      $scope.selectedTab = 'headline';  // UI tab: 'headline', 'charts', 'tables'

      // ===== INITIALIZATION =====

      $scope.initialize = function() {
        // Set default date range: last 6 months
        const today = new Date();
        const sixMonthsAgo = new Date(today.getTime() - (180 * 24 * 60 * 60 * 1000));

        $scope.form.startDate = $scope._formatDateForInput(sixMonthsAgo);
        $scope.form.endDate = $scope._formatDateForInput(today);

        // Listen for Socket.IO backtest progress events
        SocketService.on('backtest:progress', function(update) {
          $scope.$apply(function() {
            $scope._handleBacktestProgress(update);
          });
        });

        // Load last backtest result if available
        $scope.loadLastResult();

        // Clean up on destroy
        $scope.$on('$destroy', function() {
          SocketService.off('backtest:progress');
        });
      };

      // ===== BACKTEST EXECUTION =====

      /**
       * RUN BACKTEST
       * POST /api/v1/backtest/run with date range
       * This returns immediately with backtest_id
       * Progress is streamed via Socket.IO
       */
      $scope.runBacktest = function() {
        // Validation
        if (!$scope.form.startDate || !$scope.form.endDate) {
          $scope.state.error = 'Please select both start and end dates';
          return;
        }

        const startDate = new Date($scope.form.startDate);
        const endDate = new Date($scope.form.endDate);

        if (startDate >= endDate) {
          $scope.state.error = 'Start date must be before end date';
          return;
        }

        // Reset state
        $scope.state.error = null;
        $scope.state.idle = false;
        $scope.state.running = true;
        $scope.state.completed = false;
        $scope.progress = {
          message: 'Starting backtest...',
          percentage: 0,
          currentBooking: 0,
          stage: 'fetching'
        };
        $scope.results = null;

        // POST to start backtest
        ApiService.post('/backtest/run', {
          start_date: $scope.form.startDate,
          end_date: $scope.form.endDate
        })
          .then(function(response) {
            if (response.success) {
              console.log('Backtest started:', response.data.backtest_id);
              // Now we wait for Socket.IO events to stream progress
            } else {
              $scope.state.error = response.message;
              $scope.state.running = false;
              $scope.state.idle = true;
              $scope.progress.stage = 'error';
            }
          })
          .catch(function(error) {
            $scope.state.error = 'Failed to start backtest: ' + error.message;
            $scope.state.running = false;
            $scope.state.idle = true;
            $scope.progress.stage = 'error';
          });
      };

      /**
       * HANDLE BACKTEST PROGRESS
       * Called via Socket.IO when server emits backtest:progress
       */
      $scope._handleBacktestProgress = function(update) {
        $scope.progress.stage = update.stage || 'processing';
        $scope.progress.message = update.message || '';

        if (update.progress !== undefined) {
          $scope.progress.percentage = update.progress;
        }

        if (update.current_booking_id) {
          $scope.progress.currentBooking = update.current_booking_id;
        }

        // If backtest complete, store results and display
        if (update.stage === 'complete' && update.result) {
          $scope.results = update.result;
          $scope._initializeCharts();
          $scope.state.running = false;
          $scope.state.completed = true;
          $scope.state.idle = false;
          $scope.selectedTab = 'headline';
        }

        // If backtest errored
        if (update.error === true) {
          $scope.state.error = update.message;
          $scope.progress.stage = 'error';
          $scope.state.running = false;
          $scope.state.idle = true;
        }
      };

      // ===== RESULT LOADING =====

      /**
       * LOAD LAST RESULT
       * Fetch the most recent backtest result from server
       */
      $scope.loadLastResult = function() {
        ApiService.get('/backtest/latest')
          .then(function(response) {
            if (response.success && response.data) {
              $scope.results = response.data;
              $scope._initializeCharts();
              $scope.state.idle = false;
              $scope.state.completed = true;
            }
          })
          .catch(function(error) {
            // No previous result, that's okay
            console.log('No previous backtest found');
          });
      };

      // ===== CHART INITIALIZATION =====

      /**
       * INITIALIZE CHARTS
       * Build Chart.js configs from backtest results
       */
      $scope._initializeCharts = function() {
        if (!$scope.results) return;

        // Chart 1: Revenue by Month (Line Chart)
        if ($scope.results.breakdown_by_month && $scope.results.breakdown_by_month.length > 0) {
          const months = $scope.results.breakdown_by_month;
          $scope.charts.revenue = {
            type: 'line',
            data: {
              labels: months.map(m => m.month),
              datasets: [
                {
                  label: 'Actual Revenue',
                  data: months.map(m => m.actual_revenue),
                  borderColor: '#8888aa',
                  backgroundColor: 'rgba(136, 136, 170, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true
                },
                {
                  label: 'Algorithm Revenue',
                  data: months.map(m => m.algorithm_revenue),
                  borderColor: '#6c63ff',
                  backgroundColor: 'rgba(108, 99, 255, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true
                }
              ]
            },
            options: {
              responsive: true,
              plugins: {
                title: { display: true, text: 'Revenue Comparison by Month' },
                legend: { position: 'top' }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: 'Revenue (₹)' }
                }
              }
            }
          };
        }

        // Chart 2: Improvement by Equipment (Bar Chart)
        if ($scope.results.breakdown_by_equipment && $scope.results.breakdown_by_equipment.length > 0) {
          const equipment = $scope.results.breakdown_by_equipment;
          $scope.charts.equipment = {
            type: 'bar',
            data: {
              labels: equipment.map(e => e.equipment_name),
              datasets: [{
                label: 'Improvement %',
                data: equipment.map(e => e.uplift_pct),
                backgroundColor: equipment.map(e =>
                  e.uplift_pct >= 10 ? 'rgba(76, 175, 80, 0.7)' :    // Green
                  e.uplift_pct >= 5 ? 'rgba(33, 150, 243, 0.7)' :     // Blue
                  e.uplift_pct >= 0 ? 'rgba(245, 158, 11, 0.7)' :     // Amber
                  'rgba(239, 68, 68, 0.7)'                            // Red
                ),
                borderColor: '#6c63ff',
                borderWidth: 1
              }]
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              plugins: {
                title: { display: true, text: 'Algorithm Improvement by Equipment' },
                legend: { display: false }
              }
            }
          };
        }
      };

      // ===== UI ACTIONS =====

      /**
       * SELECT TAB
       * Switch between headline, charts, tables views
       */
      $scope.selectTab = function(tab) {
        $scope.selectedTab = tab;
      };

      /**
       * GET UPLIFT CLASS
       * CSS class based on uplift percentage
       */
      $scope.getUpliftClass = function(upliftPct) {
        if (upliftPct >= 10) return 'text-success';      // Green
        if (upliftPct >= 5) return 'text-info';          // Blue
        if (upliftPct >= 0) return 'text-warning';       // Amber
        return 'text-danger';                            // Red
      };

      /**
       * GET UPLIFT BADGE
       * HTML badge showing uplift with emoji
       */
      $scope.getUpliftBadge = function(upliftPct) {
        if (upliftPct >= 10) return '↑↑ High';
        if (upliftPct >= 5) return '↑ Medium';
        if (upliftPct > 0) return '→ Low';
        return '↓ Negative';
      };

      /**
       * NEW BACKTEST
       * Reset form and start over
       */
      $scope.newBacktest = function() {
        $scope.state = {
          idle: true,
          running: false,
          completed: false,
          error: null
        };
        $scope.progress = {
          message: '',
          percentage: 0,
          currentBooking: 0,
          stage: 'idle'
        };
        $scope.results = null;
        $scope.charts = {};
      };

      // ===== PRIVATE HELPERS =====

      /**
       * FORMAT DATE FOR INPUT
       * Convert Date object to YYYY-MM-DD string for input[type="date"]
       */
      $scope._formatDateForInput = function(date) {
        if (typeof date === 'string') return date;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // ===== INIT =====
      $scope.initialize();

    }
  ]);

/**
 * BACKTEST CONTROLLER PATTERNS
 *
 * 1. ASYNC JOB PATTERN
 *    - POST /backtest/run returns immediately with backtest_id
 *    - Progress streamed via Socket.IO (not polling)
 *    - This is more efficient than traditional polling
 *
 * 2. SOCKET.IO EVENT LISTENING
 *    - Register listener: SocketService.on('backtest:progress', callback)
 *    - $scope.$apply() inside callback to trigger digest cycle
 *    - Cleanup: SocketService.off() in $scope.$on('$destroy')
 *
 * 3. STATE MANAGEMENT
 *    Four states: idle (no backtest yet), running (in progress),
 *    completed (finished), error (failed)
 *    UI conditionally renders based on state
 *
 * 4. CHART.JS INITIALIZATION
 *    Charts built inside $scope._initializeCharts()
 *    Charts initialized when results data arrives
 *    Color coding: Green (>10%), Blue (5-10%), Amber (0-5%), Red (<0%)
 *
 * 5. RESPONSIVE TABS
 *    Three tabs: Headline (summary), Charts (visualizations), Tables (details)
 *    Users can jump between tabs to explore different views
 *
 * 6. PROOF OF ALGORITHM
 *    Two tables: top uplift (algorithm earns more) and top downward (algorithm
 *    suggests lower price). Second table proves algorithm isn't just raising
 *    prices — it's data-driven.
 */
