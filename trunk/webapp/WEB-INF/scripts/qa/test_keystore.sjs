acre.require('/test/lib').enable(this);

if (acre.keystore.put) { // we can test only if put exists

    test('acre.keystore has all the pieces', function() {
        ok(typeof acre.keystore != "undefined", "store exists");
        ok(typeof acre.keystore.get == "function", "store.get exists");
        ok(typeof acre.keystore.remove == "function", "store.remove exists");
        ok(typeof acre.keystore.keys == "function", "store.keys exists");
        ok(typeof acre.keystore.put == "function", "store.put exists");
    });

    test("make sure there are no keys when we start", function() {
        ok(acre.keystore.keys() == null, "no keys in the keystore for this app");
    });

    test("test adding and deleting a key", function() {
        var name = "a";
        var token = "b";
        var secret = "c";
        acre.keystore.put(name,token,secret);
        var keys = acre.keystore.keys();
        ok(keys != null && keys.length == 1, "key was recorded");
        var key = acre.keystore.get(name);
        ok(key != null,"key was retrieved");
        equal(key[0],token, "token was saved correctly");
        equal(key[1],secret, "secret was saved correctly");
        acre.keystore.remove(name);
        keys = acre.keystore.keys();
        ok(keys == null, "key was removed");
    });

    test("test adding multiple keys", function() {
        var name0 = "a";
        var token0 = "b";
        var secret0 = "c";
        var name1 = "A";
        var token1 = "B";
        var secret1 = "C";
        acre.keystore.put(name0,token0,secret0);
        acre.keystore.put(name1,token1,secret1);
        var keys = acre.keystore.keys();
        ok(keys != null && keys.length == 2, "keys were recorded");
        equal(keys[0], name0, "first key ok");
        equal(keys[1], name1, "second key ok");
        var key = acre.keystore.get(name0);
        ok(key != null,"key was retrieved");
        equal(key[0],token0, "token of first key was saved correctly");
        equal(key[1],secret0, "secret of first key  was saved correctly");
        key = acre.keystore.get(name1);
        ok(key != null,"key was retrieved");
        equal(key[0],token1, "token of first key was saved correctly");
        equal(key[1],secret1, "secret of first key  was saved correctly");
        acre.keystore.remove(name0);
        acre.keystore.remove(name1);
        keys = acre.keystore.keys();
        ok(keys == null, "keys were removed");
    });

}

acre.test.report();
