angular.module('stageAlpha').service('ToastService', ['$rootScope', '$timeout', function($root, $timeout) {
  $root.toasts = [];
  var id = 0;

  function show(message, type, duration) {
    var toast = { id: ++id, message: message, type: type || 'info', closing: false };
    $root.toasts.push(toast);
    $timeout(function() {
      toast.closing = true;
      $timeout(function() {
        $root.toasts = $root.toasts.filter(function(t) { return t.id !== toast.id; });
      }, 250);
    }, duration || 4000);
  }

  this.success = function(msg) { show(msg, 'success'); };
  this.error   = function(msg) { show(msg, 'error', 6000); };
  this.info    = function(msg) { show(msg, 'info'); };
}]);
