'use strict';
angular.module('stageAlpha')
.factory('AuthService', ['$window', function($window) {
  var tokenKey = 'sa_access_token';
  var userKey = 'sa_user';

  function parseJwt(token) {
    try {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  return {
    setToken: function(token) { $window.localStorage.setItem(tokenKey, token); },
    getToken: function() { return $window.localStorage.getItem(tokenKey); },
    setUser: function(user) { $window.localStorage.setItem(userKey, JSON.stringify(user)); },
    getUser: function() {
      var u = $window.localStorage.getItem(userKey);
      return u ? JSON.parse(u) : null;
    },
    logout: function() {
      $window.localStorage.removeItem(tokenKey);
      $window.localStorage.removeItem(userKey);
    },
    isLoggedIn: function() {
      var token = this.getToken();
      if (!token) return false;
      var decoded = parseJwt(token);
      if (!decoded) return false;
      if (decoded.exp * 1000 < Date.now()) {
        this.logout();
        return false;
      }
      return true;
    },
    isAdmin: function() {
      if (!this.isLoggedIn()) return false;
      var token = this.getToken();
      var decoded = parseJwt(token);
      return decoded && decoded.role && (decoded.role === 'admin' || decoded.role === 'manager');
    }
  };
}]);
