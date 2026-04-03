'use strict';
angular.module('stageAlpha')
.controller('TelemetryCtrl', ['$scope', 'SocketService', '$timeout', function($scope, SocketService, $timeout) {
  $scope.currentData = {};
  $scope.alertLog = [];
  
  // We will initialize Chart.js natively
  var ctx = document.getElementById('decibelChart');
  var decibelChart = null;

  if (ctx && window.Chart) {
    decibelChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Decibels (dB)',
          data: [],
          borderColor: '#00f0ff',
          backgroundColor: 'rgba(0, 240, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { display: false },
          y: { 
            min: 60, max: 130,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#8b8a92', family: 'monospace' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // Listen to Socket.IO teleport stream via native socket binding to bypass Angular digest limits for 60fps
  // Since SocketService only exposes generic on(), we can use it.
  var maxDataPoints = 30; // Keep last 30 data points (~45 seconds)

  // Request subscription to the simulated event "1"
  if (SocketService.getSocket()) {
    SocketService.getSocket().emit('telemetry:subscribe', '1');
    
    SocketService.getSocket().on('telemetry:stream', function(data) {
      $timeout(function() {
        $scope.currentData = data;
        
        // Add alerts to log
        if (data.alerts && data.alerts.length > 0) {
          data.alerts.forEach(function(a) {
            $scope.alertLog.unshift({
              time: new Date(),
              level: a.level,
              msg: a.msg
            });
          });
          // Keep log size manageable
          if ($scope.alertLog.length > 50) $scope.alertLog.pop();
        }

        // Update Chart
        if (decibelChart) {
          var timeLabel = new Date(data.timestamp).toLocaleTimeString();
          decibelChart.data.labels.push(timeLabel);
          decibelChart.data.datasets[0].data.push(data.decibels);
          
          if (decibelChart.data.labels.length > maxDataPoints) {
            decibelChart.data.labels.shift();
            decibelChart.data.datasets[0].data.shift();
          }
          decibelChart.update();
        }
      });
    });
  }

  $scope.$on('$destroy', function() {
    if (SocketService.getSocket()) {
      SocketService.getSocket().emit('telemetry:unsubscribe', '1');
      SocketService.getSocket().off('telemetry:stream');
    }
  });

}]);
