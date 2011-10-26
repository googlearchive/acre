acre.require('/test/lib').enable(this);

// not all acre instances might have this API present so check to make sure
if (acre.appengine) {

    test('acre.appengine exists and has all the pieces', function() {
        ok(typeof acre.appengine != "undefined", "appengine service exists");
        ok(typeof acre.appengine.get_user_info == "function", "appengine.get_user_info exists");
        ok(typeof acre.appengine.is_user_admin == "function", "appengine.is_user_admin exists");
    });
    
    test('acre.appengine.get_user_info works', function() {
        try {
            var user_info = acre.appengine.get_user_info();
            console.log(user_info);
            ok(true,"exception wasn't triggered");
            ok("id" in user_info, "user id is present");
            ok("nickname" in user_info, "nickname is present");
            ok("email" in user_info, "email is present");
            ok("auth_domain" in user_info, "auth_domain is present");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });

    test('acre.appengine.is_user_admin works', function() {
        try {
            acre.appengine.is_user_admin();
            ok(true,"exception wasn't triggered");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });
}

acre.test.report();
