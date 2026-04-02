angular.module('stageAlpha').service('CartService', ['$window', '$rootScope', function($window, $root) {
  var CART_KEY = 'sa_cart';

  function getCart() {
    try { return JSON.parse($window.localStorage.getItem(CART_KEY)) || { items: [], event_date: null }; }
    catch(e) { return { items: [], event_date: null }; }
  }

  function saveCart(cart) {
    $window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    $root.$broadcast('cart:updated');
  }

  this.add = function(equipment, qty) {
    var cart = getCart();
    var existing = cart.items.find(function(i) { return i.equipment_id === equipment.id; });
    if (existing) { existing.qty += (qty || 1); }
    else { cart.items.push({ equipment_id: equipment.id, name: equipment.name, base_price: equipment.current_price, qty: qty || 1 }); }
    saveCart(cart);
  };

  this.remove = function(equipmentId) {
    var cart = getCart();
    cart.items = cart.items.filter(function(i) { return i.equipment_id !== equipmentId; });
    saveCart(cart);
  };

  this.updateQty = function(equipmentId, qty) {
    var cart = getCart();
    var item = cart.items.find(function(i) { return i.equipment_id === equipmentId; });
    if (item) { if (qty <= 0) this.remove(equipmentId); else item.qty = qty; }
    saveCart(cart);
  }.bind(this);

  this.setEventDate = function(date) {
    var cart = getCart();
    cart.event_date = date;
    saveCart(cart);
  };

  this.getItems = function() { return getCart().items; };
  this.getEventDate = function() { return getCart().event_date; };
  this.count = function() { return getCart().items.length; };
  this.has = function(id) { return getCart().items.some(function(i) { return i.equipment_id === id; }); };
  this.clear = function() { saveCart({ items: [], event_date: null }); };
  this.getTotal = function(inclTax) {
    var subtotal = getCart().items.reduce(function(sum, i) { return sum + (i.algorithm_price || i.base_price) * i.qty; }, 0);
    return inclTax ? subtotal * 1.18 : subtotal;
  };
}]);
