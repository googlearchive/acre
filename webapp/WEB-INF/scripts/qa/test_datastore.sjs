acre.require('/test/lib').enable(this);

// not all acre instances might have a store present so check to make sure
if (acre.store) {

    test('acre.store exists and has all the pieces', function() {
        ok(typeof acre.store != "undefined", "store exists");
        ok(typeof acre.store.get == "function", "store.get exists");
        ok(typeof acre.store.put == "function", "store.put exists");
        ok(typeof acre.store.remove == "function", "store.remove exists");
        ok(typeof acre.store.update == "function", "store.update exists");
        ok(typeof acre.store.find == "function", "store.find exists");
        ok(typeof acre.store.begin == "function", "store.begin exists");
        ok(typeof acre.store.commit == "function", "store.commit exists");
        ok(typeof acre.store.rollback == "function", "store.rollback exists");
    });
    
    test('acre.store put/get/remove works', function() {
        var o1 = { "foo" : "bar" };
        var id = acre.store.put(o1);
        var o2 = acre.store.get(id);
        delete o2._;
        deepEqual(o1,o2);
        acre.store.remove(id);
        try {
            acre.store.get(id);
            ok(false,"exception wasn't triggered");
        } catch (e) {
            ok(true,"exception was triggered");
        }
    });
    
    test('acre.store update works', function() {
        var o1 = { "foo" : "bar" };
        var id = acre.store.put(o1);
        var o2 = { "foo" : "whatever", "this" : "that" };
        id = acre.store.update(id, o2);
        var o3 = acre.store.get(id);
        delete o3._;
        deepEqual(o2,o3);
        acre.store.remove(id);
    });

    test('acre.store update via find works', function() {
        var o1 = { "foo" : "1", "this" : "this" };
        var o2 = { "foo" : "2", "this" : "that" };
        var id = acre.store.put(o1);
        var o = acre.store.find({ "foo" : "1" }).first();
        ok(typeof o == 'object', "first() returns an object");
        ok("_" in o, "found objects have metadata");
        equal(id,o._.key, "keys are the same");
        id = acre.store.update(o._.key, o2);
        var o3 = acre.store.get(id);
        delete o3._;
        deepEqual(o2,o3);
        acre.store.remove(id);
    });

    test('acre.store first works', function() {
        var o = { "foo" : "2" };
        var id = acre.store.put(o);
        var result = acre.store.find({ "foo" : "3" });
        var o = result.first();
        ok(typeof o == 'undefined', "first() returns undefined on empty result sets");
        acre.store.remove(id);
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

    test('acre.store must complain if objs have the "_" property', function() {
        var o = { 
            "_" : "A"
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

    test('acre.store multiple remove works', function() {
        var o1 = { 
            "a" : "A"
        };
        var id1 = acre.store.put(o1);
        var o2 = { 
            "b" : "B"
        };
        var id2 = acre.store.put(o2);
        
        acre.store.remove([id1,id2]);
    });

    test('acre.store find works and has all the pieces', function() {
        var o1 = { 
            "a" : "A",
            "b" : "B"
        };
        var id1 = acre.store.put(o1);
        var o2 = { 
            "a" : "A",
            "b" : "A"
        };
        var id2 = acre.store.put(o2);
        var o3 = { 
            "a" : "B",
            "b" : "A"
        };
        var id3 = acre.store.put(o3);

        var result = acre.store.find({ 
            "a" : "A"
        });
        ok(typeof result != "undefined", "find returned a result object");
        ok(typeof result.__iterator__ != "undefined", "result is an iterator");
        var c = 0;
        for (var r in result) {
            delete r._;
            c++;
            if (c == 1) {
                deepEqual(r,o1);
            } else if (c == 2) {
                deepEqual(r,o2);
            }
        }
        ok(c == 2, "got correct number of results");
        
        acre.store.remove([id1,id2,id3]);
    });

    test('acre.store find works against nested objects', function() {
        var o1 = { 
            "a" : {
                "a" : "A"
            },
            "b" : "A"
        };
        var id1 = acre.store.put(o1);
        var o2 = { 
            "a" : {
                "a" : "B"
            },
            "b" : "B"
        };
        var id2 = acre.store.put(o2);
        var o3 = { 
            "a" : {
                "b" : "B"
            },
            "b" : "B"
        };
        var id3 = acre.store.put(o3);

        var result = acre.store.find({ 
            "a" : {
                "a" : "A"
            }
        });
        var c = 0;
        for (var r in result) {
            delete r._;
            c++;
            if (c == 1) {
                deepEqual(r,o1);
            }
        }
        ok(c == 1, "got correct number of results");
        
        acre.store.remove([id1,id2,id3]);
    });

    test('acre.store find works with other filter operators', function() {
        var o1 = { 
            "a" : {
                "b" : 1
            }
        };
        var id1 = acre.store.put(o1);
        var o2 = { 
            "a" : {
                "b" : 2
            }
        };
        var id2 = acre.store.put(o2);
        var o3 = { 
            "a" : {
                "b" : 3
            }
        };
        var id3 = acre.store.put(o3);

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
        
        acre.store.remove([id1,id2,id3]);
    });

    test('acre.store commit works', function() {
        var root = { "root" : "yeah!" };
        var key = acre.store.put("root",root);
        try {
            acre.store.begin();
            var o1 = { "a" : "A" };
            var id1 = acre.store.put("o1", o1, key);
            var o2 = { "b" : "B" };
            var id2 = acre.store.put("o2", o2, key);
            acre.store.commit();
            ok(true,"commit worked");
        } catch (e) {
            acre.store.rollback();
            ok(false,"exception wasn't supposed to be triggered");
        }

        var o3 = acre.store.get(id1);
        delete o3._;
        deepEqual(o1,o3);

        var o4 = acre.store.get(id2);
        delete o4._;
        deepEqual(o2,o4);

        acre.store.remove([key,id1,id2]);
    });

    test('acre.store rollback works', function() {
        var root = { "root" : "yeah!" };
        var key = acre.store.put("root",root);
        try {
            acre.store.begin();
            var o1 = { "a" : "A" , "type" : "blah" };
            var id1 = acre.store.put("o1", o1, key);
            var o2 = { "b" : "B" , "type" : "blah" };
            var id2 = acre.store.put("o2", o2, key);
            JSON.parse("["); // this will throw (on purpose)
            acre.store.commit();
            ok(false,"exception should have been triggered");
        } catch (e) {
            acre.store.rollback();
            ok(true,"exception was triggered");
        }

        var result = acre.store.find({ "type" : "blah" });
        ok(typeof result.first() == 'undefined', "nothing was added");
        acre.store.remove(key);
    });
        
}

acre.test.report();
