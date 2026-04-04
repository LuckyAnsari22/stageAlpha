'use strict';
angular.module('stageAlpha', ['ngRoute'])

.config(['$routeProvider', '$locationProvider', function($routeProvider) {
  $routeProvider
    .when('/', { templateUrl: '/views/home.html', controller: 'HomeCtrl', title: 'Dashboard' })
    .when('/equipment', { templateUrl: '/views/equipment-list.html', controller: 'EquipmentListCtrl', title: 'Equipment' })
    .when('/equipment/compare', { templateUrl: '/views/equipment-compare.html', controller: 'ComparisonCtrl', title: 'Compare Equipment' })
    .when('/equipment/:id', { templateUrl: '/views/equipment-detail.html', controller: 'EquipmentDetailCtrl', title: 'Equipment Details' })
    .when('/booking', { templateUrl: '/views/booking.html', controller: 'BookingCtrl', title: 'Book Equipment', requireAuth: true })
    .when('/booking/:id', { templateUrl: '/views/booking-status.html', controller: 'BookingStatusCtrl', title: 'Booking Status', requireAuth: true })
    .when('/account', { templateUrl: '/views/account.html', controller: 'AccountController', title: 'My Account', requireAuth: true })
    .when('/telemetry', { templateUrl: '/views/telemetry.html', controller: 'TelemetryCtrl', title: 'Live Overwatch', requireAuth: true })
    .when('/invoice/:id', { templateUrl: '/views/invoice.html', controller: 'InvoiceCtrl', title: 'Invoice', requireAuth: true })
    .when('/packages', { templateUrl: '/views/packages.html', controller: 'PackagesCtrl', title: 'Event Packages' })
    .when('/packages/:slug', { templateUrl: '/views/package-detail.html', controller: 'PackageDetailCtrl', title: 'Package Details' })
    .when('/availability', { templateUrl: '/views/availability.html', controller: 'AvailabilityCtrl', title: 'Check Availability' })
.when('/admin', { redirectTo: '/admin/dashboard' })
    .when('/admin/dashboard', { templateUrl: '/views/admin-dashboard.html', controller: 'AdminDashboardCtrl', title: 'Dashboard', requireAdmin: true })
    .when('/admin/bookings', { templateUrl: '/views/admin-bookings.html', controller: 'AdminBookingsCtrl', title: 'Bookings', requireAdmin: true })
    .when('/admin/inventory', { templateUrl: '/views/admin-inventory.html', controller: 'AdminInventoryCtrl', title: 'Inventory', requireAdmin: true })
    .when('/admin/live', { templateUrl: '/views/admin-realtime.html', controller: 'AdminRealtimeCtrl', title: 'Live Admin Dashboard', requireAdmin: true })
    .when('/admin/classic', { templateUrl: '/views/admin.html', controller: 'AdminCtrl', title: 'Classic Dashboard', requireAdmin: true })
    .when('/admin/pricing', { templateUrl: '/views/pricing.html', controller: 'PricingCtrl', title: 'Pricing Engine', requireAdmin: true })
    .when('/admin/backtest', { templateUrl: '/views/backtest.html', controller: 'BacktestCtrl', title: 'Backtest', requireAdmin: true })
    .when('/admin/calendar', { templateUrl: '/views/admin-calendar.html', controller: 'AdminCalendarCtrl', title: 'Booking Calendar', requireAdmin: true })
    .when('/admin/staff', { templateUrl: '/views/admin-staff.html', controller: 'AdminStaffCtrl', title: 'Staff Management', requireAdmin: true })
    .when('/admin/analytics', { templateUrl: '/views/admin-analytics.html', controller: 'AnalyticsCtrl', title: 'Analytics', requireAdmin: true })
    .when('/admin/quotes', { templateUrl: '/views/admin-quotes.html', controller: 'AdminQuotesCtrl', title: 'Quotes', requireAdmin: true })
    .when('/login', { templateUrl: '/views/login.html', controller: 'AuthCtrl', title: 'Sign In', redirectIfAuth: true })
    .when('/register', { templateUrl: '/views/register.html', controller: 'AuthCtrl', title: 'Register', redirectIfAuth: true })
    .when('/forgot-password', { templateUrl: '/views/forgot-password.html', controller: 'AuthCtrl', title: 'Reset Password' })
    .when('/profile', { templateUrl: '/views/profile.html', controller: 'ProfileCtrl', title: 'My Profile', requireAuth: true })
    .otherwise({ redirectTo: '/' });
}])

.run(['$rootScope', '$location', 'AuthService', 'CartService', 'SocketService', function($rootScope, $location, AuthService, CartService, SocketService) {
  // Route guard
  $rootScope.$on('$routeChangeStart', function(evt, next) {
    if (next && next.$$route) {
      $rootScope.pageTitle = next.$$route.title || 'StageAlpha';
      var requireAuth = next.$$route.requireAuth;
      var requireAdmin = next.$$route.requireAdmin;
      var redirectIfAuth = next.$$route.redirectIfAuth;
      
      if (requireAuth && !AuthService.isLoggedIn()) {
        evt.preventDefault();
        $location.path('/login');
      } else if (requireAdmin && !AuthService.isAdmin()) {
        evt.preventDefault();
        $location.path('/');
      } else if (redirectIfAuth && AuthService.isLoggedIn()) {
        evt.preventDefault();
        $location.path('/');
      }
    }
  });

  // Restore auth state on page load
  $rootScope.currentUser = AuthService.getUser();
  $rootScope.isLoggedIn  = AuthService.isLoggedIn();
  $rootScope.isAdmin     = AuthService.isAdmin();
  $rootScope.cartCount   = CartService.count();

  // Initialize WebSocket for real-time updates
  if ($rootScope.isLoggedIn) {
    SocketService.init();
  }

  // Cart count watcher
  $rootScope.$on('cart:updated', function() {
    $rootScope.cartCount = CartService.count();
  });
}])

// $http interceptor — attaches JWT to every request, handles 401/403
.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push(['$window', '$q', '$location', function($window, $q, $location) {
    return {
      request: function(config) {
        var token = $window.localStorage.getItem('sa_access_token');
        if (token) config.headers.Authorization = 'Bearer ' + token;
        return config;
      },
      responseError: function(rejection) {
        if (rejection.status === 401) {
          $window.localStorage.removeItem('sa_access_token');
          $window.localStorage.removeItem('sa_user');
          $window.location.href = '#!/login';
        } else if (rejection.status === 403) {
          // Unauthorized access - redirect to home
          $window.location.href = '#!/';
        }
        return $q.reject(rejection);
      }
    };
  }]);
}]);
