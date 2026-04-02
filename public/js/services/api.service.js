angular.module('stageAlpha').service('ApiService', ['$http', function($http) {
  var BASE = '/api/v1';
  this.get    = function(url, config)      { return $http.get(BASE + url, config); };
  this.post   = function(url, data)        { return $http.post(BASE + url, data); };
  this.put    = function(url, data)        { return $http.put(BASE + url, data); };
  this.patch  = function(url, data)        { return $http.patch(BASE + url, data); };
  this.delete = function(url)             { return $http.delete(BASE + url); };
}]);
