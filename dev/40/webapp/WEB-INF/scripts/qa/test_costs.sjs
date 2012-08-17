acre.require('/test/lib').enable(this);

var u = acre.require.call(this, "__utils__");

// --------------------- sync urlfetch ---------------------------------

test('acre.urlfetch costs', function() {
    var response = acre.urlfetch(acre.request.base_url + "sync_urlfetch");
    var costs = u.metaweb_costs(response);
    equal(costs.auuc,2);
    
    if (u.is_caching()) {
        equal(typeof costs.asuc,"undefined");
    } else {
        equal(costs.asuc,1);
    }
});

// --------------------- async urlfetch ---------------------------------

test('acre.async.urlfetch costs', function() {
    var response = acre.urlfetch(acre.request.base_url + "async_urlfetch");
    var costs = u.metaweb_costs(response);
    equal(costs.auuc,2);

    if (u.is_caching()) {
        equal(typeof costs.asuc,"undefined");
    } else {
        equal(costs.asuc,1);
    }
});

acre.test.report();
