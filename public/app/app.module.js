var app = angular.module("stageAlpha", ["ngRoute", "chart.js"]);

app.config(['$routeProvider', '$locationProvider', '$httpProvider', 'ChartJsProvider',
    function($routeProvider, $locationProvider, $httpProvider, ChartJsProvider) {
    
    $routeProvider
    .when("/", { templateUrl: "views/home.html" })
    .when("/equipment", { templateUrl: "views/equipment.html", controller: "HardwareState" })
    .when("/login", { templateUrl: "views/login.html", controller: "AuthState" })
    .when("/register", { templateUrl: "views/register.html", controller: "AuthState" })
    .when("/booking", { templateUrl: "views/booking.html", controller: "BookingState" })
    .when("/my-bookings", { templateUrl: "views/booking-status.html", controller: "MyBookingsState" })
    .when("/admin", { templateUrl: "views/admin.html", controller: "AdminConsoleState" })
    .otherwise({ redirectTo: "/" });

    $locationProvider.html5Mode(true);

    // Register the JWT auth interceptor
    $httpProvider.interceptors.push('AuthInterceptor');

    ChartJsProvider.setOptions({
        responsive: true,
        maintainAspectRatio: false,
        fontColor: '#9a9a9a',
        elements: {
            line: { tension: 0.4 },
            point: { radius: 0, hitRadius: 10, hoverRadius: 4 }
        },
        tooltips: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFontColor: '#ffffff',
            bodyFontColor: '#ffffff',
            cornerRadius: 4,
            displayColors: false
        }
    });
}]);

// Global root scope helpers for navbar auth state
app.run(['$rootScope', 'AuthService', '$location', function($rootScope, AuthService, $location) {
    $rootScope.isLoggedIn = function() { return AuthService.isLoggedIn(); };
    $rootScope.isAdmin = function() { return AuthService.isAdmin(); };
    $rootScope.currentUser = function() { return AuthService.getUser(); };
    $rootScope.logout = function() {
        AuthService.logout();
        $location.path('/');
    };
}]);
