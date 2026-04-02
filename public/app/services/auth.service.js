angular.module('stageAlpha').service('AuthService', ['$http', '$window', function($http, $window) {
    var self = this;
    
    self.register = function(data) {
        return $http.post('/api/auth/register', data);
    };
    
    self.login = function(data) {
        return $http.post('/api/auth/login', data);
    };
    
    self.saveToken = function(token, user) {
        $window.localStorage.setItem('sa_token', token);
        $window.localStorage.setItem('sa_user', JSON.stringify(user));
    };
    
    self.getToken = function() {
        return $window.localStorage.getItem('sa_token');
    };
    
    self.getUser = function() {
        var u = $window.localStorage.getItem('sa_user');
        return u ? JSON.parse(u) : null;
    };
    
    self.isLoggedIn = function() {
        return !!self.getToken();
    };
    
    self.isAdmin = function() {
        var u = self.getUser();
        return u && u.role === 'admin';
    };
    
    self.logout = function() {
        $window.localStorage.removeItem('sa_token');
        $window.localStorage.removeItem('sa_user');
    };
}]);

// HTTP Interceptor — auto-attach Authorization header to all API requests
angular.module('stageAlpha').factory('AuthInterceptor', ['$window', '$q', function($window, $q) {
    return {
        request: function(config) {
            var token = $window.localStorage.getItem('sa_token');
            if (token) {
                config.headers.Authorization = 'Bearer ' + token;
            }
            return config;
        },
        responseError: function(response) {
            if (response.status === 401) {
                $window.localStorage.removeItem('sa_token');
                $window.localStorage.removeItem('sa_user');
                $window.location.href = '/login';
            }
            return $q.reject(response);
        }
    };
}]);
