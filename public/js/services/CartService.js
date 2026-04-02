/**
 * CARTSERVICE - Shopping Cart State Management
 * 
 * Responsibilities:
 * 1. Persist cart to localStorage (survives page refresh)
 * 2. Manage cart items: add, remove, update quantity
 * 3. When event date changes, trigger price refresh for all items
 * 4. Reactive: controllers can listen for changes via events
 * 
 * State machine:
 * - Cart starts empty
 * - User adds items (equipment + quantity + event date)
 * - User picks event date → service fetches new prices for all items
 * - Cart persists until order is placed (then service.clear())
 * 
 * Pattern: Service as state management layer
 * Separates cart logic from UI (AngularJS controllers).
 * Alternative: Redux/Vuex, but AngularJS doesn't have built-in store.
 */

angular.module('stageAlpha')
  .factory('CartService', ['$window', '$http', '$q', '$rootScope', 'ApiService',
    function($window, $http, $q, $rootScope, ApiService) {

    // ===== PRIVATE STATE =====
    let cart = [];
    const STORAGE_KEY = 'stageAlpha_cart';
    let eventDate = null;

    // Load cart from localStorage on service instantiation
    const savedCart = $window.localStorage.getItem(STORAGE_KEY);
    if (savedCart) {
      try {
        cart = JSON.parse(savedCart);
      } catch (e) {
        console.error('Failed to load cart from localStorage:', e);
        cart = [];
      }
    }

    /**
     * Helper: Save cart to localStorage
     * Called after any mutation (add/remove/update)
     */
    function persistCart() {
      $window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      // Broadcast to other parts of app that cart changed
      $rootScope.$broadcast('cart:updated', cart);
    }

    /**
     * Helper: Refresh prices for all items in cart
     * Called when event date changes.
     * 
     * For each item in cart:
     *   Call GET /api/v1/equipment/:id/price?event_date=...
     *   Replace item.algorithm_price with the new value
     * 
     * This is where the pricing engine is invoked!
     * The server-side stored procedure calculate_optimal_price() runs.
     * 
     * @returns {Promise} Resolves when all prices fetched
     */
    function refreshPricesForDate(date) {
      if (!date || cart.length === 0) return $q.when();

      // Build promises for all price fetches
      const pricePromises = cart.map(function(item) {
        return ApiService.get('/equipment/' + item.id + '/price', { event_date: date })
          .then(function(response) {
            if (response.success && response.data) {
              // Update this item's price info
              const priceData = response.data;
              item.algorithm_price = priceData.optimal_price;
              item.base_price = priceData.base_price;
              item.confidence_level = priceData.confidence_level;
              item.elasticity_coeff = priceData.elasticity_coeff;
              item.price_breakdown = priceData.breakdown; // For display

              return item;
            } else {
              console.warn('Failed to fetch price for equipment', item.id, response.message);
              return item;
            }
          })
          .catch(function(error) {
            console.error('Price fetch error for item', item.id, error);
            return item;
          });
      });

      // Wait for all prices, then persist and broadcast
      return $q.all(pricePromises)
        .then(function() {
          persistCart();
          $rootScope.$broadcast('prices:refreshed', cart);
        });
    }

    // =====================================================
    // PUBLIC API
    // =====================================================

    return {

      /**
       * ADD ITEM TO CART
       * @param {Object} item - Equipment object with { id, name, category_name, base_price, stock_qty }
       * @param {Number} qty - Quantity to add
       * @param {String} eventDate - Date of the event (ISO format: 2025-12-15)
       * @returns {Promise}
       * 
       * Usage:
       *   CartService.add(equipmentItem, 2, '2025-12-15')
       *     .then(() => console.log('Item added'));
       * 
       * Behavior:
       *   - If item already in cart: update quantity
       *   - If new item: add it
       *   - Then fetch prices for this date
       */
      add: function(item, qty, eventDate) {
        // Check if item already in cart
        let existingItem = cart.find(c => c.id === item.id);

        if (existingItem) {
          // Increase quantity
          existingItem.qty = parseInt(existingItem.qty || 1) + parseInt(qty || 1);
        } else {
          // Add new item
          cart.push({
            id: item.id,
            name: item.name,
            category_name: item.category_name,
            base_price: item.base_price,
            algorithm_price: item.base_price, // Temp, will be updated by refreshPrices
            confidence_level: 'MEDIUM',
            qty: parseInt(qty || 1)
          });
        }

        persistCart();

        // If event date provided, refresh prices
        if (eventDate) {
          this.setEventDate(eventDate);
          return refreshPricesForDate(eventDate);
        }

        return $q.when();
      },

      /**
       * REMOVE ITEM FROM CART
       * @param {Number} equipmentId
       */
      remove: function(equipmentId) {
        cart = cart.filter(item => item.id !== equipmentId);
        persistCart();
        $rootScope.$broadcast('cart:item-removed', equipmentId);
      },

      /**
       * UPDATE QUANTITY
       * @param {Number} equipmentId
       * @param {Number} newQty - New quantity (or 0 to remove)
       */
      updateQty: function(equipmentId, newQty) {
        const item = cart.find(c => c.id === equipmentId);
        if (item) {
          if (newQty <= 0) {
            this.remove(equipmentId);
          } else {
            item.qty = parseInt(newQty);
            persistCart();
          }
        }
      },

      /**
       * SET EVENT DATE
       * When user picks event date, we need to refresh prices.
       * 
       * This is the reactive interaction:
       * - User picks date in booking form Step 1
       * - BookingController calls CartService.setEventDate(date)
       * - CartService fetches new prices for all items
       * - UI updates via ng-repeat (prices change reactively)
       * 
       * @param {String} date - ISO format: 2025-12-15
       * @returns {Promise}
       */
      setEventDate: function(date) {
        eventDate = date;
        return refreshPricesForDate(date);
      },

      /**
       * GET EVENT DATE
       * @returns {String} Current event date or null
       */
      getEventDate: function() {
        return eventDate;
      },

      /**
       * GET ALL ITEMS
       * @returns {Array} Cart items
       */
      getItems: function() {
        return cart;
      },

      /**
       * COUNT
       * Return number of items in cart
       * Used for navbar badge: "Cart (3)"
       * 
       * @returns {Number}
       */
      count: function() {
        return cart.length;
      },

      /**
       * GET TOTAL PRICE
       * Sum of (algorithm_price * qty) for all items
       * 
       * @returns {Number} Total in rupees
       */
      getTotal: function() {
        return cart.reduce(function(sum, item) {
          return sum + (item.algorithm_price * item.qty);
        }, 0);
      },

      /**
       * GET TOTAL WITH GST
       * Total including 18% GST (India tax)
       * 
       * @returns {Number}
       */
      getTotalWithGST: function() {
        const subtotal = this.getTotal();
        const gst = subtotal * 0.18;
        return subtotal + gst;
      },

      /**
       * CLEAR CART
       * Called when order is successfully placed
       */
      clear: function() {
        cart = [];
        eventDate = null;
        $window.localStorage.removeItem(STORAGE_KEY);
        $rootScope.$broadcast('cart:cleared');
      },

      /**
       * GET CART DATA FOR API
       * Format cart data for POST to /api/v1/bookings
       * 
       * @returns {Object} Formatted for server
       */
      getForOrder: function() {
        return {
          items: cart.map(item => ({
            equipment_id: item.id,
            qty: item.qty,
            base_price_at_booking: item.base_price,
            algorithm_price_at_booking: item.algorithm_price
          })),
          event_date: eventDate,
          subtotal: this.getTotal(),
          gst_amount: this.getTotal() * 0.18,
          total_price: this.getTotalWithGST()
        };
      },

      /**
       * VALIDATE CART
       * Check: not empty, all items available stock, etc.
       * 
       * @returns {Object} { valid: true/false, message: 'error message' }
       */
      validate: function() {
        if (cart.length === 0) {
          return { valid: false, message: 'Cart is empty' };
        }

        if (!eventDate) {
          return { valid: false, message: 'Event date not set' };
        }

        // In real app, check stock here
        // For now, assume all items are available

        return { valid: true };
      }

    };

  }]);

/**
 * DESIGN PATTERNS EXPLAINED
 * 
 * 1. Why persist to localStorage?
 *    - User picks equipment, adds to cart
 *    - If they refresh page, cart is gone? Bad UX.
 *    - localStorage survives page refresh
 *    - Cart persists for entire browser session (until clear() is called)
 * 
 * 2. Why $rootScope.$broadcast?
 *    - CartService doesn't know about all controllers
 *    - But controllers want to know when cart changes
 *    - $broadcast sends an event that any controller can listen to
 *    - Decoupling: cart doesn't depend on controllers
 * 
 * 3. Reactive price updates (setEventDate)
 *    - User selects date: BookingController calls setEventDate('2025-12-15')
 *    - CartService fetches new prices from API
 *    - Cart is updated with new algorithm_price values
 *    - UI auto-updates via {{ item.algorithm_price }} (Angular binding)
 *    - Result: prices change without page reload
 * 
 * 4. Why getForOrder()?
 *    - Cart structure is internal to service
 *    - API expects specific JSON shape
 *    - This method transforms internal cart → API format
 *    - Isolates API contract from internal state
 * 
 * 5. Why use $q.when() for non-promise returns?
 *    - Methods can return Promise or non-Promise
 *    - $q.when() wraps either into a Promise
 *    - Controllers always call .then() consistently
 *    - Simplifies async/sync handling
 */
