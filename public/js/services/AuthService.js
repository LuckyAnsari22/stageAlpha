/**
 * AUTHSERVICE - Authentication & Session Management
 * 
 * Responsible for:
 * - login() / register() / logout()
 * - Token storage (localStorage)
 * - Token expiry check (decode JWT without server call)
 * - User role checking (admin vs customer)
 * 
 * Pattern: Service holds application state
 * The token is the source of truth about who is logged in.
 * 
 * JWT (JSON Web Token) structure:
 * Header.Payload.Signature
 * Example payload (base64 decoded):
 *   { id: 42, email: 'user@example.com', role: 'customer', iat: 1234, exp: 1334 }
 * iat = issued at timestamp
 * exp = expiration timestamp (seconds since epoch)
 * 
 * We decode the payload to check: is token still valid?
 * If Date.now()/1000 > token.exp, token is expired.
 */

angular.module('stageAlpha')
  .factory('AuthService', ['$window', '$location', '$q', 'ApiService', 
    function($window, $location, $q, ApiService) {

    // ===== PRIVATE STATE =====
    // Only accessible within this service
    let currentUser = null;
    let token = null;

    // Load token from localStorage on service instantiation
    // This way, if user refreshes the page, they stay logged in
    const savedToken = $window.localStorage.getItem('stageAlpha_token');
    if (savedToken) {
      token = savedToken;
      currentUser = decodeToken(token);
    }

    // ===== HELPER: Decode JWT =====
    /**
     * Decode JWT payload to get user info and expiry
     * 
     * Structure: Header.Payload.Signature
     * Payload is base64url encoded.
     * 
     * @param {String} jwtToken - Full JWT token
     * @returns {Object} Decoded payload or null if invalid
     * 
     * Teaching: Decoding is NOT validation.
     * - Decoding: extract claims from payload (no crypto check)
     * - Validation: verify signature (cryptographic - server does this)
     * We can decode client-side to check expiry without server call.
     * BUT: never trust decoded client-side data as proof of identity.
     * Server should always verify the signature.
     */
    function decodeToken(jwtToken) {
      try {
        if (!jwtToken) return null;

        // Split into parts
        const parts = jwtToken.split('.');
        if (parts.length !== 3) return null; // Invalid JWT format

        // Payload is middle part, base64url encoded
        let payload = parts[1];

        // Add padding if missing (base64url might not have padding)
        while (payload.length % 4) {
          payload += '=';
        }

        // Decode base64
        const decoded = atob(payload);

        // Parse JSON
        return JSON.parse(decoded);
      } catch (e) {
        console.error('Failed to decode token:', e);
        return null;
      }
    }

    // ===== HELPER: Is token expired? =====
    /**
     * Check if token has expired
     * @param {Object} decodedPayload - The decoded JWT payload
     * @returns {Boolean} true if expired, false if still valid
     */
    function isTokenExpired(decodedPayload) {
      if (!decodedPayload || !decodedPayload.exp) return true;

      // exp is in seconds since epoch
      // Date.now() is in milliseconds
      const nowInSeconds = Math.floor(Date.now() / 1000);

      // Add 1 minute buffer: consider it expired 1 min before actual expiry
      return decodedPayload.exp < (nowInSeconds + 60);
    }

    // =====================================================
    // PUBLIC API
    // =====================================================

    return {

      /**
       * LOGIN
       * @param {String} email
       * @param {String} password
       * @returns {Promise} Resolves if success, rejects with error message
       * 
       * Usage:
       *   AuthService.login('user@example.com', 'password123')
       *     .then(() => {
       *       $scope.user = AuthService.getUser();
       *       $location.path('/');  // Redirect home
       *     })
       *     .catch(error => $scope.error = error);
       */
      login: function(email, password) {
        return ApiService.post('/auth/login', { email, password })
          .then(response => {
            if (response.success) {
              // Store token
              token = response.data.access_token;
              $window.localStorage.setItem('stageAlpha_token', token);

              // Decode and store user info
              currentUser = decodeToken(token);

              return currentUser;
            } else {
              return $q.reject(response.message);
            }
          });
      },

      /**
       * REGISTER
       * @param {String} email
       * @param {String} password
       * @param {String} name
       * @param {String} phone
       * @returns {Promise}
       */
      register: function(email, password, name, phone) {
        return ApiService.post('/auth/register', {
          email, password, name, phone
        })
          .then(response => {
            if (response.success) {
              // Auto-login after registration
              token = response.data.access_token;
              $window.localStorage.setItem('stageAlpha_token', token);
              currentUser = decodeToken(token);
              return currentUser;
            } else {
              return $q.reject(response.message);
            }
          });
      },

      /**
       * LOGOUT
       * Clear token and user from service and localStorage
       * Typically called when:
       * - User clicks logout button
       * - Server returns 401 (token invalid/expired)
       */
      logout: function() {
        token = null;
        currentUser = null;
        $window.localStorage.removeItem('stageAlpha_token');
        // Note: HttpInterceptor will catch 401 and call this
      },

      /**
       * GET TOKEN
       * Returns current token (needed by httpInterceptor)
       * @returns {String} JWT token or null
       */
      getToken: function() {
        return token;
      },

      /**
       * IS LOGGED IN?
       * Check if user has valid, non-expired token
       * Used in route guards and templates
       * 
       * @returns {Boolean}
       * 
       * Usage in template:
       *   <span ng-show="isLoggedIn()">Welcome, {{ getUser().name }}</span>
       *   <span ng-hide="isLoggedIn()"><a href="#!/login">Login</a></span>
       */
      isLoggedIn: function() {
        // Must have token AND token must not be expired
        if (!token || !currentUser) return false;
        if (isTokenExpired(currentUser)) {
          // Token expired, clear it
          this.logout();
          return false;
        }
        return true;
      },

      /**
       * IS ADMIN?
       * Check if user has admin role
       * @returns {Boolean}
       * 
       * Usage in templates:
       *   <div ng-show="isAdmin()">Admin panel link</div>
       */
      isAdmin: function() {
        if (!this.isLoggedIn()) return false;
        return currentUser.role === 'admin';
      },

      /**
       * GET USER
       * Return decoded user info from token
       * @returns {Object} { id, email, name, role, iat, exp }
       * 
       * Usage:
       *   $scope.user = AuthService.getUser();
       *   Profile page can show {{ user.name }} and {{ user.email }}
       */
      getUser: function() {
        if (!this.isLoggedIn()) return null;
        return currentUser;
      },

      /**
       * REFRESH TOKEN (optional)
       * Request new access token using refresh token
       * Refresh token is stored in httpOnly cookie (set by server)
       * Browser sends it automatically with requests
       * 
       * @returns {Promise}
       * 
       * Usage:
       *   If access token expires soon, refresh it:
       *   AuthService.refreshToken()
       *     .then(newToken => console.log('Token refreshed'))
       */
      refreshToken: function() {
        return ApiService.post('/auth/refresh', {})
          .then(response => {
            if (response.success) {
              token = response.data.access_token;
              $window.localStorage.setItem('stageAlpha_token', token);
              currentUser = decodeToken(token);
              return token;
            } else {
              // Refresh failed, logout user
              this.logout();
              $location.path('/login');
              return $q.reject('Token refresh failed');
            }
          });
      },

      /**
       * RESTORE SESSION
       * Load token from localStorage and restore to memory
       * Called on app initialization to restore user session after page refresh
       * 
       * The token is automatically loaded when AuthService initializes,
       * but this method can be called explicitly if needed for consistency.
       * 
       * @returns {Boolean} true if session restored, false if no session
       */
      restoreSession: function() {
        const savedToken = $window.localStorage.getItem('stageAlpha_token');
        if (savedToken && !isTokenExpired(decodeToken(savedToken))) {
          token = savedToken;
          currentUser = decodeToken(token);
          return true;
        } else if (savedToken) {
          // Token expired, remove it
          $window.localStorage.removeItem('stageAlpha_token');
          token = null;
          currentUser = null;
          return false;
        }
        return false;
      },

      /**
       * GET ACCESS TOKEN
       * Returns current token (needed by httpInterceptor for Authorization header)
       * @returns {String} JWT token or null
       */
      getAccessToken: function() {
        return token;
      }

    };

  }]);

/**
 * SECURITY NOTES
 * 
 * 1. Token storage (localStorage vs cookie)?
 *    localStorage: JavaScript can access. Vulnerable to XSS (malicious script can read it).
 *    httpOnly cookie: JavaScript cannot access. Immune to XSS (but vulnerable to CSRF).
 *    
 *    We use: localStorage for access token (short-lived, 15min)
 *            httpOnly cookie for refresh token (long-lived, 7 days)
 *    
 *    This balances security vs UX. Access token is short-lived so XSS damage is limited.
 * 
 * 2. Decoding vs Validating JWT
 *    Decoding: extract the claims (no cryptography)
 *    Validating: verify signature using secret key (server does this)
 *    
 *    We decode client-side to check expiry. This is safe because:
 *    - If token is forged, server won't accept it (signature fails)
 *    - If token is expired, server rejects it anyway
 * 
 * 3. Token expiry buffer (60 seconds)
 *    Consider token expired 1 minute before actual expiry.
 *    Why? Network delays might cause requests to arrive after server considers it expired.
 * 
 * 4. Never trust client-side validation
 *    isAdmin() returns true locally? Don't use to decide what to show.
 *    Use it for UX (don't show admin link if not admin).
 *    But server MUST verify again. Never trust frontend.
 */
