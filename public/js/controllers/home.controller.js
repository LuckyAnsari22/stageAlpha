'use strict';
angular.module('stageAlpha')
.controller('HomeCtrl', ['$scope', '$rootScope', '$http', 'AuthService',
function($scope, $rootScope, $http, AuthService) {
  $scope.isLoggedIn = AuthService.isLoggedIn();
  $scope.isAdmin = AuthService.isAdmin();
  $scope.stats = {};
  $scope.featuredEquipment = [];
  $scope.loadingStats = true;
  $scope.loadingEq = true;
  $scope.error = false;

  // Category icon/class mapping
  var catMap = {
    'PA Systems':      { icon: '🔊', cls: 'cat-sound' },
    'DJ Equipment':    { icon: '🎧', cls: 'cat-dj' },
    'Stage Lighting':  { icon: '💡', cls: 'cat-light' },
    'Microphones':     { icon: '🎤', cls: 'cat-mic' },
    'Cables & Stands': { icon: '🔌', cls: 'cat-cable' }
  };

  // Load stats
  if ($scope.isAdmin) {
    $http.get('/api/v1/analytics/dashboard').then(function(res) {
      $scope.stats = res.data.data || res.data;
      $scope.loadingStats = false;
    }).catch(function() {
      $scope.loadingStats = false;
      $scope.stats = { total_equipment: 20, total_bookings: 250, total_customers: 12 };
    });
  } else {
    $scope.loadingStats = false;
    $scope.stats = { total_equipment: 20, total_bookings: 250, total_customers: 12 };
  }

  // Load featured equipment
  $http.get('/api/v1/equipment?limit=8').then(function(res) {
    var items = res.data.data || res.data || [];
    $scope.featuredEquipment = items.slice(0, 8).map(function(eq) {
      var cat = catMap[eq.category_name] || { icon: '🎵', cls: 'cat-default' };
      eq.icon = cat.icon;
      eq.cat_class = cat.cls;
      return eq;
    });
    $scope.loadingEq = false;
  }).catch(function() {
    $scope.loadingEq = false;
    $scope.error = true;
  });

  // AUDIO VISUALIZER CANVAS (Visible WOW Factor)
  setTimeout(function() {
    var canvas = document.getElementById('visualizerCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    
    // Resize canvas
    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    var bars = 60;
    var barWidth = 0;
    var barHeights = [];
    var targetHeights = [];

    // Initialize random bars
    for(var i = 0; i < bars; i++) {
      barHeights.push(Math.random() * 50);
      targetHeights.push(Math.random() * 200 + 20);
    }

    function animateVisualizer() {
      if (!document.getElementById('visualizerCanvas')) return; // Cleanup if route changes
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      barWidth = (canvas.width / bars) - 2;
      
      var gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, "rgba(0, 240, 255, 0.1)");
      gradient.addColorStop(0.5, "rgba(108, 99, 255, 0.4)");
      gradient.addColorStop(1, "rgba(0, 240, 255, 0.8)");

      for(var i = 0; i < bars; i++) {
        // Move current height towards target
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.1;

        // If close to target, generate new target
        if(Math.abs(targetHeights[i] - barHeights[i]) < 2) {
          // Keep sides lower, middle higher (simulating realistic spectrum)
          var multiplier = Math.sin((i / bars) * Math.PI) * 250;
          targetHeights[i] = Math.random() * multiplier + 10;
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(i * (barWidth + 2), canvas.height - barHeights[i], barWidth, barHeights[i]);
      }
      requestAnimationFrame(animateVisualizer);
    }
    
    animateVisualizer();
  }, 100);

}]);
