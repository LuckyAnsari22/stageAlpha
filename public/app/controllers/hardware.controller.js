angular.module('stageAlpha').controller('HardwareState', 
    ['$scope', '$timeout', '$location', 'ApiService', 'SocketStream', 'CartService', 'AuthService',
    function($scope, $timeout, $location, ApiService, SocketStream, CartService, AuthService) {

    $scope.equipmentList = [];
    $scope.loading = true;
    $scope.searchText = "";
    $scope.activeCategory = null;
    $scope.cartCount = CartService.getItemCount();

    function executeSync() {
        ApiService.getAssets().then(function(res) {
            $scope.equipmentList = res.data.data;
            $scope.loading = false;
        }).catch(function(err) {
             console.error("Network disconnect:", err);
             $scope.loading = false; 
        });
    }

    $timeout(executeSync, 300);
    
    SocketStream.onPublicRoute('inventory:sync', function(payload) {
        executeSync(); 
    });

    $scope.setCategory = function(cat) {
        $scope.activeCategory = cat;
    };

    $scope.filteredItems = function() {
        if (!$scope.equipmentList) return [];
        var result = $scope.equipmentList;
        
        if ($scope.activeCategory) {
            result = result.filter(function(item) {
                return item.category_name === $scope.activeCategory;
            });
        }
        
        if ($scope.searchText) {
            var term = $scope.searchText.toLowerCase();
            result = result.filter(function(item) {
                return item.name.toLowerCase().indexOf(term) !== -1 || 
                       item.category_name.toLowerCase().indexOf(term) !== -1;
            });
        }
        
        return result;
    };

    $scope.getCategoryClass = function(cat) {
        switch(cat) {
            case 'Sound Systems': return 'cat-sound';
            case 'Lighting': return 'cat-light';
            case 'Staging': return 'cat-staging';
            case 'Visual': return 'cat-visual';
            default: return 'cat-default';
        }
    };

    $scope.getCategoryIcon = function(cat) {
        switch(cat) {
            case 'Sound Systems': return '🔊';
            case 'Lighting': return '💡';
            case 'Staging': return '🏗️';
            case 'Visual': return '📺';
            default: return '📦';
        }
    };

    $scope.addToCart = function(item) {
        if (!AuthService.isLoggedIn()) {
            $location.path('/login');
            return;
        }
        CartService.addToCart(item);
        $scope.cartCount = CartService.getItemCount();
        item.addedToCart = true;
        $timeout(function() { item.addedToCart = false; }, 1500);
    };

    $scope.goToCheckout = function() {
        $location.path('/booking');
    };
}]);
