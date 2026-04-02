/**
 * SOCKETSERVICE - Real-time WebSocket Communication
 * 
 * Wraps Socket.IO client for live events:
 * - Inventory updates (equipment stock changed)
 * - Price updates (algorithm recalculated)
 * - Backtest progress (admin feature)
 * - Order notifications
 * 
 * Pattern: Service wraps third-party library (socket.io-client)
 * Benefits:
 * - Can swap Socket.IO for other WebSocket library later
 * - Central place to handle connection/disconnection
 * - Controllers don't deal with socket implementation
 * 
 * Socket events flow:
 * Server emits → Client listens (via .on()) → Controller reacts
 * 
 * Example flow:
 * 1. User places booking
 * 2. Server updates equipment stock
 * 3. Server emits: socket.emit('inventory:updated', { equipment_id, new_qty })
 * 4. SocketService.on('inventory:updated', callback) receives it
 * 5. Callback updates $scope.equipment[] reactively
 * 6. UI shows new stock count immediately (no polling!)
 */

angular.module('stageAlpha')
  .factory('SocketService', ['$rootScope', '$window', '$q', function($rootScope, $window, $q) {

    // Socket.IO instance (null until connect() called)
    let socket = null;
    let isConnecting = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    // =====================================================
    // PUBLIC API
    // =====================================================

    return {

      /**
       * CONNECT
       * Establish WebSocket connection to server
       * Called in app.run() when app starts
       * 
       * @returns {Promise} Resolves when connected
       */
      connect: function() {
        // Avoid multiple simultaneous connections
        if (socket && (socket.connected || isConnecting)) {
          return $q.when();
        }

        isConnecting = true;
        const deferred = $q.defer();

        // Check if Socket.IO is available (script loaded in index.html)
        if (!$window.io) {
          console.warn('Socket.IO not loaded. Real-time features disabled.');
          isConnecting = false;
          deferred.reject('Socket.IO not available');
          return deferred.promise;
        }

        // Create socket connection
        // Socket.IO auto-detects URL (connects to current host)
        socket = $window.io({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
          // Send JWT token with handshake
          extraHeaders: {
            'Authorization': 'Bearer ' + ($window.localStorage.getItem('stageAlpha_token') || '')
          }
        });

        // Connection successful
        socket.on('connect', function() {
          console.log('WebSocket connected. Socket ID:', socket.id);
          isConnecting = false;
          reconnectAttempts = 0;
          deferred.resolve(socket);

          // Broadcast to app that socket is ready
          $rootScope.$broadcast('socket:connected');
        });

        // Connection error
        socket.on('connect_error', function(error) {
          console.warn('Socket.IO connection error:', error);
          isConnecting = false;
          reconnectAttempts++;

          if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached. Real-time features unavailable.');
            deferred.reject('Connection failed');
          }
        });

        // Disconnected
        socket.on('disconnect', function(reason) {
          console.log('WebSocket disconnected. Reason:', reason);
          $rootScope.$broadcast('socket:disconnected', reason);
        });

        // Server sends authentication error
        socket.on('unauthorized', function(data) {
          console.warn('Socket authentication failed:', data);
          // Could trigger logout here
        });

        return deferred.promise;
      },

      /**
       * DISCONNECT
       * Close WebSocket connection
       * Called when user logs out
       */
      disconnect: function() {
        if (socket) {
          socket.disconnect();
          socket = null;
        }
      },

      /**
       * ON
       * Listen for a socket event
       * 
       * @param {String} event - Event name, e.g., 'inventory:updated'
       * @param {Function} callback - Called when event received
       * 
       * Usage:
       *   SocketService.on('inventory:updated', function(data) {
       *     $scope.equipment.find(e => e.id === data.equipment_id).stock_qty = data.new_qty;
       *   });
       */
      on: function(event, callback) {
        if (!socket) {
          console.warn('Socket not connected. Event listener "' + event + '" may not work.');
          return;
        }

        socket.on(event, callback);
      },

      /**
       * OFF
       * Stop listening for a socket event
       * 
       * @param {String} event - Event name
       * @param {Function} callback - The handler to remove (optional, removes all if omitted)
       * 
       * Usage (in controller $scope.$on('$destroy')):
       *   SocketService.off('inventory:updated');  // Remove all listeners
       *   SocketService.off('inventory:updated', myHandler);  // Remove specific handler
       */
      off: function(event, callback) {
        if (socket) {
          socket.off(event, callback);
        }
      },

      /**
       * EMIT
       * Send message to server
       * 
       * @param {String} event - Event name
       * @param {Object} data - Message payload
       * @param {Function} ack - Optional: callback when server acknowledges
       * 
       * Usage:
       *   SocketService.emit('user:preferences', { theme: 'dark' }, function(ack) {
       *     console.log('Server acknowledged:', ack);
       *   });
       * 
       * Note: Most client-server communication is via REST API (ApiService).
       * Socket.emit is for lightweight events that don't need response.
       */
      emit: function(event, data, ack) {
        if (!socket || !socket.connected) {
          console.warn('Socket not connected. Event "' + event + '" not sent.');
          return;
        }

        if (ack) {
          socket.emit(event, data, ack);
        } else {
          socket.emit(event, data);
        }
      },

      /**
       * IS CONNECTED
       * Check current connection status
       * @returns {Boolean}
       */
      isConnected: function() {
        return socket && socket.connected;
      },

      /**
       * GET SOCKET ID
       * Get unique ID assigned by server
       * Useful for debugging or server-side logging
       * @returns {String}
       */
      getSocketId: function() {
        return socket ? socket.id : null;
      }

    };

  }]);

/**
 * EXPECTED SERVER SOCKET EVENTS
 * 
 * Events server emits to clients:
 * 
 * 1. inventory:updated
 *    Emitted after any booking/cancellation affecting stock
 *    Payload: { equipment_id: 5, equipment_name: 'Speaker', new_qty: 3 }
 *    Listener: update $scope.equipment[] stock display
 * 
 * 2. price:updated
 *    Emitted when daily batch pricing runs
 *    Payload: { equipment_id: 5, equipment_name: 'Speaker',
 *               old_price: 2500, new_price: 2875, change_pct: 15 }
 *    Listener: show toast notification to admin dashboard
 * 
 * 3. backtest:progress (admin namespace)
 *    Emitted during long-running backtest
 *    Payload: { current: 45, total: 200, pct: 22.5, current_booking_id: 'SA-001' }
 *    Listener: update progress bar on backtest page
 * 
 * 4. backtest:complete (admin namespace)
 *    Emitted when backtest finishes
 *    Payload: { backtest_id: 123, improvement_pct: 12.5,
 *               actual_revenue: 50000, algorithm_revenue: 56250 }
 *    Listener: show results, update backtest dashboard
 * 
 * 5. unauthorized
 *    Emitted if client authentication fails
 *    Payload: { message: 'Token expired' }
 *    Listener: logout user, redirect to login
 */

/**
 * SOCKET.IO VS REST API
 * 
 * REST API (via ApiService):
 * - Request/Response model (client asks, server answers)
 * - HTTP status codes (200, 404, 500)
 * - Good for: creating bookings, fetching lists, admin updates
 * - Stateless (each request is independent)
 * 
 * WebSocket (via SocketService):
 * - Pub/Sub model (server broadcasts, clients listen)
 * - Server can push data anytime (not waiting for request)
 * - Good for: live inventory, real-time notifications
 * - Stateful (connection persists)
 * 
 * When to use what:
 * - Creating/updating data → REST (POST/PUT)
 * - Retrieving data once → REST (GET)
 * - Live notifications → WebSocket
 * - Real-time multiplayer → WebSocket
 * - Bulk reports → REST (or REST with streaming)
 */
