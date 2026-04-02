/**
 * BOOKINGSTATUSCONTROLLER — Display and track a specific booking
 * 
 * Purpose:
 * Shows detailed view of a single booking:
 * - Equipment items + quantities + prices
 * - Timeline: pending → confirmed → completed
 * - Payment status
 * - Customer and venue information
 * - Actions: modify (if pending), cancel, rate/review (if completed)
 * 
 * Route params:
 * /booking/:id
 */

angular.module('stageAlpha')
  .controller('BookingStatusController',
    ['$scope', '$routeParams', '$location', 'ApiService', 'ToastService',
      function($scope, $routeParams, $location, ApiService, ToastService) {

      const bookingId = $routeParams.id;

      /**
       * STATE
       */
      $scope.booking = null;
      $scope.loading = true;
      $scope.error = null;
      $scope.isEditing = false;
      $scope.cancelConfirm = false;

      /**
       * Booking status display helpers
       */
      $scope.statusBadgeClass = function(status) {
        if (status === 'completed') return 'badge-success';
        if (status === 'confirmed') return 'badge-accent';
        if (status === 'pending') return 'badge-warning';
        if (status === 'cancelled') return 'badge-danger';
        return 'badge-muted';
      };

      $scope.statusLabel = function(status) {
        const map = {
          'pending': 'Pending Confirmation',
          'confirmed': 'Confirmed',
          'completed': 'Completed',
          'cancelled': 'Cancelled'
        };
        return map[status] || status;
      };

      /**
       * Payment status helpers
       */
      $scope.paymentBadgeClass = function(status) {
        if (status === 'paid') return 'badge-success';
        if (status === 'pending') return 'badge-warning';
        if (status === 'failed') return 'badge-danger';
        return 'badge-muted';
      };

      /**
       * LOAD BOOKING
       */
      function loadBooking() {
        ApiService.get('/bookings/' + bookingId)
          .then(function(response) {
            $scope.booking = response.data.booking;
            $scope.items = response.data.items;
            $scope.payment = response.data.payment;
            $scope.loading = false;

            // Set page title
            $scope.$root.pageTitle = 'Booking #' + $scope.booking.id;
          })
          .catch(function(err) {
            $scope.error = err.data?.message || 'Booking not found';
            $scope.loading = false;
            ToastService.error($scope.error);
          });
      }

      /**
       * ACTIONS
       */

      /**
       * Modify booking (if status is pending)
       * Takes user back to booking cart with this booking's items pre-loaded
       */
      $scope.editBooking = function() {
        $location.path('/booking?edit=' + bookingId);
      };

      /**
       * Request cancellation
       */
      $scope.requestCancel = function() {
        if (!confirm('Cancel this booking? This action may have penalties.')) {
          return;
        }

        ApiService.patch('/bookings/' + bookingId + '/status', { status: 'cancelled' })
          .then(function(response) {
            ToastService.success('Booking cancelled successfully');
            loadBooking(); // Reload booking data
          })
          .catch(function(err) {
            ToastService.error(err.data?.message || 'Failed to cancel booking');
          });
      };

      /**
       * Submit a review (if booking is completed)
       */
      $scope.submitReview = function() {
        if (!$scope.booking.review) {
          $scope.booking.review = {};
        }

        const reviewData = {
          rating: $scope.booking.review.rating,
          comment: $scope.booking.review.comment
        };

        ApiService.post('/bookings/' + bookingId + '/review', reviewData)
          .then(function(response) {
            ToastService.success('Review submitted, thank you!');
            $scope.booking = response.data.data;
          })
          .catch(function(err) {
            ToastService.error(err.data?.message || 'Failed to submit review');
          });
      };

      /**
       * Request an invoice email
       */
      $scope.requestInvoice = function() {
        ApiService.post('/bookings/' + bookingId + '/invoice/request', {})
          .then(function() {
            ToastService.success('Invoice email sent');
          })
          .catch(function(err) {
            ToastService.error(err.data?.message || 'Failed to send invoice');
          });
      };

      /**
       * Make a payment (if payment is pending)
       */
      $scope.initiatePayment = function() {
        $location.path('/booking/' + bookingId + '/payment');
      };

      /**
       * Go back to bookings list
       */
      $scope.goBack = function() {
        $location.path('/booking');
      };

      /**
       * Format price with ₹
       */
      $scope.formatPrice = function(amount) {
        return '₹' + (amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
      };

      /**
       * Format date nicely
       */
      $scope.formatDate = function(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      };

      /**
       * Calculate days until event
       */
      $scope.daysUntilEvent = function() {
        if (!$scope.booking || !$scope.booking.event_date) return null;
        const today = new Date();
        const event = new Date($scope.booking.event_date);
        const diff = Math.ceil((event - today) / (1000 * 60 * 60 * 24));
        return diff;
      };

      /**
       * INITIALIZE
       */
      loadBooking();

    }]);
