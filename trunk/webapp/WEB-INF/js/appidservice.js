
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.appid = {
           "getServiceAccountName" : getServiceAccountName,
           "getAccessToken" : getAccessToken
        };

    };
    
    function getAccessToken(scope) {
        return appidservice.getAccessToken(scope);
    }

    function getServiceAccountName() {
        return appidservice.getServiceAccountName();
    }
    
})();

