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
    $http.patch('/api/v1/quotes/' + q.id, { status: 'sent' }).then(function() {
      q.status = 'sent';
      ToastService.show('Quote sent', 'success');
    });
  };
  $scope.rejectQuote = function(q) {
    $http.patch('/api/v1/quotes/' + q.id, { status: 'rejected' }).then(function() {
      q.status = 'rejected';
    });
  };
  $scope.convertToBooking = function(q) {
    $http.post('/api/v1/quotes/' + q.id + '/convert').then(function() {
      q.status = 'converted';
      ToastService.show('Quote converted to booking!', 'success');
    });
  };
}]);
