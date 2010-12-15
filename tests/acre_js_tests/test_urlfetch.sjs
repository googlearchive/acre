acre.require('/test/lib').enable(this);

var u = acre.require("__utils__");

// --------------------- sync urlfetch ---------------------------------

test('acre.urlfetch works',function() {
    var results = {};
    results.google    = acre.urlfetch("http://www.google.com/");
    results.youtube   = acre.urlfetch("http://www.youtube.com/");
    u.has_correct_domain(results.google, "PREF", ".google.com");
    u.has_correct_domain(results.youtube, "GEO", ".youtube.com");
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
        console.log(e);
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
    u.has_correct_domain(results.google, "PREF", ".google.com");
    u.has_correct_domain(results.youtube, "GEO", ".youtube.com");
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
    u.has_correct_domain(results.google, "PREF", ".google.com");
    u.has_correct_domain(results.youtube, "GEO", ".youtube.com");
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
        console.log(e);
        ok(true,"exception was triggered");
    }
});

acre.test.report();
