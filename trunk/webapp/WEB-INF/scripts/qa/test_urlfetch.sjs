acre.require('/test/lib').enable(this);

var u = acre.require.call(this, "__utils__");

// --------------------- sync urlfetch ---------------------------------

test('acre.urlfetch works',function() {
    var results = {};
    results.google    = acre.urlfetch("http://www.google.com/");
    results.youtube   = acre.urlfetch("http://www.youtube.com/");
    u.has_content(results.google,"Google");
    u.has_content(results.youtube,"YouTube");
});

test('acre.urlfetch can re-enter once',function() {
    var response = acre.urlfetch(acre.request.base_url + "sync_urlfetch");
    var results = JSON.parse(response.body);
    ok("google" in results && "youtube" in results)
});

test('acre.urlfetch fails with recursive re-entry',function() {
    try {
        acre.urlfetch(acre.request.base_url + "recursive_sync_urlfetch");
        ok(false,"exception wasn't triggered");
    } catch (e) {
        ok(true,"exception was triggered");
    }
});

// --------------------- async urlfetch ---------------------------------

test('parallel acre.async.urlfetch works',function() {
    var results = {};
    acre.async.urlfetch("http://www.google.com/", {
        'callback' : function (res) {
            results.google = res;
        }
    });
    acre.async.urlfetch("http://www.youtube.com/", {
        'callback' : function (res) {
            results.youtube = res;
        }
    });
    acre.async.wait_on_results();
    u.has_content(results.google,"Google");
    u.has_content(results.youtube,"YouTube");
});

test('chained acre.async.urlfetch works',function() {
    var results = {};
    acre.async.urlfetch("http://www.google.com/", {
        'callback' : function (res) {
            results.google = res;
            acre.async.urlfetch("http://www.youtube.com/", {
                'callback' : function (res) {
                    results.youtube = res;
                }
            });
        }
    });
    acre.async.wait_on_results();
    u.has_content(results.google,"Google");
    u.has_content(results.youtube,"YouTube");
});

test('acre.async.urlfetch can re-enter once',function() {
    var response = null;
    acre.async.urlfetch(acre.request.base_url + "async_urlfetch", {
        'callback' : function (res) {
            response = res;
        }
    });
    acre.async.wait_on_results();
    var results = JSON.parse(response.body);
    ok("google" in results && "youtube" in results)
});

test('acre.async.urlfetch fails with recursive re-entry',function() {
    var response = null;
    try {
        acre.async.urlfetch(acre.request.base_url + "recursive_async_urlfetch", {
            'callback' : function (res) {
                response = res;
            }
        });
        acre.async.wait_on_results();
        ok(false,"exception wasn't triggered");
    } catch (e) {
        ok(true,"exception was triggered");
    }
});

// --------------------------- mixed ----------------------------------------

test('sync and async urlfetch obtain the same cookies',{"bug": "with ae 1.4.2 getting diff google cookies in buildbot, no clue"}, function() {
    // bug: just can't figure it out, introduced with ae 1.4.2 but i only see it in the buildbot env
    var sync_response = acre.urlfetch(acre.request.base_url + "sync_urlfetch");
    var sync_results = JSON.parse(sync_response.body);

    var async_response = acre.urlfetch(acre.request.base_url + "async_urlfetch");
    var async_results = JSON.parse(async_response.body);

    // check google cookies ---------------------

    var sync_google_cookies = u.cookie_names(sync_results.google);
    var async_google_cookies = u.cookie_names(async_results.google);

    equal(sync_google_cookies,async_google_cookies);

    // check google cookies ---------------------

    var sync_youtube_cookies = u.cookie_names(sync_results.youtube);
    var async_youtube_cookies = u.cookie_names(async_results.youtube);

    equal(sync_youtube_cookies,async_youtube_cookies);
});

acre.test.report();
