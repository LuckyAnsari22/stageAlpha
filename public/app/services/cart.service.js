angular.module('stageAlpha').service('CartService', ['$window', function($window) {
    var STORAGE_KEY = 'sa_cart';
    var self = this;
    
    self.getCart = function() {
        var cart = $window.localStorage.getItem(STORAGE_KEY);
        return cart ? JSON.parse(cart) : [];
    };
    
    self.saveCart = function(cart) {
        $window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    };
    
    self.addToCart = function(equipment) {
        var cart = self.getCart();
        var existing = cart.find(function(item) { return item.equipment_id === equipment.id; });
        
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                equipment_id: equipment.id,
                name: equipment.name,
                category: equipment.category_name,
                price_per_day: parseFloat(equipment.price_per_day),
                quantity: 1,
                stock: equipment.stock,
                image_url: equipment.image_url
            });
        }
        
        self.saveCart(cart);
        return cart;
    };
    
    self.removeFromCart = function(equipmentId) {
        var cart = self.getCart().filter(function(item) { return item.equipment_id !== equipmentId; });
        self.saveCart(cart);
        return cart;
    };
    
    self.updateQuantity = function(equipmentId, qty) {
        var cart = self.getCart();
        var item = cart.find(function(i) { return i.equipment_id === equipmentId; });
        if (item) {
            item.quantity = Math.max(1, Math.min(qty, item.stock));
        }
        self.saveCart(cart);
        return cart;
    };
    
    self.clearCart = function() {
        $window.localStorage.removeItem(STORAGE_KEY);
    };
    
    self.getItemCount = function() {
        return self.getCart().reduce(function(sum, item) { return sum + item.quantity; }, 0);
    };
}]);
