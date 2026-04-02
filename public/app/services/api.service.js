angular.module('stageAlpha').service('ApiService', ['$http', function($http) {
    this.getAssets = function() { return $http.get("/api/equipment"); };
    this.deployAsset = function(dataPayload) { return $http.post("/api/equipment", dataPayload); };
    this.modifyAsset = function(nodeId, updatedParams) { return $http.put("/api/equipment/" + nodeId, updatedParams); };
    this.purgeAsset = function(nodeId) { return $http.delete("/api/equipment/" + nodeId); };
    this.simulatePrice = function(nodeId) { return $http.get("/api/pricing/" + nodeId + "/simulate"); };
    this.getDashboardMetrics = function() { return $http.get("/api/analytics/dashboard"); };
    
    // Admin Bookings Management
    this.getAllBookings = function() { return $http.get("/api/bookings"); };
    this.updateBookingStatus = function(id, st) { return $http.patch("/api/bookings/" + id + "/status", { status: st }); };
}]);
