acre.require('/test/lib').enable(this);

test('acre.oauth exists and has all the default pieces', function() {
    ok(typeof acre.oauth == "object", "oauth object exists");
    ok(typeof acre.oauth.providers == "object", "oauth.providers object exists");
    ok(typeof acre.oauth.get_authorization == "function", "oauth.get_authorization object exists");
    ok(typeof acre.oauth.remove_credentials == "function", "oauth.remove_credentials object exists");
    ok(typeof acre.oauth.has_credentials == "function", "oauth.has_credentials object exists");
});

// TODO(SM) port the real oauth tests from python to here
// TODO(JD) need to figure out how to do the interactive user tests

if (acre.oauth && acre.oauth.get_oauth_user) {
    test('acre.oauth exists and has the optional pieces', function() {
        ok(typeof acre.oauth.get_oauth_user == "function", "oauth.get_oauth_user object exists");
        ok(typeof acre.oauth.create_host_access_token == "function", "oauth.create_host_access_token object exists");
        ok(typeof acre.oauth.get_host_identity == "function", "oauth.get_host_identity object exists");
    });

    test('acre.oauth.get_oauth_user works', function() {
        try {
            var user = acre.oauth.get_oauth_user();
            ok(true,"exception wasn't triggered");
            ok("id" in user, "user id is present");
            ok("nickname" in user, "nickname is present");
            ok("email" in user, "email is present");
            ok("auth_domain" in user, "auth_domain is present");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });

    test('acre.oauth.create_host_access_token works', function() {
        try {
            var token = acre.oauth.create_host_access_token("scope");
            ok(true,"exception wasn't triggered");
            ok("access_token" in token, "access_token is present");
            ok("expiration_time" in token, "expiration_time is present");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });

    test('acre.oauth.get_host_identity works', function() {
        try {
            var host_identity =  acre.oauth.get_host_identity();
            ok(true,"exception wasn't triggered");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });
}

acre.test.report();
