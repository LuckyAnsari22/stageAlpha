'use strict';
angular.module('stageAlpha')
.factory('SocketService', ['AuthService', '$rootScope', function(AuthService, $rootScope) {
  var socket = null;
  var listeners = {};

  function init() {
    if (typeof io === 'undefined') return;
    if (socket) return;
    
    var token = AuthService.getToken();
    if (!token) return;

    socket = io({ auth: { token: token } });

    socket.on('connect', function() {
      console.log('Socket connected');
      if (listeners.connect) {
        listeners.connect.forEach(function(cb) { cb(); });
      }
    });

    socket.on('disconnect', function() {
      console.log('Socket disconnected');
      if (listeners.disconnect) {
        listeners.disconnect.forEach(function(cb) { cb(); });
      }
    });

    socket.on('notification:new', function(data) {
      $rootScope.$broadcast('notification:new', data);
      if (listeners['notification:new']) {
        listeners['notification:new'].forEach(function(cb) { cb(data); });
      }
    });

    socket.on('price:updated', function(data) {
      $rootScope.$broadcast('price:updated', data);
      if (listeners['price:updated']) {
        listeners['price:updated'].forEach(function(cb) { cb(data); });
      }
    });

    socket.on('inventory:updated', function(data) {
      $rootScope.$broadcast('inventory:updated', data);
      if (listeners['inventory:updated']) {
        listeners['inventory:updated'].forEach(function(cb) { cb(data); });
      }
    });

    socket.on('inventory:changed', function(data) {
      if (listeners['inventory:changed']) {
        listeners['inventory:changed'].forEach(function(cb) { cb(data); });
      }
    });

    socket.on('booking:new', function(data) {
      if (listeners['booking:new']) {
        listeners['booking:new'].forEach(function(cb) { cb(data); });
      }
    });

    socket.on('dashboard:update', function(data) {
      if (listeners['dashboard:update']) {
        listeners['dashboard:update'].forEach(function(cb) { cb(data); });
      }
    });

    socket.on('admin:connection-status', function(data) {
      if (listeners['admin:connection-status']) {
        listeners['admin:connection-status'].forEach(function(cb) { cb(data); });
      }
    });

    socket.on('telemetry:stream', function(data) {
      if (listeners['telemetry:stream']) {
        listeners['telemetry:stream'].forEach(function(cb) { cb(data); });
      }
    });
  }

  return {
    init: init,
    disconnect: function() {
      if (socket) { socket.disconnect(); socket = null; }
    },
    getSocket: function() { return socket; },
    emit: function(event, data) {
      if (socket) socket.emit(event, data);
    },
    on: function(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
      
      // Also directly attach to socket if already initialized
      if (socket && event !== 'connect' && event !== 'disconnect') {
        // Already handled in init()
      }
    },
    off: function(event, callback) {
      if (listeners[event]) {
        var idx = listeners[event].indexOf(callback);
        if (idx > -1) listeners[event].splice(idx, 1);
      }
    }
  };
}]);

