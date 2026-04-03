'use strict';
angular.module('stageAlpha')
.controller('PackageDetailCtrl', ['$scope', '$routeParams', '$location', 'CartService', 'ToastService', 
function($scope, $routeParams, $location, CartService, ToastService) {
  $scope.loading = true;
  $scope.pkg = null;
  $scope.error = null;

  // Since we don't have a dedicated API for packages, we statically define them to simulate 
  // bundled equipment discounts (matching the logic in packages.controller.js)
  var packagesData = [
    {
      id: 'p1',
      slug: 'wedding-premium',
      name: 'Premium Wedding Bundle',
      price: 35000,
      original_price: 45000,
      description: 'The ultimate audio and lighting package for grand weddings. Ensures crystal clear speech and booming reception music.',
      image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80',
      items: [
        { name: '4x JBL SRX812P Speakers', desc: 'Main PA system' },
        { name: '2x JBL SRX818SP Subwoofers', desc: 'Deep bass for reception' },
        { name: '8x Chauvet DJ Wash FX2', desc: 'Ambient wash lighting' },
        { name: '2x Pioneer CDJ-3000', desc: 'DJ Decks' }
      ]
    },
    {
      id: 'p2',
      slug: 'corporate-basic',
      name: 'Corporate Keynote System',
      price: 15000,
      original_price: 18000,
      description: 'Professional setup for corporate presentations and conferences with flawless wireless mics.',
      image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80',
      items: [
        { name: '2x Yamaha DXR12', desc: 'Speech-optimized speakers' },
        { name: '4x Shure QLX-D Wireless Mics', desc: 'Feedback-resistant vocal mics' },
        { name: '1x Allen & Heath SQ-5', desc: 'Digital Mixer' }
      ]
    },
    {
      id: 'p3',
      slug: 'club-night',
      name: 'Club Night Rig',
      price: 25000,
      original_price: 30000,
      description: 'Intense lighting and heavy bass package for underground parties or club retrofits.',
      image: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&q=80',
      items: [
        { name: '4x JBL SRX818SP Subwoofers', desc: 'Chest-pounding lows' },
        { name: '6x Moving Head Spotlights', desc: 'Dynamic stage lighting' },
        { name: '1x Hazer/Smoke Machine', desc: 'Atmosphere enhancement' }
      ]
    }
  ];

  var found = packagesData.find(function(p) { return p.slug === $routeParams.slug; });
  
  if (found) {
    $scope.pkg = found;
    $scope.loading = false;
  } else {
    $scope.error = 'Package not found';
    $scope.loading = false;
  }

  $scope.bookNow = function() {
    // In a real system, we'd add multiple items to the cart. 
    // Here we just redirect to general booking for demo, or we could add a "package" to cart
    ToastService.show('Please select equipment individually for accurate dynamic pricing simulation', 'warning');
    $location.path('/equipment');
  };
}]);
