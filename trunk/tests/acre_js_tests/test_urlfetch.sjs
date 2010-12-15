acre.require('/test/lib').enable(this);

function do_test(response,expected_cost) {

    // first make sure that all three urlfetches performed were counted in the metaweb costs
    var costs = response["headers"]["x-metaweb-cost"];
    console.log(costs);
    ok(costs.indexOf(expected_cost) > -1, "user urlfetches count in metaweb costs");

    // get the result from the test by parsing the body as JSON payload
    var results = JSON.parse(response.body);

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
    var url = acre.request.base_url + "sync_urlfetch";
    do_test(acre.urlfetch(url),"auuc=4"); // TODO: find out why there is one more here!
});

if (acre._dev) { // async urlfetch can't call recursively in regular mode so this test would fail
    test('acre.async.urlfetch',function() {
        var url = acre.request.base_url + "async_urlfetch";
        do_test(acre.urlfetch(url),"auuc=3");
    });
}

acre.test.report();
