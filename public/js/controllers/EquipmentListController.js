/**
 * EQUIPMENTLISTCONTROLLER - SESSION 07
 * ============================================================================
 * 
 * Manages the equipment catalog page: filtering, sorting, pagination, cart.
 * 
 * KEY LEARNING: This controller demonstrates advanced AngularJS patterns:
 * - Client-side filtering for instant responsiveness (why: 0ms latency)
 * - Real-time updates via Socket.IO (why: inventory changes across users)
 * - $watch for reactive state management (why: single source of truth)
 * - Service integration (why: business logic isolation)
 * - Memory leak prevention (why: $destroy cleanup)
 * 
 * The philosophy: The controller is a "middle person" between View and Services.
 * - View asks controller to do things (ng-click, ng-submit)
 * - Controller asks services for data (ApiService.get)
 * - Services returns data, controller stores in $scope
 * - AngularJS automatically updates view with new $scope data
 * 
 * Never mix concerns: don't do API calls directly in the view (ng-init),
 * don't put business logic in HTML, don't manipulate DOM with jQuery.
 * ============================================================================
 */

/**
 * Array notation DI: ['$scope', 'ApiService', function($scope, ApiService) {}]
 * 
 * WHY? Because minified code breaks named DI:
 * - Original: function($scope, $http) {}
 * - Minified: function(a, b) {}  ← names are lost!
 * - AngularJS can't find $scope or $http anymore
 * 
 * With array notation:
 * - Original: ['$scope', '$http', function($scope, $http) {}]
 * - Array strings are never minified: ['$scope', '$http', function(a, b) {}]
 * - AngularJS reads the array strings, knows to inject $scope and $http
 * - Works even after minification
 * 
 * RULE: Always use array notation in production code.
 * (Some devs skip this in dev, but it's a bad habit.)
 */
angular.module('stageAlpha')
.controller('EquipmentListController', 
['$scope', '$location', '$rootScope', 'ApiService', 'CartService', 'SocketService', 'ToastService',
function($scope, $location, $rootScope, ApiService, CartService, SocketService, ToastService) {

  /**
   * === STATE INITIALIZATION ===
   * 
   * $scope is the MODEL: the single source of truth for this controller.
   * Every variable you put on $scope automatically syncs to the view via {{}} binding.
   * 
   * Difference:
   * - this.equipment = [] (not on $scope, not reactive)
   * - $scope.equipment = [] (on $scope, REACTIVE: view updates when JS changes it)
   * 
   * Equipment array lifecycle:
   * 1. Page loads: $scope.equipment = []  (empty)
   * 2. API call completes: $scope.equipment = [item1, item2, ...]
   * 3. {{equipment.length}} in HTML updates automatically → no manual refresh needed!
   */
  
  // Raw API response (all equipment from server, unfiltered)
  $scope.equipment = [];
  
  // Filtered result (based on current search, category, availability filters)
  // Why separate? Because filtering happens CLIENT-side (instant, no API call)
  // If we modify $scope.equipment directly, we can't recover original items
  // (for example: if you search for "speaker", equipment list shrinks permanently)
  $scope.filteredEquipment = [];
  
  // UI state
  $scope.loading = true;      // Show loading skeletons while fetching
  $scope.error = null;        // Error message (null = no error)
  
  // Filter model (bound to ng-model in filters)
  // WHY nested object? Because it's passed to API as query params: /equipment?search=...
  $scope.filters = {
    category: '',             // Empty string = "all categories"
    search: '',               // Free-text search (name + description)
    availableOnly: false      // Only show items with stock > 0
  };
  
  // Sort model (bound to <select ng-model="sort">)
  $scope.sort = 'name';       // Default: sort by name A-Z
  
  // Pagination state (why: 12 items/page keeps grid readable)
  $scope.currentPage = 1;     // Current page (1-indexed for humans, but slice uses 0-indexed)
  $scope.pageSize = 12;       // Items per page (matches 3-column grid: 4 rows × 3 cols)
  
  // Categories for the filter dropdown
  // Loaded separately (rarely changes, can cache on client after first load)
  $scope.categories = [];

  /**
   * === LOAD CATEGORIES ===
   * 
   * This is a "fire and forget" API call (no handling of the response).
   * Categories populate the <select ng-repeat="cat in categories">.
   * 
   * WHY not wait for this? Because:
   * 1. Page can show while loading (categories dropdown will auto-populate)
   * 2. Equipment loads independently (user can search even before categories appear)
   * 3. Better UX: stuff appears as it's ready, not all-or-nothing
   * 
   * Why ApiService instead of $http?
   * Because ApiService wraps $http with:
   * - Automatic Authorization header injection (via interceptor)
   * - Consistent error handling
   * - Base URL configuration
   * - Response transformation
   */
  ApiService.get('/equipment/categories')
    .then(function(response) {
      // response = { success: true, data: [category1, category2, ...] }
      $scope.categories = response.data;
    })
    // .catch() intentionally omitted: if categories fail to load, page still works
    // (user can search text instead of category filter)

  /**
   * === LOAD EQUIPMENT (Initial + Refresh) ===
   * 
   * This function:
   * 1. Shows loading state (skeleton cards, no content)
   * 2. Calls API with current filters (search, category, etc.)
   * 3. Stores response in $scope.equipment
   * 4. Applies client-side filtering (re-sort and slice)
   * 5. Hides loading state
   * 
   * WHY pass filters to API?
   * Server-side filtering reduces payload:
   * - Customer searches "speaker" → API only sends speakers (not all 200 items)
   * - Faster response, less bandwidth
   * - Server can use database indexes for speed
   * 
   * WHY ALSO do client-side filtering?
   * Because user might change sort AFTER page loads (no new API call needed):
   * - Search "speaker" → get [Speaker A, Speaker B, Speaker C]
   * - User clicks "Price Low to High" → sort locally, instant response
   */
  function loadEquipment() {
    $scope.loading = true;
    
    // GET /api/v1/equipment?search=...&category=...&availableOnly=true
    // $http uses config.params to build query string
    ApiService.get('/equipment', $scope.filters)
      .then(function(response) {
        // Success: store equipment and apply filters
        // response.data.data = [equipment1, equipment2, ...]
        $scope.equipment = response.data;
        
        // Re-apply client-side filtering and sorting
        applyClientFilters();
        
        // Hide loading state (replace skeletons with actual cards)
        $scope.loading = false;
      })
      .catch(function(err) {
        // Error: show error message, hide loading state
        // err.data = { success: false, message: 'Equipment fetch failed' }
        $scope.error = err.data?.message || 'Failed to load equipment';
        $scope.loading = false;
        
        // Note: no spinner after error (user sees error card + retry button)
      });
  }

  /**
   * === CLIENT-SIDE FILTERING AND SORTING ===
   * 
   * This function runs:
   * - On initial load (after API response)
   * - When user types search text (via $watch)
   * - When user changes category filter (via $watch)
   * - When user toggles "available only" (via $watch)
   * - When user changes sort option (via $watch)
   * 
   * WHY client-side filtering?
   * 1. INSTANT RESPONSE: no network latency
   *    (User types "speak" → sees results before releasing the key)
   * 2. PRESERVES STATE: if API call fails, user doesn't lose their data
   * 3. REDUCES SERVER LOAD: 1000 clients filtering locally vs on server
   * 
   * WHY start with [...$scope.equipment]?
   * Because we don't want to modify the original array.
   * Array[...]ary creates a SHALLOW COPY: new array reference, same items inside.
   * Original $scope.equipment stays unchanged.
   * 
   * Example:
   * const original = [1, 2, 3, 4, 5]
   * const copy = [...original]
   * copy.splice(0, 2)  // remove first 2
   * original = [1, 2, 3, 4, 5]  ← unchanged
   * copy = [3, 4, 5]            ← modified
   */
  function applyClientFilters() {
    // Start with all equipment
    let result = [...$scope.equipment];

    /**
     * FILTER 1: Search text (match name OR description, case-insensitive)
     * 
     * Why toLowerCase()?
     * Because "Speaker" !== "speaker" (JavaScript is case-sensitive).
     * By converting both to lowercase, we find matches regardless of capitalization.
     * 
     * Why .includes() instead of regex?
     * Because .includes() is simpler and enough for basic search.
     * (Regex would be faster for complex patterns, but overkill here.)
     * 
     * WHY description?.toLowerCase()?
     * The ?. is optional chaining (new JS feature):
     * - If item.description exists: call .toLowerCase()
     * - If item.description is null/undefined: skip it, don't crash
     * (Without ?. the code would crash: "Cannot read property 'toLowerCase' of undefined")
     */
    if ($scope.filters.search) {
      const q = $scope.filters.search.toLowerCase();
      result = result.filter(function(item) {
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q) || false;
        return nameMatch || descMatch;  // Include if name OR description matches
      });
    }

    /**
     * FILTER 2: Category dropdown
     * Empty string "" means "no filter" (show all categories).
     * */
    if ($scope.filters.category) {
      result = result.filter(function(item) {
        return item.category_id == $scope.filters.category;  // == (not ===) because category_id might be string or int
      });
    }

    /**
     * FILTER 3: Available only checkbox
     * Only include items with stock_qty > 0
     */
    if ($scope.filters.availableOnly) {
      result = result.filter(function(item) {
        return item.stock_qty > 0;
      });
    }

    /**
     * SORTING: Apply sort option
     * 
     * Why not use sort() directly on $scope.equipment?
     * Because Array.sort() modifies the array IN-PLACE.
     * If we sort $scope.equipment, we lose original order forever.
     * By sorting $scope.filteredEquipment, original stays unchanged.
     * 
     * localeCompare: Correct alphabetical sorting in all languages
     * - "Apple".localeCompare("Banana") = -1 (Apple comes first)
     * - Handles accents, special characters correctly
     * - Better than < or > for text
     */
    result.sort(function(a, b) {
      if ($scope.sort === 'price_asc') {
        return a.current_price - b.current_price;  // Ascending: 100, 200, 300
      } else if ($scope.sort === 'price_desc') {
        return b.current_price - a.current_price;  // Descending: 300, 200, 100
      } else {
        // Default: sort by name A-Z
        return a.name.localeCompare(b.name);
      }
    });

    /**
     * PAGINATION RESET
     * 
     * When filters change, go back to page 1.
     * Why? Because showing page 5 of a new filtered result doesn't make sense.
     * Example: search shows 3 results, but you're viewing page 5 (empty).
     * 
     * Also, page 1 shows the most relevant results (highest ranked, lowest price, etc.)
     * Users expect to see new results from the top.
     */
    $scope.filteredEquipment = result;
    $scope.currentPage = 1;
  }

  /**
   * === PAGINATION HELPERS ===
   * 
   * These are functions (not values) because pagination data changes constantly:
   * - Page changes (user clicks Next)
   * - Equipment list changes (user searches)
   * - Page size could change (responsive design)
   * 
   * If we computed $scope.pageCount once at load, it would be stale immediately.
   * By making them functions, they're "live": always return current value.
   */

  /**
   * paginatedEquipment: Get equipment for current page only
   * 
   * Example: 25 items, pageSize=12, currentPage=2
   * - start = (2 - 1) × 12 = 12 (0-indexed)
   * - return items[12] to items[24] (12 items)
   * - HTML shows items 13-24 (1-indexed for humans)
   */
  $scope.paginatedEquipment = function() {
    const start = ($scope.currentPage - 1) * $scope.pageSize;
    const end = start + $scope.pageSize;
    return $scope.filteredEquipment.slice(start, end);
  };

  /**
   * totalPages: How many pages exist?
   * Math.ceil: round up
   * Example: 25 items, pageSize=12 → ceil(25/12) = ceil(2.08) = 3 pages
   */
  $scope.totalPages = function() {
    return Math.ceil($scope.filteredEquipment.length / $scope.pageSize);
  };

  /**
   * pageNumbers: Array of page numbers for <button ng-repeat>
   * Creates [1, 2, 3, 4] if there are 4 pages.
   * Array.from({length: n}, (_, i) => i + 1) is a JS idiom
   * (Array length 3 with indices 0,1,2 → add 1 to each → 1,2,3)
   */
  $scope.pageNumbers = function() {
    const length = $scope.totalPages();
    return Array.from({ length: length }, function(_, i) {
      return i + 1;
    });
  };

  /**
   * === WATCH FOR REACTIVE FILTERING ===
   * 
   * $scope.$watch watches a variable and runs a callback when it changes.
   * 
   * TWO FORMS:
   * 1. $watch('filters', applyClientFilters, true)
   * 2. $watch('sort', applyClientFilters)
   * 
   * DIFFERENCE:
   * - Form 1: true parameter = "deep equality" (watches property changes inside object)
   *   Needed for $scope.filters = {search: '...', category: '...'}
   *   When user types in search → filters.search changes → callback fires
   * 
   * - Form 2: no third parameter = "reference equality" (watches if variable is replaced)
   *   $scope.sort is a string, never has nested properties
   *   When user selects new sort option → sort is replaced → callback fires
   * 
   * WITHOUT WATCH:
   * - User types "speaker"
   * - HTML input updates via ng-model
   * - $scope.filters.search updates
   * - But filtered list doesn't update (stale)
   * - User sees equipment list doesn't change while typing
   * 
   * WITH $watch:
   * - User types "speaker"
   * - AngularJS detects filters changed
   * - Calls applyClientFilters automatically
   * - $scope.filteredEquipment updates
   * - HTML updates via {{filteredEquipment}} in ng-repeat
   * - Instant feedback!
   * 
   * THE DIGEST CYCLE:
   * AngularJS runs $watch checks after every user interaction.
   * It's called the "digest loop" or "dirty checking".
   * (Modern frameworks like React/Vue use virtual DOM or different strategies.)
   */
  
  // Watch the entire filters object for deep changes
  $scope.$watch('filters', applyClientFilters, true);
  
  // Watch sort string for changes
  $scope.$watch('sort', applyClientFilters);

  /**
   * === REAL-TIME INVENTORY UPDATES VIA SOCKET.IO ===
   * 
   * The server pushes inventory changes to all connected clients:
   * "Equipment X now has Y units in stock" (another customer booked one).
   * 
   * SocketService listens for 'inventory:updated' events.
   * When event fires, update the equipment item and re-filter.
   * 
   * Example scenario:
   * 1. User A and User B viewing equipment list at same time
   * 2. User A books a speaker (stock_qty: 5 → 4)
   * 3. Server broadcasts: io.emit('inventory:updated', {equipment_id: 123, new_qty: 4})
   * 4. User B's socket listener fires
   * 5. We find the item in $scope.equipment and update stock_qty
   * 6. applyClientFilters() re-runs
   * 7. If "availableOnly" filter is on, item might disappear!
   * 8. User B sees the stock count change in real-time
   * 
   * WHY call $scope.$apply()?
   * Because Socket.IO events arrive OUTSIDE Angular's digest cycle.
   * AngularJS doesn't "know" that data changed yet.
   * $scope.$apply() manually triggers angular digest to update the view.
   * 
   * Without $apply: data changes, but view doesn't update (stale UI).
   * With $apply: forces AngularJS to check for changes and update view.
   * 
   * Note: Modern Angular (2+) doesn't need this; it uses Zone.js to handle it automatically.
   * AngularJS 1.x requires manual $apply for async events (setTimeout, Socket.IO, etc.)
   */
  SocketService.on('inventory:updated', function(data) {
    // Find the equipment item that was updated
    const item = $scope.equipment.find(function(e) {
      return e.id === data.equipment_id;
    });
    
    if (item) {
      // Update the item's stock quantity
      item.stock_qty = data.new_qty;
      
      // Force AngularJS digest cycle (update view)
      $scope.$apply();
      
      // Re-apply filters (item might disappear if "availableOnly" is on)
      applyClientFilters();
    }
  });

  /**
   * === CLEANUP ON CONTROLLER DESTRUCTION ===
   * 
   * When route changes (user leaves equipment page), the controller is destroyed.
   * We need to clean up listeners to prevent MEMORY LEAKS.
   * 
   * Memory leak scenario (without cleanup):
   * 1. Load equipment page → Socket listener attached
   * 2. Navigate to another page → controller destroyed, but listener still active!
   * 3. Go back to equipment page → new controller created, NEW listener attached!
   * 4. Inventory update comes in → BOTH listeners fire (old and new)
   * 5. Repeat 100 times → 100 listeners all firing, wasting memory and creating bugs!
   * 
   * Solution: Listen to $destroy event and clean up.
   * $destroy fires when AngularJS destroys a scope (route change, component removed, etc.)
   */
  $scope.$on('$destroy', function() {
    // Remove the inventory listener
    SocketService.off('inventory:updated');
    
    // If you have other listeners or timers, clean them here too:
    // clearTimeout(messageTimeout)
    // $rootScope.$off('some:event')
  });

  /**
   * === CART MANAGEMENT ===
   * 
   * CartService is a singleton (same instance across entire app).
   * When we add an item to cart, CartService updates and broadcasts an event.
   * NavController listens to that event and updates the cart badge count.
   * 
   * Example flow:
   * 1. User clicks "Add to Booking" button
   * 2. Button does: ng-click="addToCart(item)"
   * 3. addToCart() calls CartService.add()
   * 4. CartService updates internal cart array
   * 5. CartService broadcasts 'cart:updated' event
   * 6. NavController listens, updates $scope.cartCount
   * 7. Navbar badge updates ({{cartCount}})
   */

  /**
   * addToCart: Add equipment to the booking cart
   * 
   * Why quantity=1?
   * Because on equipment listing page, user adds one item at a time.
   * On booking/checkout page, user can change quantity.
   * 
   * Why CartService instead of $scope.cart?
   * Because cart should persist across page changes.
   * If you store cart in $scope, it's destroyed when controller is destroyed.
   * CartService is a singleton, survives entire app lifetime.
   */
  $scope.addToCart = function(item) {
    // Add item to cart (CartService handles it)
    CartService.add(item, 1);
    
    // Show success message
    ToastService.success(item.name + ' added to booking cart');
    
    // Broadcast event (for NavController to update cart badge)
    $rootScope.$broadcast('cart:updated');
  };

  /**
   * isInCart: Check if item is in shopping cart
   * Used to highlight cards that are in cart and show "✓ Added" button state
   */
  $scope.isInCart = function(id) {
    return CartService.has(id);
  };

  /**
   * viewDetail: Navigate to equipment detail page
   * 
   * $location.path() changes the current route
   * This triggers $routeChangeStart in app.js
   * Which loads EquipmentDetailController and equipment-detail.html
   * /equipment/:id passes the ID via $routeParams
   */
  $scope.viewDetail = function(id) {
    $location.path('/equipment/' + id);
  };

  /**
   * === PRICE DISPLAY HELPERS ===
   * 
   * The algorithm calculates current_price based on:
   * - demand elasticity
   * - seasonality
   * - inventory levels
   * 
   * We show:
   * - current_price (large, prominent)
   * - base_price (strikethrough, faded)
   * - uplift % (color-coded badge)
   * 
   * These helpers determine badge appearance and text.
   */

  /**
   * priceStateClass: Return CSS class based on price uplift percentage
   * 
   * Why color-code by percentage?
   * Users scan the grid quickly; colors provide instant visual feedback.
   * - Red/warning: high markup (20%+) might seem unfair
   * - Blue/accent: moderate markup (5-20%) is reasonable
   * - Gray/muted: no markup, just using base price
   * 
   * This trains users: "What does the algorithm do?"
   * Answer: "Shows you when demand is high (prices rise accordingly)"
   */
  $scope.priceStateClass = function(item) {
    const basePrice = item.base_price || 1;  // Avoid division by zero
    const uplift = ((item.current_price - basePrice) / basePrice) * 100;
    
    if (uplift > 20) {
      return 'badge-warning';  // High markup
    } else if (uplift > 5) {
      return 'badge-accent';   // Moderate markup
    } else {
      return 'badge-muted';    // No/low markup
    }
  };

  /**
   * priceUpliftText: Return human-readable uplift text
   * 
   * Examples:
   * - "Base price" (0% uplift)
   * - "+12% algo" (+12% markup)
   * - "-5% algo" (-5% discount, rare but possible)
   * 
   * The "algo" suffix explains: "this is the algorithm's decision"
   * (vs a fixed price or admin decision)
   */
  $scope.priceUpliftText = function(item) {
    const basePrice = item.base_price || 1;
    const pct = Math.round(((item.current_price - basePrice) / basePrice) * 100);
    
    if (pct === 0) {
      return 'Base price';
    } else if (pct > 0) {
      return '+' + pct + '% algo';
    } else {
      return pct + '% algo';  // Negative sign already included in pct
    }
  };

  /**
   * === INITIALIZATION: Load equipment when controller starts ===
   * 
   * This runs immediately when controller is instantiated.
   * By this point:
   * - $scope is created and ready
   * - All functions are defined
   * - All $watches are set up
   * - Now we fetch data and populate the page
   * 
   * If we put this at the top of the file, it would run BEFORE
   * $scope.$watch is defined, causing race conditions and bugs.
   * By putting it at the bottom, we ensure everything is ready first.
   */
  loadEquipment();

}]);

/**
 * === SUMMARY: ANGULARJS PATTERNS USED ===
 * 
 * 1. CONTROLLERS (this file)
 *    Purpose: Bind view to model, handle user interactions
 *    Pattern: Define variables on $scope, they automatically sync to HTML
 *    Pitfall: Putting business logic here (should go in services)
 * 
 * 2. SERVICES (ApiService, CartService, SocketService)
 *    Purpose: Reusable logic shared across controllers
 *    Pattern: Inject service into controller, call its methods
 *    Pitfall: Services are singletons; don't store request-specific data
 * 
 * 3. DATA BINDING ({{variable}}, ng-model, ng-repeat)
 *    Purpose: Sync model and view automatically
 *    Pattern: Change $scope.variable → HTML updates
 *    Pitfall: Doesn't work for plain JS variables (need $scope)
 * 
 * 4. DIRECTIVES (ng-click, ng-show, ng-if, ng-repeat, ng-class)
 *    Purpose: Extend HTML with custom behavior
 *    Pattern: ng-* attributes tell AngularJS how to handle elements
 *    Pitfall: ng-if removes from DOM (destroys watches), ng-show just hides
 * 
 * 5. WATCH ($scope.$watch)
 *    Purpose: Run callback when data changes
 *    Pattern: Watch model, callback updates filtered view
 *    Pitfall: Watches run on every digest cycle; expensive if overused
 * 
 * 6. LIFE CYCLE ($destroy)
 *    Purpose: Clean up when controller is destroyed
 *    Pattern: Listen to $destroy, remove listeners
 *    Pitfall: Forgetting cleanup causes memory leaks
 */
