acre.require('/test/lib').enable(this);

// not all acre instances might have a cache present so check to make sure
if (acre.cache) {
    
    test('acre.cache exists and has all the pieces', function() {
        var ca = acre.cache;
        ok(typeof ca != "undefined", "cache exists");
        ["get", "getAll", "put", "putAll", "remove", "removeAll", "increment"].forEach(function(m) {
          ok(typeof ca[m] === "function", "cache." + m + " exists")
        });
    });

    test('acre.request.cache exists and has all the pieces', function() {
        var ca = acre.cache.request;
        ok(typeof ca != "undefined", "cache exists");
        ["get", "getAll", "put", "putAll", "remove", "removeAll"].forEach(function(m) {
          ok(typeof ca[m] === "function", "cache." + m + " exists")
        });
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
        ok(o3 == null, "cached object was removed properly");
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
        var o2 = acre.cache.increment(id,1,0);
        equal(o2,1,"at first, the object is not in cache, so it starts with 0 and 1 gets added");
        var o3 = acre.cache.get(id);
        equal(o2,o3,"the object in cache is consistent with what was returned");
        acre.cache.increment(id,1,0);
        var o4 = acre.cache.get(id);
        equal(o4,2,"then it gets incremented to 2");
        acre.cache.remove(id);
        var o5 = acre.cache.get(id);
        ok(o5 == null, "cached object was removed properly");
    });
    
    test('acre.cache set+increment work together', function() {
        var id = "id";
        acre.cache.remove(id);
        acre.cache.put(id,1);
        acre.cache.increment(id,1,0);
        var i = acre.cache.get(id);
        equal(i,2,"counter was incremented to 2");
        acre.cache.remove(id);
        ok(acre.cache.get(id) == null, "cached object was removed properly");
    });

    test('acre.cache increment a non-number throws', function() {
        var id = "id";
        acre.cache.remove(id);
        try {
            acre.cache.put(id,"1");
            acre.cache.increment(id,1,0);
            ok(false,"should have thrown");
        } catch(e) {
            ok(true,"threw");
        }
        acre.cache.remove(id);
        ok(acre.cache.get(id) == null, "cached object was removed properly");
    });
    

    test('request get', function() {

        acre.cache.request.put("name", "Michael");
        acre.cache.put("name", "Bob");
        var name = acre.cache.request.get("name");

        ok(name === "Michael", "Did not get locally cached object.");

    });

    test('request getAll', function() {

        acre.cache.request.put("name", "Michael");
        acre.cache.request.put("color", "Blue");

        var data = acre.cache.request.getAll(["name", "color", "boguskey"]);

        ok(data["name"] === "Michael", "Did not get cached object with getAll");
        ok(data["color"] === "Blue", "Did not get cached object with getAll");
        ok(data["boguskey"] === undefined, "Did not get undefined for non-cached key.");

    });

    test('request putAll', function() { 

        foo = {"person1" : {"name": "Bob"}, "person2" : { "name" : "John"}};
        acre.cache.request.putAll(foo);

        var data = acre.cache.request.getAll(["person1"]);

        ok(data["person1"]["name"] === "Bob", "Did not get data cached with putAll.");

    });

    test('request removeAll', function() {

        var d = {"name" : "Bob", "surname" : "Marley"};
        acre.cache.request.putAll(d);

        acre.cache.request.removeAll(["name"]);

        var result = acre.cache.request.getAll(["name", "surname"]);

        ok(result["name"] === undefined, "Did not get undefined for deleted cache key.");
        ok(result["surname"] === "Marley", "Did not get back expected cached data.");

    });

}

acre.test.report();
