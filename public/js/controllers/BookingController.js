/**
 * BOOKING CONTROLLER - SESSION 09
 * 
 * Multi-step booking form for customers.
 * 
 * Flow: Event details → Cart review → Personal details → Confirmation
 * 
 * Key features:
 * - Real-time price calculation when event date changes
 * - Algorithm price displayed transparently (with confidence level)
 * - Multi-step validation (can't proceed unless all fields on current step valid)
 * - Error recovery: if booking fails, show which items are out of stock
 * 
 * Teaching patterns:
 * - State machine pattern: maintain currentStep, only allow transitions that pass validation
 * - $watch for reactive updates (when date changes, re-fetch prices)
 * - CartService integration: shares state across controllers
 * - Transaction-like UX: validate → show summary → confirm → submit
 */

angular.module('stageAlpha')
  .controller('BookingController', [
    '$scope',
    '$location',
    'ApiService',
    'CartService',
    'AuthService',
    'ToastService',
    function($scope, $location, ApiService, CartService, AuthService, ToastService) {

      // ========================================================================
      // STATE INITIALIZATION
      // ========================================================================

      /**
       * Current step in the booking form.
       * 1 = event details, 2 = cart review, 3 = customer details, 4 = confirmation
       * @type {number}
       */
      $scope.currentStep = 1;

      /**
       * STEP 1: Event details form data
       * @type {Object}
       */
      $scope.eventDetails = {
        event_date: null,
        event_type: null, // 'wedding', 'corporate', 'concert', 'private_party', etc.
        venue_id: null
      };

      /**
       * STEP 3: Customer details form data
       * Pre-filled if user is logged in
       * @type {Object}
       */
      $scope.customerDetails = {
        name: AuthService.getUser()?.name || '',
        special_requests: ''
      };

      /**
       * Dropdown options for event type
       * @type {Array}
       */
      $scope.eventTypes = [
        { value: 'wedding', label: 'Wedding' },
        { value: 'corporate', label: 'Corporate Event' },
        { value: 'concert', label: 'Concert / Music Event' },
        { value: 'conference', label: 'Conference / Seminar' },
        { value: 'private_party', label: 'Private Party' },
        { value: 'exhibition', label: 'Exhibition' },
        { value: 'other', label: 'Other' }
      ];

      /**
       * Dropdown options for venues
       * Loaded from API on init
       * @type {Array}
       */
      $scope.venues = [];

      /**
       * Cart items (from CartService)
       * Shape: [{id, name, category_name, qty, base_price, algorithm_price, confidence_level}, ...]
       * @type {Array}
       */
      $scope.cartItems = [];

      /**
       * Price summary
       * @type {Object}
       */
      $scope.priceSummary = {
        subtotal: 0,
        gst: 0,
        total: 0
      };

      /**
       * Items that are out of stock
       * Set after validation error
       * @type {Array<number>}
       */
      $scope.outOfStockItems = [];

      /**
       * Is the booking currently being submitted?
       * For disabling submit button while request in flight
       * @type {boolean}
       */
      $scope.isSubmitting = false;

      /**
       * Error message (if booking failed)
       * @type {string | null}
       */
      $scope.bookingError = null;

      /**
       * Success: the booking ID that was created
       * Display in step 4
       * @type {string | null}
       */
      $scope.bookingId = null;

      /**
       * Minimum event date (today + 1 day)
       * HTML5 input type="date" uses this attribute
       * @type {string} ISO format "YYYY-MM-DD"
       */
      $scope.minEventDate = (function() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      })();

      // ========================================================================
      // INITIALIZATION
      // ========================================================================

      /**
       * Load initial data: venues, cart items
       */
      function initialize() {
        // Load venues dropdown
        ApiService.get('/venues')
          .then(function(response) {
            $scope.venues = response.data.data;
          })
          .catch(function(err) {
            ToastService.error('Failed to load venues');
          });

        // Load cart items from CartService
        refreshCartItems();
      }

      /**
       * Refresh cart items from CartService
       * Called on init and after price updates
       */
      function refreshCartItems() {
        $scope.cartItems = CartService.getItems();
        calculateTotal();
      }

      // ========================================================================
      // STEP VALIDATION & NAVIGATION
      // ========================================================================

      /**
       * Validate current step before allowing next
       * 
       * Step 1 validation: event_date, event_type, venue_id all required
       * Step 2 validation: cart not empty (CartService.count() > 0)
       * Step 3 validation: customer name required, not empty
       * 
       * @param {number} step - Which step to validate
       * @returns {boolean} - True if step is valid
       */
      function validateStep(step) {
        if (step === 1) {
          // Event details required
          if (!$scope.eventDetails.event_date) {
            ToastService.warning('Please select an event date');
            return false;
          }
          if (!$scope.eventDetails.event_type) {
            ToastService.warning('Please select an event type');
            return false;
          }
          if (!$scope.eventDetails.venue_id) {
            ToastService.warning('Please select a venue');
            return false;
          }
          return true;
        }

        if (step === 2) {
          // Cart must have items
          if ($scope.cartItems.length === 0) {
            ToastService.warning('Your booking cart is empty');
            return false;
          }
          return true;
        }

        if (step === 3) {
          // Customer name required
          if (!$scope.customerDetails.name || $scope.customerDetails.name.trim().length === 0) {
            ToastService.warning('Please enter your name');
            return false;
          }
          return true;
        }

        return true;
      }

      /**
       * Move to the next step if current step validates
       * 
       * Special behavior on step 1 → 2 transition:
       * - Update cart event date in CartService
       * - Trigger price refresh for all items
       */
      $scope.nextStep = function() {
        if (!validateStep($scope.currentStep)) {
          return;
        }

        // Special: on step 1 → 2, update cart event date
        if ($scope.currentStep === 1) {
          CartService.setEventDate($scope.eventDetails.event_date);
          refreshCartItems(); // Reload updated prices
        }

        $scope.currentStep++;
        $scope.outOfStockItems = [];
        $scope.bookingError = null;
      };

      /**
       * Move to previous step
       */
      $scope.previousStep = function() {
        if ($scope.currentStep > 1) {
          $scope.currentStep--;
          $scope.bookingError = null;
        }
      };

      // ========================================================================
      // PRICE CALCULATION
      // ========================================================================

      /**
       * Calculate total price (subtotal + GST)
       * 
       * GST = 18% (Indian tax)
       * Called whenever cart changes or prices update
       */
      function calculateTotal() {
        // Subtotal = sum of (algorithm_price * qty) for each item
        const subtotal = $scope.cartItems.reduce(function(sum, item) {
          return sum + (item.algorithm_price * item.qty);
        }, 0);

        // GST = 18% of subtotal
        const gst = subtotal * 0.18;
        const total = subtotal + gst;

        $scope.priceSummary = {
          subtotal: Math.round(subtotal),
          gst: Math.round(gst),
          total: Math.round(total)
        };
      }

      /**
       * Called when user updates quantity in Step 2
       * Recalculates total immediately
       */
      $scope.updateQuantity = function(equipmentId, newQty) {
        if (newQty < 1) newQty = 1;
        CartService.updateQty(equipmentId, newQty);
        refreshCartItems();
      };

      /**
       * Remove item from cart during Step 2
       */
      $scope.removeFromCart = function(equipmentId) {
        CartService.remove(equipmentId);
        refreshCartItems();

        if ($scope.cartItems.length === 0) {
          ToastService.info('Your cart is now empty. Going back to equipment list.');
          $location.path('/equipment');
        }
      };

      // ========================================================================
      // WATCH FOR EVENT DATE CHANGES
      // ========================================================================

      /**
       * When event_date changes (Step 1), refresh cart prices
       * 
       * Why $watch instead of ng-change?
       * - $watch is cleaner than adding ng-change to the HTML element
       * - Automatically fires on initialization if value is pre-set
       * - Allows testing without DOM events
       * 
       * Why deep watch (third param: true)?
       * - For objects, deep watch compares properties recursively
       * - Here: we just need reference equality (shallow is fine)
       * - Use shallow: $watch('eventDetails.event_date', ..., false)
       */
      $scope.$watch('eventDetails.event_date', function(newDate, oldDate) {
        // Only refresh if date actually changed
        if (!newDate || newDate === oldDate) return;

        // Update cart event date → triggers price refresh in CartService
        CartService.setEventDate(newDate);

        // Reload item prices
        refreshCartItems();

        ToastService.info('Equipment prices updated for ' + newDate);
      });

      // ========================================================================
      // SUBMIT BOOKING
      // ========================================================================

      /**
       * Submit the booking
       * 
       * Flow:
       * 1. POST /api/v1/bookings with event details + items
       * 2. On success: display confirmation (Step 4)
       * 3. On error: handle stock errors specifically
       * 
       * POST body shape:
       * {
       *   event_date,
       *   event_type,
       *   venue_id,
       *   items: [{equipment_id, qty}, ...],
       *   special_requests,
       *   customer_name
       * }
       */
      $scope.submitBooking = function() {
        // Final validation
        if (!validateStep(3)) {
          return;
        }

        $scope.isSubmitting = true;
        $scope.bookingError = null;
        $scope.outOfStockItems = [];

        // Prepare request body
        const bookingData = {
          event_date: $scope.eventDetails.event_date,
          event_type: $scope.eventDetails.event_type,
          venue_id: parseInt($scope.eventDetails.venue_id),
          special_requests: $scope.customerDetails.special_requests,
          customer_name: $scope.customerDetails.name,
          items: $scope.cartItems.map(function(item) {
            return {
              equipment_id: item.id,
              qty: item.qty
            };
          })
        };

        // POST to backend
        ApiService.post('/bookings', bookingData)
          .then(function(response) {
            // Success!
            const bookingId = response.data.data.id;
            $scope.bookingId = bookingId;
            $scope.currentStep = 4; // Confirmation step

            ToastService.success('Booking created successfully!');
            CartService.clear(); // Clear cart

            // Auto-navigate to booking status page after 3 seconds
            setTimeout(function() {
              $location.path('/booking/' + bookingId);
            }, 3000);
          })
          .catch(function(err) {
            $scope.isSubmitting = false;

            // Handle specific error types
            if (err.data?.code === 'INSUFFICIENT_STOCK') {
              // Backend returned list of items with insufficient stock
              $scope.outOfStockItems = err.data.out_of_stock_items || [];
              $scope.bookingError = 'Some items are out of stock. Please reduce quantities or remove items.';
              $scope.currentStep = 2; // Go back to cart review
              ToastService.error($scope.bookingError);
            } else {
              $scope.bookingError = err.data?.message || 'Failed to create booking';
              ToastService.error($scope.bookingError);
            }
          });
      };

      /**
       * Confirmation Step 4: navigate to booking status page
       */
      $scope.viewBooking = function() {
        $location.path('/booking/' + $scope.bookingId);
      };

      /**
       * From confirmation page: continue shopping
       */
      $scope.continueShopping = function() {
        $location.path('/equipment');
      };

      // ========================================================================
      // CONFIDENCE LEVEL BADGE STYLING
      // ========================================================================

      /**
       * Map confidence level to badge class
       * Used in template: ng-class="confidenceClass(item.confidence_level)"
       * @param {string} level - 'HIGH', 'MEDIUM', or 'LOW'
       * @returns {string} - CSS class name for badge
       */
      $scope.confidenceClass = function(level) {
        const map = {
          'HIGH': 'badge-success',
          'MEDIUM': 'badge-warning',
          'LOW': 'badge-danger'
        };
        return map[level] || 'badge-muted';
      };

      /**
       * Confidence description for tooltip/hover
       * @param {string} level
       * @returns {string} - Human-readable description
       */
      $scope.confidenceText = function(level) {
        const map = {
          'HIGH': 'Price estimate is highly confident (10+ historical bookings, r² > 0.7)',
          'MEDIUM': 'Price estimate is moderately confident (5-9 bookings, r² > 0.4)',
          'LOW': 'Price estimate is low confidence (< 5 bookings, using defaults)'
        };
        return map[level] || 'Confidence level unknown';
      };

      /**
       * Price difference text for template
       * Example: "+12%" or "-5%"
       * @param {Object} item - Cart item
       * @returns {string}
       */
      $scope.priceUpliftText = function(item) {
        if (!item.base_price || !item.algorithm_price) return '';
        const pct = ((item.algorithm_price - item.base_price) / item.base_price) * 100;
        return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
      };

      // ========================================================================
      // INITIALIZATION (Run on controller load)
      // ========================================================================

      initialize();

      /**
       * Teaching Summary: Multi-Step Form Patterns
       * 
       * 1. STATE MACHINE
       *    - currentStep ranges 1-4
       *    - Each transition validated before allowing (nextStep checks validateStep)
       *    - Only one step shows at a time (ng-show="currentStep === N")
       *    - Breadcrumb/stepper shows progress visually
       * 
       * 2. REACTIVE DATA BINDING
       *    - $watch on eventDetails.event_date triggers price refresh
       *    - CartService updates flow through refreshCartItems() → UI updates
       *    - $scope.cartItems is the source-of-truth for display
       * 
       * 3. PROGRESSIVE FORM DISCLOSURE
       *    - Don't show all steps at once (overwhelming)
       *    - Step 4 only appears after valid submission
       *    - Each step collects specific information, validates, moves forward
       * 
       * 4. ERROR RECOVERY
       *    - Specific error code handling (INSUFFICIENT_STOCK)
       *    - Highlight affected items
       *    - Return to relevant step (cart review for stock issues)
       *    - Don't crash, show helpful messages
       * 
       * 5. PRICE TRANSPARENCY
       *    - Show BOTH base_price and algorithm_price
       *    - Confidence badge explains how reliable the algorithm price is
       *    - GST breakdown explicit (not hidden)
       *    - Total = subtotal + GST (no surprise fees)
       * 
       * 6. INTEGRATION PATTERNS
       *    - CartService: shared across EquipmentListController, BookingController
       *    - AuthService: pre-fill customer name if logged in
       *    - ApiService: normalize all HTTP responses to {success, data, message}
       *    - ToastService: non-intrusive user feedback
       */

    }
  ]);
