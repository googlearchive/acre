acre.require('/test/lib').enable(this);

// not all acre instances might have a cache present so check to make sure
if (acre.cache) {
    
    test('acre.cache exists and has all the pieces', function() {
        ok(typeof acre.cache != "undefined", "cache exists");
        ok(typeof acre.cache.get == "function", "cache.get exists");
        ok(typeof acre.cache.put == "function", "cache.put exists");
        ok(typeof acre.cache.remove == "function", "cache.remove exists");
    });

    var do_test = function(obj) {
        var id = "o1";
        acre.cache.remove(id);
        var o1 = obj;
        acre.cache.put(id,o1);
        var o2 = acre.cache.get(id);
        deepEqual(o1,o2);
        acre.cache.remove(id);
        var o3 = acre.cache.get(id);
        ok(o3 == null, "object was removed");
    };

    test('acre.cache returns null for values that are not present', function() {
        equal(acre.cache.get("blah"),null,"returns null as expected");
    });
    
    test('acre.cache put/get/remove works with strings', function() {
        do_test("blah");
    });

    test('acre.cache put/get/remove works with numbers', function() {
        do_test(1);
    });

    test('acre.cache put/get/remove works with objects', function() {
        do_test({"blah":"blah"});
    });

    test('acre.cache put/get/remove works with arrays of objects', function() {
        do_test([
            {"foo":"foo"},
            {"bar":"bar"}
        ]);
    });

    test('acre.cache increment works', function() {
        var id = "o1";
        acre.cache.remove(id);
        var o1 = 1;
        acre.cache.increment(id,1,0);
        var o2 = acre.cache.get(id);
        equal(o2,1,"at first, the object is not in cache, so it starts with 0 and 1 gets added");
        acre.cache.increment(id,1,0);
        var o2 = acre.cache.get(id);
        equal(o2,2,"then it gets incremented to 2");
        acre.cache.remove(id);
        var o3 = acre.cache.get(id);
        ok(o3 == null, "object was removed");
    });
    
    test('acre.cache set+increment work together', function() {
        var id = "id";
        acre.cache.remove(id);
        acre.cache.put(id,1);
        acre.cache.increment(id,1,0);
        var i = acre.cache.get(id);
        equal(i,2,"counter was incremented to 2");
        acre.cache.remove(id);
        ok(acre.cache.get(id) == null, "object was removed");
    });
        
}

acre.test.report();
