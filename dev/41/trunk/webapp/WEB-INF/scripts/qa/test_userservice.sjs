acre.require('/test/lib').enable(this);

// not all acre instances might have this API present so check to make sure
if (typeof appengine != "undefined" && appengine.user) {

    test('appengine.user exists and has all the pieces', function() {
        ok(typeof appengine.user != "undefined", "user service exists");
        ok(typeof appengine.user.create_login_url == "function", "user.create_login_url exists");
        ok(typeof appengine.user.create_logout_url == "function", "user.create_logout_url exists");
        ok(typeof appengine.user.is_user_logged_in == "function", "user.is_user_logged_in exists");
        ok(typeof appengine.user.is_user_admin == "function", "user.is_user_admin exists");
        ok(typeof appengine.user.get_current_user == "function", "user.get_current_user exists");
    });

    test('user is not logged in', function() {
        var logged_in = appengine.user.is_user_logged_in();
        ok(true, "call went thru");
        if (!logged_in) {
            ok(appengine.user.get_current_user() == null, "current user is null");
        } else {
            var user = appengine.user.get_current_user();
            ok(user != null, "current user is not null");
            ok(typeof user.user_id == "string", "user.user_id exists");
            ok(typeof user.nickname == "string", "user.nickname exists");
            ok(typeof user.email == "string", "user.email exists");
            ok(typeof user.auth_domain == "string", "user.auth_domain exists");
        }
    });

    test('create login URL ', function() {
        ok(typeof appengine.user.create_login_url(acre.request.url) == "string", "login URL created");
    });

    test('create logout URL ', function() {
        ok(typeof appengine.user.create_logout_url(acre.request.url) == "string", "logout URL created");
    });

}

acre.test.report();
