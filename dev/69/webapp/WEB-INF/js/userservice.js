
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.user = {
           "create_logout_url" : create_logout_url,
           "create_login_url" : create_login_url,
           "is_user_logged_in" : is_user_logged_in,
           "is_user_admin" : is_user_admin,
           "get_current_user" : get_current_user
        };

    };

    // --------------------------------------
    
    function create_logout_url(url) {
        return _userService.createLogoutURL(url);
    }

    function create_login_url(url) {
        return _userService.createLoginURL(url);
    }

    function is_user_logged_in() {
        return _userService.isUserLoggedIn();
    }
      
    function is_user_admin() {
        return _userService.isUserAdmin();
    }

    function get_current_user() {
        return _userService.getCurrentUser();
    }
    
})();

