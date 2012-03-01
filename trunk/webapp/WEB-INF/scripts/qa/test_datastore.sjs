acre.require('/test/lib').enable(this);

// not all acre instances might have this API present so check to make sure
if (typeof appengine != "undefined" && appengine.store) {

    // evaluate if two objects are the same except for their store metadata
    // but make sure to add it back since we might need it later on
    function are_same(o1,o2) {
        var _o1 = o1._;
        delete o1._;
        var _o2 = o2._;
        delete o2._;
        var result = deepEqual(o1,o2);
        o1._ = _o1;
        o2._ = _o2;
        return result;
    }
    
    // make sure we don't have any leftover objects in the store
    var all = appengine.store.find({});
    for (var r in all) {
        appengine.store.remove(r);
    }
    
    test('appengine.store exists and has all the pieces', function() {
        ok(typeof appengine.store != "undefined", "store exists");
        ok(typeof appengine.store.key == "function", "store.key exists");
        ok(typeof appengine.store.explain_key == "function", "store.explain_key exists");
        ok(typeof appengine.store.get == "function", "store.get exists");
        ok(typeof appengine.store.put == "function", "store.put exists");
        ok(typeof appengine.store.remove == "function", "store.remove exists");
        ok(typeof appengine.store.update == "function", "store.update exists");
        ok(typeof appengine.store.find == "function", "store.find exists");
        ok(typeof appengine.store.find_keys == "function", "store.find_keys exists");
        ok(typeof appengine.store.begin == "function", "store.begin exists");
    });

    test('appengine.store key/explains_key work as expected', function() {
        var id = "some_id";
        var type = "some_type";
        var key = appengine.store.key(id,type);
        var explained_key = appengine.store.explain_key(key);
        equal(explained_key,'some_type("some_id")', "key explained as expected");
    });
    
    test('appengine.store put/get/remove works with no provided id', function() {
        var o1 = { "foo" : "bar" };
        var key = appengine.store.put(o1);
        var o2 = appengine.store.get(key);
        are_same(o1,o2);
        appengine.store.remove(key);
        ok(appengine.store.get(key) == null, "entity was not found");
    });

    test('appengine.store put/get/remove works with provided id for untyped object', function() {
        var id = "whatever";
        var key = appengine.store.key(id);
        var o1 = { "foo" : "bar" };
        appengine.store.put(id,o1);
        var o2 = appengine.store.get(key);
        are_same(o1,o2);
        appengine.store.remove(key);
        ok(appengine.store.get(key) == null, "entity was not found");
    });

    test('appengine.store put/get/remove works with provided id for typed object', function() {
        var id = "whatever";
        var type = "test";
        var key = appengine.store.key(id,type);
        var o1 = { "foo" : "bar", "type" : type };
        var key2 = appengine.store.put(id,o1);
        var o2 = appengine.store.get(key);
        are_same(o1,o2);
        appengine.store.remove(key);
        ok(appengine.store.get(key) == null, "entity was not found");
    });

    test('appengine.store get without a key fails properly', function() {
        try {
            appengine.store.get("blah");
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
            ok(e.message.indexOf("not a valid key") > -1, "got the right exception make sense");
        }
    });

    test('appengine.store put/get/remove with big strings works', function() {
        var str = "";
        for (var i = 0; i < 500; i++) {
            str += "a";
        }
        var o1 = { "foo" : str };
        var key = appengine.store.put(o1);
        var o2 = appengine.store.get(key);
        are_same(o1,o2);
        appengine.store.remove(key);
        ok(appengine.store.get(key) == null, "entity was not found");
    });

    test('appengine.store stored objects have the right metadata', function() {
        var o1 = { "foo" : "bar" };
        var now = (new Date()).getTime();
        var key = appengine.store.put(o1);
        var o2 = appengine.store.get(key);
        are_same(o1,o2);
        ok(typeof o2._ != "undefined", "metadata container exists");
        ok(typeof o2._.key != "undefined", "key exists");
        ok(key == o2._.key, "key is the same");
        ok(o2._.creation_time, "creation_time exists");
        ok(o2._.creation_time - now < 10, "creation_time is reasonable");
        ok(o2._.last_modified_time, "last_modified_time exists");
        ok(o2._.last_modified_time == o2._.creation_time, "for new objects last_modified_time and creation_time are the same");
        acre.wait(100);
        now = (new Date()).getTime();
        appengine.store.update(key,o1);
        o2 = appengine.store.get(key);
        ok(o2._.last_modified_time != o2._.creation_time, "for updated objects last_modified_time and creation_time are different");
        ok(o2._.last_modified_time - now < 10, "last_modified_time is reasonable");
        appengine.store.remove(key);
    });
    
    test('appengine.store remove by object works', function() {
        var o = { "foo" : "bar" };
        var key = appengine.store.put(o);
        try {
            // can't remove by object if they were not obtained from the store
            appengine.store.remove(o);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
        o = appengine.store.get(key);
        appengine.store.remove(o);
        ok(appengine.store.get(key) == null, "entity was not found");
    });

    test('appengine.store remove by array of keys works', function() {
        var o1 = { "foo1" : "bar1" };
        var o2 = { "foo2" : "bar2" };
        var key1 = appengine.store.put(o1);
        var key2 = appengine.store.put(o2);
        appengine.store.remove([key1,key2]);
        ok(appengine.store.get(key1) == null, "entity was not found");
        ok(appengine.store.get(key2) == null, "entity was not found");
    });

    test('appengine.store remove by array of objects works', function() {
        var o1 = { "foo1" : "bar1" };
        var o2 = { "foo2" : "bar2" };
        var key1 = appengine.store.put(o1);
        var key2 = appengine.store.put(o2);
        o1 = appengine.store.get(key1);
        o2 = appengine.store.get(key2);
        appengine.store.remove([o1,o2]);
        ok(appengine.store.get(key1) == null, "entity was not found");
        ok(appengine.store.get(key2) == null, "entity was not found");
    });

    test('appengine.store update by key works', function() {
        var o1 = { "foo" : "bar" };
        var key = appengine.store.put(o1);
        var o2 = { "foo" : "whatever", "this" : "that" };
        id = appengine.store.update(key, o2);
        var o3 = appengine.store.get(key);
        are_same(o2,o3);
        appengine.store.remove(key);
    });

    test('appengine.store update by object works', function() {
        var o1 = { "foo" : "bar" };
        var key = appengine.store.put(o1);
        var o2 = appengine.store.get(key);
        o2["foo"] = "whatever";
        o2["this"] = "that";
        var o3 = { "foo" : "whatever", "this" : "that" };
        id = appengine.store.update(o2);
        var o4 = appengine.store.get(key);
        are_same(o3,o4);
        appengine.store.remove(key);
    });

    test('appengine.store first works', function() {
        var o = { "foo" : "2" };
        var key = appengine.store.put(o);
        var result = appengine.store.find({ "foo" : "3" });
        var o = result.first();
        ok(typeof o == 'undefined', "first() returns undefined on empty result sets");
        appengine.store.remove(key);
    });

    test('appengine.store count works', function() {
        var o1 = { "foo" : "bar1" };
        var o2 = { "foo" : "bar2" };
        var key1 = appengine.store.put(o1);
        var key2 = appengine.store.put(o2);
        var count = appengine.store.find_keys({}).get_count();
        equal(count,2,"get_count() returns the right number of items");
        appengine.store.remove([key1,key2]);
    });

    test('appengine.store find_keys works', function() {
        var o1 = { "foo" : "bar1" };
        var o2 = { "foo" : "bar2" };
        var key1 = appengine.store.put(o1);
        var key2 = appengine.store.put(o2);
        var keys = appengine.store.find_keys({}).as_array();
        equal(key1,keys[0],"find_keys returns the right key");
        equal(key2,keys[1],"find_keys returns the right key");
        appengine.store.remove([key1,key2]);
    });

    test('appengine.store must complain if objs have "." in properties', function() {
        var o = { 
            "a.a" : "A"
        };
        try {
            var id = appengine.store.put(o);
            appengine.store.remove(id);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
        try {
            appengine.store.find(o);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
        
    });

    test('appengine.store must complain while saving objects that have "." in properties', function() {
        var o = { 
            "a.a" : "A"
        };
        try {
            var id = appengine.store.put(o);
            appengine.store.remove(id); // remove in case this goes thru, although it should not
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('appengine.store must complain while querying with queries that have "." in properties', function() {
        var o = { 
            "a.a" : "A"
        };
        try {
            appengine.store.find(o);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('appengine.store saving objects with "_" property', function() {
        var o = { 
            "_" : "A"
        };
        
        try {
            // store should ignore the "_" property when storing
            var id = appengine.store.put(o);
            ok(true,"exception wasn't triggered");
        } catch (e) {
            ok(false,"exception was triggered");
        }
        
        appengine.store.remove(id);
    });

    test('appengine.store querying with valid "_" filters works', function() {
        try {
            var start = (new Date()).getTime();

            acre.wait(10);

            var o1 = { 
                "foo" : "bar"
            };
            var key = appengine.store.put(o1);
            var o2 = appengine.store.get(key);
            
            var query = {
                "_" : {
                    "creation_time>" : start 
                }
            };
                        
            var result = appengine.store.find(query);
            var o3 = result.first();
            ok(typeof o3 != "undefined","result exists");
            are_same(o2,o3);

            appengine.store.remove(key);
        } catch (e) {
            ok(false,"exception was triggered");
        } finally {
            if (key) appengine.store.remove(key);
        }
    });

    test('appengine.store querying with invalid "_" filters throws', function() {
        var query = { 
            "_" : {
                "whatever>=" : 0
            }
        };
        try {
            appengine.store.find(query);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('appengine.store update via find works', function() {
        var o1 = { "foo" : "1", "this" : "this" };
        var o2 = { "foo" : "2", "this" : "that" };
        var key = appengine.store.put(o1);
        var o = appengine.store.find({ "foo" : "1" }).first();
        ok(typeof o == 'object', "first() returns an object");
        ok("_" in o, "found objects have metadata");
        equal(key,o._.key, "keys are the are_same");
        key = appengine.store.update(o._.key, o2);
        var o3 = appengine.store.get(key);
        are_same(o2,o3);
        appengine.store.remove(key);
    });

    test('appengine.store find with undefined query throws', function() {
        try {
            appengine.store.find(undefined);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('appengine.store find with undefined query throws', function() {
        try {
            appengine.store.find_keys(undefined);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('appengine.store find works and has all the pieces', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = appengine.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = appengine.store.put(o2);
        var o3 = { 
            "a" : "B",
            "b" : "A"
        };
        var key3 = appengine.store.put(o3);

        var result = appengine.store.find({ 
            "a" : "A"
        });
        ok(typeof result != "undefined", "find returned a result object");
        ok(typeof result.__iterator__ != "undefined", "result is an iterator");
        var c = 0;
        for (var r in result) {
            c++;
            if (c == 1) {
                are_same(r,o1);
            } else if (c == 2) {
                are_same(r,o2);
            }
        }
        ok(c == 2, "got correct number of results");
        
        appengine.store.remove([key1,key2,key3]);
    });

    test('appengine.store find cursors work', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = appengine.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = appengine.store.put(o2);

        var query = {
            "a" : "A"
        };
        var result1 = appengine.store.find(query);
        var r1 = result1.first();
        are_same(r1,o1);
        
        var cursor = result1.get_cursor();
        var result2 = appengine.store.find(query,cursor);
        var r2 = result2.first();
        are_same(r2,o2);
        
        appengine.store.remove([key1,key2]);
    });

    test('appengine.store find works with limit', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = appengine.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = appengine.store.put(o2);

        var query = {
            "a" : "A"
        };
        var result = appengine.store.find(query).limit(1);
        var result_array = result.as_array();
        equal(result_array.length, 1);
        are_same(result_array[0],o1);
        
        appengine.store.remove([key1,key2]);
    });

    test('appengine.store find works with limit and offset', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = appengine.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = appengine.store.put(o2);

        var query = {
            "a" : "A"
        };
        var result = appengine.store.find(query).limit(1).offset(1);
        var result_array = result.as_array();
        equal(result_array.length, 1);
        are_same(result_array[0],o2);
        
        appengine.store.remove([key1,key2]);
    });

    test('appengine.store find as_array work', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = appengine.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = appengine.store.put(o2);

        var query = {
            "a" : "A"
        };
        
        var results = appengine.store.find(query).as_array();
        ok(results instanceof Array, "results is an array");
        
        are_same(results[0],o1);
        are_same(results[1],o2);
        
        appengine.store.remove([key1,key2]);
    });

    test('appengine.store find works against nested objects', function() {
        var o1 = { 
            "a" : {
                "a" : "A"
            },
            "b" : "A"
        };
        var key1 = appengine.store.put(o1);
        var o2 = { 
            "a" : {
                "a" : "B"
            },
            "b" : "B"
        };
        var key2 = appengine.store.put(o2);
        var o3 = { 
            "a" : {
                "b" : "B"
            },
            "b" : "B"
        };
        var key3 = appengine.store.put(o3);

        var result = appengine.store.find({ 
            "a" : {
                "a" : "A"
            }
        });
        var c = 0;
        for (var r in result) {
            c++;
            if (c == 1) {
                are_same(r,o1);
            }
        }
        ok(c == 1, "got correct number of results");
        
        appengine.store.remove([key1,key2,key3]);
    });

    test('appengine.store find works with other filter operators', function() {
        var o1 = { 
            "a" : {
                "b" : 1
            }
        };
        var key1 = appengine.store.put(o1);
        var o2 = { 
            "a" : {
                "b" : 2
            }
        };
        var key2 = appengine.store.put(o2);
        var o3 = { 
            "a" : {
                "b" : 3
            }
        };
        var key3 = appengine.store.put(o3);

        var result = appengine.store.find({ 
            "a" : {
                "b>=" : 2
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 2, "got correct number of results");

        var result = appengine.store.find({ 
            "a" : {
                "b<=" : 3
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 3, "got correct number of results");

        var result = appengine.store.find({ 
            "a" : {
                "b>" : 2
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 1, "got correct number of results");
        
        var result = appengine.store.find({ 
            "a" : {
                "b<" : 2
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 1, "got correct number of results");
        
        appengine.store.remove([key1,key2,key3]);
    });

    test('appengine.store works with |= filter operator on strings', function() {
        var o1 = {
            "a" : {
                "b" : "1"
            }
        };
        var key1 = appengine.store.put(o1);
        var o2 = {
            "a" : {
                "b" : "2"
            }
        };
        var key2 = appengine.store.put(o2);
        var o3 = {
            "a" : {
                "b" : "3"
            }
        };
        var key3 = appengine.store.put(o3);

        var result = appengine.store.find({
            "a" : {
                "b|=" : [ "1", "2" ]
            }
        });
        var c = 0;
        for (var r in result) c++;
        equal(c, 2, "got correct number of results");
        appengine.store.remove([key1,key2,key3]);
    });

    test('appengine.store works with |= filter operator on numbers', function() {
        var o1 = {
            "a" : {
                "b" : 1
            }
        };
        var key1 = appengine.store.put(o1);
        var o2 = {
            "a" : {
                "b" : 2
            }
        };
        var key2 = appengine.store.put(o2);
        var o3 = {
            "a" : {
                "b" : 3
            }
        };
        var key3 = appengine.store.put(o3);

        var result = appengine.store.find({
            "a" : {
                "b|=" : [1,2]
            }
        });
        var c = 0;
        for (var r in result) c++;
        equal(c, 2, "got correct number of results");
        appengine.store.remove([key1,key2,key3]);
    });

    test('appengine.store commit works', function() {
        var root = { "root" : "yeah!" };
        var key = appengine.store.put("root",root);
        var t = appengine.store.begin();
        try {
            var o1 = { "a" : "A" };
            var key1 = appengine.store.put("o1", o1, key, t);
            var o2 = { "b" : "B" };
            var key2 = appengine.store.put("o2", o2, key, t);
            if (t.is_active()) t.commit();
            ok(true,"commit worked");
        } catch (e) {
            if (t.is_active()) t.rollback();
            ok(false,"exception wasn't supposed to be triggered");
        }

        var o3 = appengine.store.get(key1);
        are_same(o1,o3);

        var o4 = appengine.store.get(key2);
        are_same(o2,o4);
        
        ok(!t.is_active(),"transaction is no longer active");

        appengine.store.remove([key,key1,key2]);
    });

    test('appengine.store rollback works', function() {
        var root = { "root" : "yeah!" };
        var key = appengine.store.put("root",root);
        var t = appengine.store.begin();
        try {
            var o1 = { "a" : "A" , "type" : "blah" };
            var key1 = appengine.store.put("o1", o1, key, t);
            var o2 = { "b" : "B" , "type" : "blah" };
            var key2 = appengine.store.put("o2", o2, key, t);
            JSON.parse("["); // this will throw (on purpose)
            if (t.is_active()) t.commit();
            ok(false,"exception should have been triggered");
        } catch (e) {
            if (t.is_active()) t.rollback();
            ok(true,"exception was triggered");
        }

        ok(!t.is_active(),"transaction is no longer active");

        var result = appengine.store.find({ "type" : "blah" }).first();
        ok(typeof result == 'undefined', "nothing was added");
        appengine.store.remove(key);
    });
        
}

acre.test.report();
