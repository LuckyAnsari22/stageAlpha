/**
 * NAVCONTROLLER — Application navigation and auth state display
 * 
 * Purpose:
 * The navbar displays differently based on authentication status:
 * - Not logged in: Show "Sign In" button
 * - Logged in: Show user name + "Sign Out" button + cart badge
 * - Admin user: Show "Admin" link in nav menu
 * 
 * This controller manages that reactive state.
 * 
 * Injection pattern:
 * Dependencies: $scope (child scope for this navbar element),
 *               $location (for navigation),
 *               $rootScope (for app-wide events),
 *               AuthService (for auth checks),
 *               CartService (for cart item count)
 */

angular.module('stageAlpha')
  .controller('NavController', 
    ['$scope', '$location', '$rootScope', 'AuthService', 'CartService', 'ToastService',
      function($scope, $location, $rootScope, AuthService, CartService, ToastService) {

      /**
       * REACTIVE STATE — These change when auth state changes
       */
      
      /**
       * Is user currently logged in?
       * AuthService.isLoggedIn() checks localStorage for token
       * We store it in $scope so the template can ng-bind it
       */
      $scope.isLoggedIn = function() {
        return AuthService.isLoggedIn();
      };

      /**
       * Is current user an admin?
       * Used to ng-show the "Admin" link in the navbar
       */
      $scope.isAdmin = function() {
        return AuthService.isAdmin();
      };

      /**
       * Current logged-in user data
       * { id, name, email, role }
       */
      $scope.currentUser = function() {
        return AuthService.getUser();
      };

      /**
       * Cart item count badge
       * Watches CartService for changes
       */
      $scope.cartCount = function() {
        return CartService.getCount();
      };

      /**
       * EVENTS — Listen for changes from other parts of the app
       */

      /**
       * When user logs in successfully:
       * - AuthService broadcasts 'auth:login' on $rootScope
       * - We catch it and update local state
       */
      $scope.$on('auth:login', function(event, user) {
        $scope.currentUser = user;
      });

      /**
       * When user logs out:
       * - AuthService broadcasts 'auth:logout' on $rootScope
       * - We catch it and clear local state
       */
      $scope.$on('auth:logout', function() {
        $scope.currentUser = null;
        $location.path('/');
      });

      /**
       * When cart changes:
       * - CartService broadcasts 'cart:updated' on $rootScope
       * - We catch it so cart count badge updates
       * - AngularJS automatically re-evaluates $scope.cartCount()
       */
      $scope.$on('cart:updated', function() {
        // Force digest cycle to update cart count display
        $scope.$apply();
      });

      /**
       * ACTIONS
       */

      /**
       * Handle user logout
       * 1. Clear auth state from AuthService
       * 2. Clear localStorage
       * 3. Broadcast auth:logout event
       * 4. Navigate to home
       */
      $scope.logout = function() {
        AuthService.logout();
        ToastService.info('Signed out successfully');
        $location.path('/');
      };

      /**
       * Navigate to a route
       * Used for: ng-click="goTo('/equipment')"
       */
      $scope.goTo = function(path) {
        $location.path(path);
      };

      /**
       * Initialize on load:
       * Try to restore user session from localStorage
       * This runs when the page loads or refreshes
       */
      function init() {
        // AuthService constructor already did this, but be explicit
        if (AuthService.isLoggedIn()) {
          ToastService.info('Session restored');
        }
      }

      init();

    }]);
