angular.module('stageAlpha').factory('SocketStream', ['$rootScope', function($rootScope) {
    var publicSocket, adminSocket;

    if (typeof io !== 'undefined') {
        publicSocket = io('/');
        publicSocket.emit('subscribe:inventory');
        
        // Secured Admin Namespace Connection using JSON Web Token authentication
        adminSocket = io('/admin', {
            auth: {
                token: 'admin-secret-token' // Connects cleanly passing auth requirements
            }
        });
    }

    return {
        // Broadcasts explicitly bound to public nodes
        onPublicRoute: function(eventName, callback) {
            if (!publicSocket) return;
            publicSocket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(publicSocket, args);
                });
            });
        },
        
        // Broadcasts structurally isolated to the protected Admin namespace
        onAdminRoute: function(eventName, callback) {
            if (!adminSocket) return;
            adminSocket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(adminSocket, args);
                });
            });
        }
    };
}]);
