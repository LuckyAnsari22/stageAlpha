'use strict';
angular.module('stageAlpha')
.controller('AdminQuotesCtrl', ['$scope', '$http', 'ToastService',
function($scope, $http, ToastService) {
  $scope.quotes = [];
  $scope.filteredQuotes = [];
  $scope.quoteFilter = null;

  $http.get('/api/v1/quotes').then(function(res) {
    $scope.quotes = res.data.data || res.data || [];
    $scope.filteredQuotes = $scope.quotes;
  }).catch(function() {});

  $scope.$watch('quoteFilter', function(val) {
    if (!val) {
      $scope.filteredQuotes = $scope.quotes;
    } else {
      $scope.filteredQuotes = $scope.quotes.filter(function(q) { return q.status === val; });
    }
  });

  $scope.sendQuote = function(q) {
    $http.patch('/api/v1/quotes/' + q.id + '/approve', { admin_notes: 'Approved by admin' }).then(function() {
      q.status = 'sent';
      ToastService.show('Quote sent', 'success');
    }).catch(function(err) {
      ToastService.show('Failed to send quote: ' + ((err.data && err.data.message) || 'Unknown error'), 'error');
    });
  };
  $scope.rejectQuote = function(q) {
    $http.patch('/api/v1/quotes/' + q.id + '/approve', { admin_notes: 'Rejected by admin' }).then(function() {
      q.status = 'rejected';
      ToastService.show('Quote rejected', 'info');
    }).catch(function(err) {
      ToastService.show('Failed to reject quote', 'error');
    });
  };
  $scope.convertToBooking = function(q) {
    $http.patch('/api/v1/quotes/' + q.id + '/accept').then(function(res) {
      q.status = 'converted';
      ToastService.show('Quote converted to booking #' + ((res.data.data && res.data.data.booking_id) || ''), 'success');
    }).catch(function(err) {
      ToastService.show('Failed to convert: ' + ((err.data && err.data.message) || 'Unknown error'), 'error');
    });
  };
}]);
