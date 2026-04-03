'use strict';
angular.module('stageAlpha')
.factory('ToastService', ['$rootScope', function($rootScope) {
  return {
    show: function(message, type) {
      // type can be 'success', 'error', 'info', 'warning'
      $rootScope.$broadcast('toast:show', {
        message: message,
        type: type || 'info'
      });
    }
  };
}])
.controller('ToastController', ['$scope', '$timeout', function($scope, $timeout) {
  $scope.toasts = [];
  var toastId = 0;

  $scope.$on('toast:show', function(event, data) {
    var id = ++toastId;
    var t = { id: id, message: data.message, type: data.type, closing: false };
    $scope.toasts.push(t);

    $timeout(function() {
      var idx = $scope.toasts.findIndex(function(x) { return x.id === id; });
      if (idx > -1) {
        $scope.toasts[idx].closing = true;
        // Wait for animation to finish before removing
        $timeout(function() {
          var removeIdx = $scope.toasts.findIndex(function(x) { return x.id === id; });
          if (removeIdx > -1) $scope.toasts.splice(removeIdx, 1);
        }, 300);
      }
    }, 4000);
  });
}]);
