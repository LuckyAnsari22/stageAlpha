'use strict';
angular.module('stageAlpha')
.factory('ApiService', ['$http', '$q', function($http, $q) {
  var baseUrl = '/api/v1';
  return {
    get: function(path, config) { return $http.get(baseUrl + path, config); },
    post: function(path, data, config) { return $http.post(baseUrl + path, data, config); },
    put: function(path, data, config) { return $http.put(baseUrl + path, data, config); },
    patch: function(path, data, config) { return $http.patch(baseUrl + path, data, config); },
    delete: function(path, config) { return $http.delete(baseUrl + path, config); }
  };
}]);
