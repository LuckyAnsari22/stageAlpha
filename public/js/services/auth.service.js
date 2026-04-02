angular.module('stageAlpha').service('AuthService', ['$window', 'ApiService', function($window, Api) {
  var TOKEN_KEY = 'sa_access_token';
  var USER_KEY  = 'sa_user';

  this.login = function(email, password) {
    return Api.post('/auth/login', { email: email, password: password }).then(function(res) {
      $window.localStorage.setItem(TOKEN_KEY, res.data.data.access_token);
      $window.localStorage.setItem(USER_KEY, JSON.stringify(res.data.data.user));
      return res.data.data;
    });
  };

  this.register = function(data) {
    return Api.post('/auth/register', data).then(function(res) {
      $window.localStorage.setItem(TOKEN_KEY, res.data.data.access_token);
      $window.localStorage.setItem(USER_KEY, JSON.stringify(res.data.data.user));
      return res.data.data;
    });
  };

  this.logout = function() {
    Api.post('/auth/logout', {}).catch(function(){});
    $window.localStorage.removeItem(TOKEN_KEY);
    $window.localStorage.removeItem(USER_KEY);
    $window.location.href = '#!/login';
  };

  this.isLoggedIn = function() {
    var token = $window.localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > (Date.now() / 1000);
    } catch(e) { return false; }
  };

  this.getUser = function() {
    try { return JSON.parse($window.localStorage.getItem(USER_KEY)); } catch(e) { return null; }
  };

  this.isAdmin = function() {
    var user = this.getUser();
    return user && user.role === 'admin';
  };
}]);
