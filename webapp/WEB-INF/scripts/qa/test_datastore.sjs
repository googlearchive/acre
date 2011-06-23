acre.require('/test/lib').enable(this);

// not all acre instances might have a store present so check to make sure
if (acre.store) {

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
    var all = acre.store.find({});
    for (var r in all) {
        acre.store.remove(r);
    }
    
    test('acre.store exists and has all the pieces', function() {
        ok(typeof acre.store != "undefined", "store exists");
        ok(typeof acre.store.key == "function", "store.key exists");
        ok(typeof acre.store.explain_key == "function", "store.explain_key exists");
        ok(typeof acre.store.get == "function", "store.get exists");
        ok(typeof acre.store.put == "function", "store.put exists");
        ok(typeof acre.store.remove == "function", "store.remove exists");
        ok(typeof acre.store.update == "function", "store.update exists");
        ok(typeof acre.store.find == "function", "store.find exists");
        ok(typeof acre.store.find_keys == "function", "store.find_keys exists");
        ok(typeof acre.store.begin == "function", "store.begin exists");
    });

    test('acre.store key/explains_key work as expected', function() {
        var id = "some_id";
        var type = "some_type";
        var key = acre.store.key(id,type);
        var explained_key = acre.store.explain_key(key);
        equal(explained_key,'some_type("some_id")', "key explained as expected");
    });
    
    test('acre.store put/get/remove works with no provided id', function() {
        var o1 = { "foo" : "bar" };
        var key = acre.store.put(o1);
        var o2 = acre.store.get(key);
        are_same(o1,o2);
        acre.store.remove(key);
        try {
            acre.store.get(key);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store put/get/remove works with provided id for untyped object', function() {
        var id = "whatever";
        var key = acre.store.key(id);
        var o1 = { "foo" : "bar" };
        acre.store.put(id,o1);
        var o2 = acre.store.get(key);
        are_same(o1,o2);
        acre.store.remove(key);
        try {
            acre.store.get(key);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store put/get/remove works with provided id for typed object', function() {
        var id = "whatever";
        var type = "test";
        var key = acre.store.key(id,type);
        var o1 = { "foo" : "bar", "type" : type };
        var key2 = acre.store.put(id,o1);
        var o2 = acre.store.get(key);
        are_same(o1,o2);
        acre.store.remove(key);
        try {
            acre.store.get(key);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store get without a key fails properly', function() {
        try {
            acre.store.get("blah");
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
            ok(e.message.indexOf("not a valid key") > -1, "got the right exception make sense");
        }
    });

    test('acre.store put/get/remove with big strings works', function() {
        var str = "";
        for (var i = 0; i < 500; i++) {
            str += "a";
        }
        var o1 = { "foo" : str };
        var key = acre.store.put(o1);
        var o2 = acre.store.get(key);
        are_same(o1,o2);
        acre.store.remove(key);
        try {
            acre.store.get(key);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store stored objects have the right metadata', function() {
        var o1 = { "foo" : "bar" };
        var now = (new Date()).getTime();
        var key = acre.store.put(o1);
        var o2 = acre.store.get(key);
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
        acre.store.update(key,o1);
        o2 = acre.store.get(key);
        ok(o2._.last_modified_time != o2._.creation_time, "for updated objects last_modified_time and creation_time are different");
        ok(o2._.last_modified_time - now < 10, "last_modified_time is reasonable");
        acre.store.remove(key);
    });
    
    test('acre.store remove by object works', function() {
        var o = { "foo" : "bar" };
        var key = acre.store.put(o);
        try {
            // can't remove by object if they were not obtained from the store
            acre.store.remove(o);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
        o = acre.store.get(key);
        acre.store.remove(o);
        try {
            acre.store.get(key);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store remove by array of keys works', function() {
        var o1 = { "foo1" : "bar1" };
        var o2 = { "foo2" : "bar2" };
        var key1 = acre.store.put(o1);
        var key2 = acre.store.put(o2);
        acre.store.remove([key1,key2]);
        try {
            acre.store.get(key1);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
        try {
            acre.store.get(key2);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store remove by array of objects works', function() {
        var o1 = { "foo1" : "bar1" };
        var o2 = { "foo2" : "bar2" };
        var key1 = acre.store.put(o1);
        var key2 = acre.store.put(o2);
        o1 = acre.store.get(key1);
        o2 = acre.store.get(key2);
        acre.store.remove([o1,o2]);
        try {
            acre.store.get(key1);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
        try {
            acre.store.get(key2);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store update by key works', function() {
        var o1 = { "foo" : "bar" };
        var key = acre.store.put(o1);
        var o2 = { "foo" : "whatever", "this" : "that" };
        id = acre.store.update(key, o2);
        var o3 = acre.store.get(key);
        are_same(o2,o3);
        acre.store.remove(key);
    });

    test('acre.store update by object works', function() {
        var o1 = { "foo" : "bar" };
        var key = acre.store.put(o1);
        var o2 = acre.store.get(key);
        o2["foo"] = "whatever";
        o2["this"] = "that";
        var o3 = { "foo" : "whatever", "this" : "that" };
        id = acre.store.update(o2);
        var o4 = acre.store.get(key);
        are_same(o3,o4);
        acre.store.remove(key);
    });

    test('acre.store first works', function() {
        var o = { "foo" : "2" };
        var key = acre.store.put(o);
        var result = acre.store.find({ "foo" : "3" });
        var o = result.first();
        ok(typeof o == 'undefined', "first() returns undefined on empty result sets");
        acre.store.remove(key);
    });

    test('acre.store count works', function() {
        var o1 = { "foo" : "bar1" };
        var o2 = { "foo" : "bar2" };
        var key1 = acre.store.put(o1);
        var key2 = acre.store.put(o2);
        var count = acre.store.find_keys({}).get_count();
        equal(count,2,"get_count() returns the right number of items");
        acre.store.remove([key1,key2]);
    });

    test('acre.store find_keys works', function() {
        var o1 = { "foo" : "bar1" };
        var o2 = { "foo" : "bar2" };
        var key1 = acre.store.put(o1);
        var key2 = acre.store.put(o2);
        var keys = acre.store.find_keys({}).as_array();
        equal(key1,keys[0],"find_keys returns the right key");
        equal(key2,keys[1],"find_keys returns the right key");
        acre.store.remove([key1,key2]);
    });

    test('acre.store must complain if objs have "." in properties', function() {
        var o = { 
            "a.a" : "A"
        };
        try {
            acre.store.put(o);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
        try {
            acre.store.find(o);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store handling objects with "_" property', function() {
        var o = { 
            "_" : "A"
        };
        try {
            // store should ignore the "_" property when storing
            acre.store.put(o);
            ok(true,"exception wasn't triggered");
        } catch (e) {
            ok(false,"exception was triggered");
        }
        try {
            // but complain if used in a query
            acre.store.find(o);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });

    test('acre.store update via find works', function() {
        var o1 = { "foo" : "1", "this" : "this" };
        var o2 = { "foo" : "2", "this" : "that" };
        var key = acre.store.put(o1);
        var o = acre.store.find({ "foo" : "1" }).first();
        ok(typeof o == 'object', "first() returns an object");
        ok("_" in o, "found objects have metadata");
        equal(key,o._.key, "keys are the are_same");
        key = acre.store.update(o._.key, o2);
        var o3 = acre.store.get(key);
        are_same(o2,o3);
        acre.store.remove(key);
    });

    test('acre.store find works and has all the pieces', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = acre.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = acre.store.put(o2);
        var o3 = { 
            "a" : "B",
            "b" : "A"
        };
        var key3 = acre.store.put(o3);

        var result = acre.store.find({ 
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
        
        acre.store.remove([key1,key2,key3]);
    });

    test('acre.store find cursors work', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = acre.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = acre.store.put(o2);

        var query = {
            "a" : "A"
        };
        var result1 = acre.store.find(query);
        var r1 = result1.first();
        are_same(r1,o1);
        
        var cursor = result1.get_cursor();
        var result2 = acre.store.find(query,cursor);
        var r2 = result2.first();
        are_same(r2,o2);
        
        acre.store.remove([key1,key2]);
    });

    test('acre.store find works with limit', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = acre.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = acre.store.put(o2);

        var query = {
            "a" : "A"
        };
        var result = acre.store.find(query).limit(1);
        var result_array = result.as_array();
        equal(result_array.length, 1);
        are_same(result_array[0],o1);
        
        acre.store.remove([key1,key2]);
    });

    test('acre.store find works with limit and offset', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = acre.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = acre.store.put(o2);

        var query = {
            "a" : "A"
        };
        var result = acre.store.find(query).limit(1).offset(1);
        var result_array = result.as_array();
        equal(result_array.length, 1);
        are_same(result_array[0],o2);
        
        acre.store.remove([key1,key2]);
    });

    test('acre.store find as_array work', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var key1 = acre.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var key2 = acre.store.put(o2);

        var query = {
            "a" : "A"
        };
        
        var results = acre.store.find(query).as_array();
        ok(results instanceof Array, "results is an array");
        
        are_same(results[0],o1);
        are_same(results[1],o2);
        
        acre.store.remove([key1,key2]);
    });

    test('acre.store find works against nested objects', function() {
        var o1 = { 
            "a" : {
                "a" : "A"
            },
            "b" : "A"
        };
        var key1 = acre.store.put(o1);
        var o2 = { 
            "a" : {
                "a" : "B"
            },
            "b" : "B"
        };
        var key2 = acre.store.put(o2);
        var o3 = { 
            "a" : {
                "b" : "B"
            },
            "b" : "B"
        };
        var key3 = acre.store.put(o3);

        var result = acre.store.find({ 
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
        
        acre.store.remove([key1,key2,key3]);
    });

    test('acre.store find works with other filter operators', function() {
        var o1 = { 
            "a" : {
                "b" : 1
            }
        };
        var key1 = acre.store.put(o1);
        var o2 = { 
            "a" : {
                "b" : 2
            }
        };
        var key2 = acre.store.put(o2);
        var o3 = { 
            "a" : {
                "b" : 3
            }
        };
        var key3 = acre.store.put(o3);

        var result = acre.store.find({ 
            "a" : {
                "b>=" : 2
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 2, "got correct number of results");

        var result = acre.store.find({ 
            "a" : {
                "b<=" : 3
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 3, "got correct number of results");

        var result = acre.store.find({ 
            "a" : {
                "b>" : 2
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 1, "got correct number of results");
        
        var result = acre.store.find({ 
            "a" : {
                "b<" : 2
            }
        });
        var c = 0;
        for (var r in result) c++;
        ok(c == 1, "got correct number of results");
        
        acre.store.remove([key1,key2,key3]);
    });

    test('acre.store commit works', function() {
        var root = { "root" : "yeah!" };
        var key = acre.store.put("root",root);
        var t = acre.store.begin();
        try {
            var o1 = { "a" : "A" };
            var key1 = acre.store.put("o1", o1, key, t);
            var o2 = { "b" : "B" };
            var key2 = acre.store.put("o2", o2, key, t);
            if (t.is_active()) t.commit();
            ok(true,"commit worked");
        } catch (e) {
            if (t.is_active()) t.rollback();
            ok(false,"exception wasn't supposed to be triggered");
        }

        var o3 = acre.store.get(key1);
        are_same(o1,o3);

        var o4 = acre.store.get(key2);
        are_same(o2,o4);
        
        ok(!t.is_active(),"transaction is no longer active");

        acre.store.remove([key,key1,key2]);
    });

    test('acre.store rollback works', function() {
        var root = { "root" : "yeah!" };
        var key = acre.store.put("root",root);
        var t = acre.store.begin();
        try {
            var o1 = { "a" : "A" , "type" : "blah" };
            var key1 = acre.store.put("o1", o1, key, t);
            var o2 = { "b" : "B" , "type" : "blah" };
            var key2 = acre.store.put("o2", o2, key, t);
            JSON.parse("["); // this will throw (on purpose)
            if (t.is_active()) t.commit();
            ok(false,"exception should have been triggered");
        } catch (e) {
            if (t.is_active()) t.rollback();
            ok(true,"exception was triggered");
        }

        ok(!t.is_active(),"transaction is no longer active");

        var result = acre.store.find({ "type" : "blah" }).first();
        ok(typeof result == 'undefined', "nothing was added");
        acre.store.remove(key);
    });
        
}

acre.test.report();
