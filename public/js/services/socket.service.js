'use strict';
angular.module('stageAlpha')
.factory('SocketService', ['AuthService', '$rootScope', function(AuthService, $rootScope) {
  var socket = null;

  function init() {
    if (typeof io === 'undefined') return;
    if (socket) return;
    
    var token = AuthService.getToken();
    if (!token) return;

    socket = io({ auth: { token: token } });

    socket.on('connect', function() {
      console.log('Socket connected');
    });

    socket.on('notification', function(data) {
      $rootScope.$broadcast('notification:new', data);
      // Let ToastService show it directly or through a toast controller, but we can emit a generic event
      if ($rootScope.$$phase) {
        $rootScope.$broadcast('toast:show', { message: data.title + ': ' + data.message, type: 'info' });
      } else {
        $rootScope.$apply(function() {
          $rootScope.$broadcast('toast:show', { message: data.title + ': ' + data.message, type: 'info' });
        });
      }
    });

    socket.on('price_update', function(data) {
      $rootScope.$broadcast('price:updated', data);
    });

    socket.on('stock_update', function(data) {
      $rootScope.$broadcast('stock:updated', data);
    });
  }

  return {
    init: init,
    disconnect: function() {
      if (socket) { socket.disconnect(); socket = null; }
    },
    getSocket: function() { return socket; }
  };
}]);
