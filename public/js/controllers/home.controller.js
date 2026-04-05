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

  // ── Particle simulation, Parallax & Counters ──
  setTimeout(function() {
    // 1. Counters
    var statObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          var el = e.target;
          var target = parseInt(el.getAttribute('data-target')) || 0;
          var current = 0;
          var step = Math.max(1, Math.floor(target / 60));
          var timer = setInterval(function() {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = current + (target === 99 ? '%' : '+');
          }, 30);
          statObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.sa-stat__value').forEach(function(el) {
      statObserver.observe(el);
    });

    // 2. Parallax
    var hero = document.getElementById('heroSection');
    if (hero) {
      var scrollHandler = function() {
        var st = window.scrollY;
        var floraL = hero.querySelector('.sa-hero__flora--left');
        var floraR = hero.querySelector('.sa-hero__flora--right');
        var arch = hero.querySelector('.sa-hero__arch');
        var orbit = hero.querySelector('.sa-hero__orbit');
        if (floraL) floraL.style.transform = 'translateY(' + (st * 0.25) + 'px) scale(' + (1 + st * 0.0003) + ')';
        if (floraR) floraR.style.transform = 'translateY(' + (st * 0.15) + 'px) scale(' + (1 + st * 0.0002) + ')';
        if (arch)   arch.style.transform = 'translateY(' + (st * 0.08) + 'px)';
        if (orbit)  orbit.style.opacity = Math.max(0, 1 - st * 0.002);
      };
      window.addEventListener('scroll', scrollHandler);
      $scope.$on('$destroy', function() {
        window.removeEventListener('scroll', scrollHandler);
      });
    }

    // 3. Ambient Particle Canvas
    var canvas = document.getElementById('heroParticles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var PARTICLE_COUNT = 60;
    var animFrame;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    $scope.$on('$destroy', function() {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrame);
    });

    function Particle() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedY = -(Math.random() * 0.3 + 0.1);
      this.speedX = (Math.random() - 0.5) * 0.2;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5 ? '108,99,255' : '0,229,255';
    }
    Particle.prototype.update = function() {
      this.y += this.speedY;
      this.x += this.speedX;
      if (this.y < -10) { this.y = canvas.height + 10; this.x = Math.random() * canvas.width; }
    };
    Particle.prototype.draw = function() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + this.color + ',' + this.opacity + ')';
      ctx.fill();
    };

    for (var i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function(p) { p.update(); p.draw(); });
      animFrame = requestAnimationFrame(animate);
    }
    animate();

  }, 100);

}]);
