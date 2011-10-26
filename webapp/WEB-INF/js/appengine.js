
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.appengine = {
           "get_user_info" : get_user_info,
           "is_user_admin" : is_user_admin
        };

    };
    
    function get_user_info(scope) {
        return oauthservice.getCurrentUser(scope);
    }

    function is_user_admin() {
        return oauthservice.isUserAdmin();
    }
    
})();

