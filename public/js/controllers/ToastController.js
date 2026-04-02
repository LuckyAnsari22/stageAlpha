/**
 * TOASTCONTROLLER — Display toast notifications
 * 
 * Purpose:
 * This controller watches ToastService and displays toasts that bubbled up.
 * It's injected into the navbar/main layout where the toast container lives.
 * 
 * Context in index.html:
 * <div class="toast-container" ng-controller="ToastController">
 *   <div class="toast toast--{{toast.type}}" ng-repeat="toast in toasts">
 *     <span>{{toast.message}}</span>
 *   </div>
 * </div>
 * 
 * How it works:
 * 1. ToastService.success('Item saved') is called from a controller
 * 2. Service pushes { id, type: 'success', message: 'Item saved' } to $rootScope.toasts
 * 3. ToastController has access to $rootScope (inherited from parent scope)
 * 4. ng-repeat watches $rootScope.toasts and renders each one
 * 5. CSS class toast--success applies green styling
 * 6. After 4 seconds, service removes the toast
 * 7. ng-repeat detects the removal and un-renders the DOM element
 */

angular.module('stageAlpha')
  .controller('ToastController', ['$scope', 'ToastService', function($scope, ToastService) {

    /**
     * The toasts array lives on $rootScope (injected by ToastService)
     * We don't set it here — ToastService manages it
     * We just make sure $scope inherits from $rootScope
     * 
     * Because this controller is a child of a controller that has access to $rootScope,
     * the ng-repeat in the view can watch $rootScope.toasts directly
     * OR via $scope.$root.toasts
     */

    /**
     * In the template, the ng-repeat looks like:
     * ng-repeat="toast in toasts"
     * 
     * This automatically resolves to $rootScope.toasts because:
     * - AngularJS looks in $scope.toasts first (doesn't exist here)
     * - Then looks in $rootScope.toasts (found!)
     * - Watches for changes and updates the view reactively
     */

  }]);
