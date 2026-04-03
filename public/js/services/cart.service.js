'use strict';
angular.module('stageAlpha')
.factory('CartService', ['$window', function($window) {
  var cartKey = 'sa_cart';

  function getCart() {
    var c = $window.localStorage.getItem(cartKey);
    return c ? JSON.parse(c) : [];
  }

  function saveCart(cart) {
    $window.localStorage.setItem(cartKey, JSON.stringify(cart));
  }

  return {
    getAll: function() { return getCart(); },
    add: function(equipment, qty) {
      var cart = getCart();
      var existing = cart.find(function(i) { return i.id === equipment.id; });
      if (existing) {
        existing.qty += (qty || 1);
        if (existing.qty > equipment.stock_qty) existing.qty = equipment.stock_qty;
      } else {
        cart.push({
          id: equipment.id,
          name: equipment.name,
          category_name: equipment.category_name || '',
          current_price: equipment.current_price,
          qty: qty || 1,
          stock_qty: equipment.stock_qty || 99
        });
      }
      saveCart(cart);
    },
    updateQty: function(id, qty) {
      var cart = getCart();
      var item = cart.find(function(i) { return i.id === id; });
      if (item) {
        item.qty = qty;
        if (item.qty <= 0) {
          cart = cart.filter(function(i) { return i.id !== id; });
        } else if (item.qty > item.stock_qty) {
          item.qty = item.stock_qty;
        }
        saveCart(cart);
      }
    },
    remove: function(id) {
      var cart = getCart();
      cart = cart.filter(function(i) { return i.id !== id; });
      saveCart(cart);
    },
    clear: function() { $window.localStorage.removeItem(cartKey); },
    count: function() {
      return getCart().reduce(function(sum, item) { return sum + item.qty; }, 0);
    }
  };
}]);
