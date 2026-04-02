/**
 * APISERVICE - Core HTTP wrapper for StageAlpha
 * 
 * Purpose:
 * All API communication goes through this service.
 * This centralizes: base URL, error handling, response normalization.
 * 
 * Pattern: Service wraps $http
 * Benefits:
 * - Controllers don't know about HTTP implementation details
 * - Can swap HttpClient later without changing controllers
 * - Central place to handle errors, retries, logging
 * 
 * Design: Dependency Injection with array notation
 * ['$http', function($http) { ... }] prevents minification issues
 */

angular.module('stageAlpha')
  .factory('ApiService', ['$http', '$q', function($http, $q) {

    // Base URL for all API endpoints
    // All methods append to this
    const BASE_URL = '/api/v1';

    /**
     * Helper function: normalize response shape
     * 
     * All responses should have: { success: true/false, data: ..., message: '...' }
     * This ensures controllers can check `response.success` consistently
     * 
     * @param {Object} httpResponse - Response from $http
     * @returns {Object} Normalized response
     */
    function normalizeResponse(httpResponse) {
      // If response already has success field, return as-is
      if (httpResponse.data && typeof httpResponse.data.success !== 'undefined') {
        return httpResponse.data;
      }

      // Otherwise, wrap it
      return {
        success: true,
        data: httpResponse.data,
        message: 'Success'
      };
    }

    /**
     * Helper function: normalize error response
     * @param {Object} error - Error from $http
     * @returns {Object} Normalized error response
     */
    function normalizeError(error) {
      // If error.data has the right shape, use it
      if (error.data && error.data.message) {
        return {
          success: false,
          data: error.data.data || null,
          message: error.data.message,
          statusCode: error.status
        };
      }

      // Generic error
      return {
        success: false,
        data: null,
        message: error.statusText || 'An error occurred',
        statusCode: error.status
      };
    }

    // =====================================================
    // PUBLIC API
    // =====================================================

    return {

      /**
       * GET request
       * @param {String} endpoint - e.g., '/equipment' or '/equipment/5'
       * @param {Object} params - Query parameters
       * @returns {Promise}
       * 
       * Usage:
       *   ApiService.get('/equipment', { category: 'speakers' })
       *     .then(response => $scope.items = response.data)
       *     .catch(error => $scope.error = error.message)
       */
      get: function(endpoint, params) {
        const url = BASE_URL + endpoint;
        return $http.get(url, { params: params })
          .then(normalizeResponse)
          .catch(normalizeError);
      },

      /**
       * POST request
       * @param {String} endpoint - e.g., '/bookings'
       * @param {Object} data - Request body
       * @returns {Promise}
       * 
       * Usage:
       *   ApiService.post('/bookings', bookingData)
       *     .then(response => console.log('Booking ID:', response.data.id))
       *     .catch(error => $scope.error = error.message)
       * 
       * Teaching: POST is for creating new resources.
       * Idempotent? No. Safe? No. (May have side effects)
       */
      post: function(endpoint, data) {
        const url = BASE_URL + endpoint;
        return $http.post(url, data)
          .then(normalizeResponse)
          .catch(normalizeError);
      },

      /**
       * PUT request
       * @param {String} endpoint - e.g., '/equipment/5'
       * @param {Object} data - Full updated resource
       * @returns {Promise}
       * 
       * Teaching: PUT replaces entire resource.
       * Idempotent? Yes. (Calling twice has same effect as once)
       * Safe? No.
       */
      put: function(endpoint, data) {
        const url = BASE_URL + endpoint;
        return $http.put(url, data)
          .then(normalizeResponse)
          .catch(normalizeError);
      },

      /**
       * PATCH request
       * @param {String} endpoint - e.g., '/bookings/123/status'
       * @param {Object} data - Partial update (only changed fields)
       * @returns {Promise}
       * 
       * Teaching: PATCH updates only specified fields.
       * PUT: { name: 'A', status: 'confirmed', notes: 'text' } (all fields)
       * PATCH: { status: 'confirmed' } (only status changes)
       */
      patch: function(endpoint, data) {
        const url = BASE_URL + endpoint;
        return $http.patch(url, data)
          .then(normalizeResponse)
          .catch(normalizeError);
      },

      /**
       * DELETE request
       * @param {String} endpoint - e.g., '/equipment/5'
       * @returns {Promise}
       * 
       * Teaching: DELETE removes a resource.
       * Idempotent? Yes. (Calling twice = first call succeeded, second call returns 404, but intent is same)
       * Safe? No.
       */
      delete: function(endpoint) {
        const url = BASE_URL + endpoint;
        return $http.delete(url)
          .then(normalizeResponse)
          .catch(normalizeError);
      },

      /**
       * Batch GET: fetch multiple endpoints at once
       * @param {Array} endpoints - e.g., ['/equipment', '/categories', '/bookings']
       * @returns {Promise} Resolves when ALL are done
       * 
       * Usage:
       *   ApiService.getAll(['/equipment', '/categories'])
       *     .then(results => {
       *       $scope.equipment = results[0].data;
       *       $scope.categories = results[1].data;
       *     })
       * 
       * Teaching: $q.all() waits for all promises.
       * If any fail, entire batch fails.
       */
      getAll: function(endpoints) {
        const promises = endpoints.map(endpoint => this.get(endpoint));
        return $q.all(promises);
      }

    };

  }]);

/**
 * DESIGN RATIONALE
 * 
 * 1. Why wrap $http?
 *    - $http is low-level. We want high-level API endpoints.
 *    - If we switched from $http to fetch() or axios, only this file changes.
 *    - Controllers remain untouched.
 * 
 * 2. Why normalize response?
 *    - Backend might return different shapes: { data },  { error }, [ items ]
 *    - By normalizing to { success, data, message }, controllers see consistent interface.
 *    - Controllers write: if (response.success) { ... } everywhere
 * 
 * 3. Promise vs Observable?
 *    - AngularJS only has Promises ($http returns promise)
 *    - Angular (v2+) uses RxJS Observables
 *    - Both pattens work; promises are simpler for sync operations
 * 
 * 4. Why catch() at service level?
 *    - Transform errors here into normalized shape
 *    - Controllers can call .catch() as second handler if needed (chaining)
 * 
 * 5. BASE_URL hardcoded?
 *    - Yes, for simplicity. In production, load from config service.
 *    - Config service would read from environment or index.html data attribute.
 */
