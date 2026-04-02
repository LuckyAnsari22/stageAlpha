angular.module('stageAlpha').controller('AdminConsoleState', 
    ['$scope', 'ApiService', 'SocketStream', 
    function($scope, ApiService, SocketStream) {

    $scope.activeTab = 'analytics'; // Default tab
    
    $scope.equipmentList = [];
    $scope.newEquipment = { category_id: "1", stock: 1, price_per_day: 5000, image_url: "" };
    $scope.errorMsg = "";
    $scope.isAdding = false;

    // Booking management state
    $scope.allBookings = [];
    $scope.loadingBookings = false;
    $scope.grossRevenue = 0;
    $scope.pendingCount = 0;

    // Yield & Risk Intelligence State
    $scope.intelligenceData = [];
    $scope.loadingIntelligence = false;

    // Chart mapping variables
    $scope.labels = [];
    $scope.series = ['Gross Revenue (Trailing)'];
    $scope.data = [ [] ];
    
    // BlurAdmin Aesthetic chart config
    $scope.colors = ['#00e5ff']; // Neon cyan accent
    $scope.datasetOverride = [{
        borderWidth: 3,
        hoverBackgroundColor: "rgba(255,255,255,0.2)",
        hoverBorderColor: "rgba(255,255,255,1)",
        tension: 0.4 // Smooth bezier curves
    }];
    $scope.options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yAxes: [{
            type: 'linear', display: true, position: 'left',
            gridLines: { color: 'rgba(255,255,255,0.05)', zeroLineColor: 'rgba(255,255,255,0.1)' },
            ticks: { fontColor: 'rgba(255,255,255,0.6)', beginAtZero: true }
        }],
        xAxes: [{
            gridLines: { color: 'rgba(255,255,255,0.05)', zeroLineColor: 'rgba(255,255,255,0.1)' },
            ticks: { fontColor: 'rgba(255,255,255,0.6)' }
        }]
      },
      legend: { display: false }
    };

    $scope.syncNodes = function() {
        ApiService.getAssets().then(function(res) {
            $scope.equipmentList = res.data.data;
        });
        
        ApiService.getDashboardMetrics().then(function(res) {
            const metrics = res.data.data;
            const newLabels = [];
            const grossFlow = [];
            
            if (metrics && metrics.weeklyRevenue) {
                metrics.weeklyRevenue.forEach(row => {
                   newLabels.push("Wk " + row.week_num);
                   grossFlow.push(parseFloat(row.gross_revenue));
                });
            }
            
            $scope.labels = newLabels;
            $scope.data = [grossFlow];
        }).catch(console.error);
    };

    $scope.loadAllBookings = function() {
        $scope.loadingBookings = true;
        ApiService.getAllBookings().then(function(res) {
            $scope.allBookings = res.data.data;
            
            // Calculate KPI metrics
            $scope.grossRevenue = 0;
            $scope.pendingCount = 0;
            
            $scope.allBookings.forEach(function(b) {
                if (b.status === 'Confirmed' || b.status === 'Completed') {
                    $scope.grossRevenue += parseFloat(b.total_amount);
                }
                if (b.status === 'Pending') {
                    $scope.pendingCount++;
                }
            });
            
            $scope.loadingBookings = false;
        }).catch(function(err) {
            console.error("Failed loading bookings", err);
            $scope.loadingBookings = false;
        });
    };

    $scope.updateBookingStatus = function(bookingId, newStatus) {
        ApiService.updateBookingStatus(bookingId, newStatus).then(function() {
            // Re-calc KPIs on status change
            $scope.loadAllBookings();
        }).catch(function(err) {
            alert("Status update failed: " + (err.data.message || 'Server Error'));
            $scope.loadAllBookings(); // Revert on failure
        });
    };

    // Hardware Node Management Operations
    $scope.addEquipment = function() {
        ApiService.deployAsset($scope.newEquipment).then(function() {
            $scope.newEquipment = { category_id: "1", stock: 1, price_per_day: 5000, image_url: "" };
            $scope.errorMsg = "";
            $scope.isAdding = false;
        }).catch(function(err) {
            $scope.errorMsg = err.data.message || "Unknown Event Constraints";
        });
    };

    $scope.editItem = function(node) {
        var baseRate = prompt("Modify Daily Lease Rate (₹) for " + node.name, node.price_per_day);
        if (baseRate === null) return;
        
        var totalStock = prompt("Modify Active Warehouse Inventory for " + node.name, node.stock);
        if (totalStock === null) return;

        ApiService.modifyAsset(node.id, {
            price_per_day: parseFloat(baseRate) || node.price_per_day,
            stock: parseInt(totalStock) || node.stock
        }).catch(function(err) { alert("Mutation Failed: " + err.data.message); });
    };

    $scope.deleteEquipment = function(nodeId) {
        if(confirm("CRITICAL: Destructive action. Are you certain you wish to purge Node #" + nodeId + " from the cluster?")) {
            ApiService.purgeAsset(nodeId).catch(function(err) {
                alert("Action blocked: " + err.data.message);
            });
        }
    };

    $scope.loadIntelligence = function() {
        if ($scope.intelligenceData.length > 0) return; // Cache client-side
        $scope.loadingIntelligence = true;
        ApiService.getRiskIntelligence().then(function(res) {
            $scope.intelligenceData = res.data.data;
            $scope.loadingIntelligence = false;
        }).catch(function(err) {
            console.error("Failed loading intelligence", err);
            $scope.loadingIntelligence = false;
        });
    };

    $scope.simulatePricing = function(node) {
        ApiService.simulatePrice(node.id).then(function(res) {
            const result = res.data.data;
            alert("Pricing Algorithm Finished (" + result.computation_model + "):\n\n" +
                  "Current Base Rate: ₹" + result.base_equilibrium + "\n" +
                  "Optimal Target Rate: ₹" + result.optimal_target + "\n\n" +
                  "Confidence Index: " + result.statistical_confidence);
            // Re-sync nodes to reflect any DB changes if it updated price (not auto applied currently, but logged)
        }).catch(function(err) {
            alert("Simulation failed: " + (err.data.message || 'Unknown factor'));
        });
    };

    SocketStream.onPublicRoute('inventory:sync', function() {
        $scope.syncNodes(); 
    });

    // Initialize
    $scope.syncNodes();
    $scope.loadAllBookings();
}]);
