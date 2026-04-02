angular.module('stageAlpha').service('SocketService', ['$rootScope', function($root) {
  var socket = null;

  this.connect = function() {
    if (socket) return;
    socket = io();
    socket.on('connect', function() { console.log('Socket.IO connected'); });
    socket.on('disconnect', function() { console.log('Socket.IO disconnected'); });
  };

  this.on = function(event, callback) {
    if (!socket) this.connect();
    socket.on(event, function() {
      var args = arguments;
      $root.$apply(function() { callback.apply(socket, args); });
    });
  };

  this.off = function(event) { if (socket) socket.off(event); };
  this.emit = function(event, data) { if (socket) socket.emit(event, data); };
  this.disconnect = function() { if (socket) { socket.disconnect(); socket = null; } };
}]);
