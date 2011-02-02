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

}

acre.test.report();
