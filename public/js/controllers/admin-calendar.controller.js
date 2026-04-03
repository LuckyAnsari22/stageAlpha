'use strict';
angular.module('stageAlpha')
.controller('AdminCalendarCtrl', ['$scope', '$http',
function($scope, $http) {
  var now = new Date();
  $scope.currentMonth = '';
  $scope.currentYear = now.getFullYear();
  $scope.calendarDays = [];
  $scope.monthBookings = [];
  $scope.selectedDay = null;
  $scope.selectedDayBookings = [];

  var viewMonth = now.getMonth();
  var viewYear = now.getFullYear();
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function buildCalendar() {
    $scope.currentMonth = months[viewMonth];
    $scope.currentYear = viewYear;
    var first = new Date(viewYear, viewMonth, 1);
    var last = new Date(viewYear, viewMonth + 1, 0);
    var startDay = first.getDay();
    var days = [];
    // Previous month padding
    var prevLast = new Date(viewYear, viewMonth, 0).getDate();
    for (var i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevLast - i, otherMonth: true, date: null, bookingCount: 0, isToday: false });
    }
    // Current month
    for (var d = 1; d <= last.getDate(); d++) {
      var dt = new Date(viewYear, viewMonth, d);
      var iso = dt.toISOString().split('T')[0];
      var count = $scope.monthBookings.filter(function(b) {
        return b.event_date && b.event_date.substring(0,10) === iso;
      }).length;
      days.push({
        day: d, otherMonth: false, date: dt, dateStr: iso,
        bookingCount: count,
        isToday: dt.toDateString() === now.toDateString()
      });
    }
    // Next month padding
    var remaining = 42 - days.length;
    for (var j = 1; j <= remaining; j++) {
      days.push({ day: j, otherMonth: true, date: null, bookingCount: 0, isToday: false });
    }
    $scope.calendarDays = days;
  }

  function loadBookings() {
    var start = new Date(viewYear, viewMonth, 1).toISOString().split('T')[0];
    var end = new Date(viewYear, viewMonth + 1, 0).toISOString().split('T')[0];
    $http.get('/api/v1/bookings?start_date=' + start + '&end_date=' + end).then(function(res) {
      $scope.monthBookings = res.data.data || res.data || [];
      buildCalendar();
    }).catch(function() {
      $scope.monthBookings = [];
      buildCalendar();
    });
  }

  $scope.prevMonth = function() {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    loadBookings();
  };
  $scope.nextMonth = function() {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    loadBookings();
  };
  $scope.goToToday = function() {
    viewMonth = now.getMonth(); viewYear = now.getFullYear();
    loadBookings();
  };

  $scope.selectDay = function(d) {
    if (d.otherMonth || !d.dateStr) return;
    $scope.selectedDay = d.date;
    $scope.selectedDayBookings = $scope.monthBookings.filter(function(b) {
      return b.event_date && b.event_date.substring(0,10) === d.dateStr;
    });
  };

  loadBookings();
}]);
