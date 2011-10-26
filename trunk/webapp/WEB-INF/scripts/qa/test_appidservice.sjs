acre.require('/test/lib').enable(this);

// not all acre instances might have this API present so check to make sure
if (acre.appid) {

    test('acre.appid exists and has all the pieces', function() {
        ok(typeof acre.appid != "undefined", "appid service exists");
        ok(typeof acre.appid.getServiceAccountName == "function", "appid.getServiceAccountName exists");
        ok(typeof acre.appid.getAccessToken == "function", "appid.getAccessToken exists");
    });
    
    test('acre.appid.getServiceAccountName works', function() {
        try {
            var service_account_name = acre.appid.getServiceAccountName();
            ok(true,"exception wasn't triggered");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });

    test('acre.appid.getAccessToken works', function() {
        try {
            var token = acre.appid.getAccessToken("scope");
            ok(true,"exception wasn't triggered");
            ok("access_token" in token, "access_token is present");
            ok("expiration_time" in token, "expiration_time is present");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });
}

acre.test.report();
