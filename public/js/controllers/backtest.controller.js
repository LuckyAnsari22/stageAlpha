angular.module('stageAlpha').controller('BacktestCtrl',
['$scope', 'ApiService', 'ToastService', 'SocketService',
function($scope, Api, Toast, Socket) {
  $scope.form = { start_date: '2025-01-01', end_date: '2025-06-30' };
  $scope.running = false;
  $scope.result = null;
  $scope.history = [];
  $scope.lastResult = null;

  function loadHistory() {
    Api.get('/backtest/results').then(function(res) {
      $scope.history = res.data.data;
    });
    Api.get('/backtest/results/latest').then(function(res) {
      $scope.lastResult = res.data.data;
    }).catch(function(){}); // Silent catch if empty
  }

  $scope.runBacktest = function() {
    var start = new Date($scope.form.start_date);
    var end = new Date($scope.form.end_date);
    if (!start || !end || start >= end) {
      return Toast.error('Start date must be before end date.');
    }

    $scope.running = true;
    $scope.result = null;

    Api.post('/backtest/run', $scope.form)
      .then(function(res) {
        $scope.result = res.data.data;
        Toast.success('Backtest complete: ' + $scope.result.improvement_pct + '% improvement');
        loadHistory();
      })
      .catch(function(err) {
        Toast.error('Backtest failed: ' + (err.data?.message || 'Error'));
      })
      .finally(function() {
        $scope.running = false;
      });
  };

  // Socket notification
  Socket.on('backtest:complete', function(data) {
    if (!$scope.running) {
      Toast.info('A background backtest completed organically (' + data.improvement_pct + '%)');
      loadHistory();
    }
  });

  $scope.$on('$destroy', function() {
    Socket.off('backtest:complete');
  });

  loadHistory();
}]);
