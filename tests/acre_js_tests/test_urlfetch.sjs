acre.require('/test/lib').enable(this);

function do_test(results) {

    // make sure that the web sites urlfetched correctly by looking into the domain of the cookie they set
    // which is the least likely part of their web page to change over time. Freebase doesn't set a tracking cookie
    // so we just use the metaweb_tid one. Note that the test is designed to pass if any one of those sites
    // returns with a status code that is not 200. This is not bad because we're testing urlfetch, not these websites

    var google = results.google;
    ok(((google.status == 200 && google.cookies.PREF.domain.indexOf(".google.com") > -1) || google.status != 200),  "google.com");

    var youtube = results.youtube;
    ok(((youtube.status == 200 && youtube.cookies.GEO.domain.indexOf(".youtube.com") > -1) || youtube.status != 200), "youtube.com");

    var freebase = results.freebase;
    ok(((freebase.status == 200 && freebase.cookies.metaweb_tid.domain.indexOf(".freebase.com") > -1) || freebase.status != 200),  "freebase.com");
}

test('acre.urlfetch',function() {
    var results = {};
    results.google    = acre.urlfetch("http://www.google.com/");
    results.youtube   = acre.urlfetch("http://www.youtube.com/");
    results.freebase  = acre.urlfetch("http://www.freebase.com/");    
    do_test(results);
});

test('acre.async.urlfetch',function() {
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
    acre.async.urlfetch("http://www.freebase.com/", {
        'callback' : function (res) {
            results.freebase = res;
        }
    });
    acre.async.wait_on_results();
    do_test(results);
});

acre.test.report();
