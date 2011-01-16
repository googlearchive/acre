acre.require('/test/lib').enable(this);

// not all acre instances might have a store present so check to make sure
if (acre.store) {

    test('acre.store exists and has all the pieces', function() {
        ok(typeof acre.store != "undefined", "store exists");
        ok(typeof acre.store.get == "function", "store.get exists");
        ok(typeof acre.store.put == "function", "store.put exists");
        ok(typeof acre.store.erase == "function", "store.erase exists");
        ok(typeof acre.store.update == "function", "store.update exists");
        ok(typeof acre.store.find == "function", "store.find exists");
        ok(typeof acre.store.begin == "function", "store.begin exists");
        ok(typeof acre.store.commit == "function", "store.commit exists");
        ok(typeof acre.store.rollback == "function", "store.rollback exists");
    });
    
    test('acre.store put/get/erase works', function() {
        var o1 = { "foo" : "bar" };
        var id = acre.store.put(o1);
        var o2 = acre.store.get(id);
        deepEqual(o1,o2);
        acre.store.erase(id);
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
        deepEqual(o2,o3);
        acre.store.erase(id);
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

    test('acre.store multiple erase works', function() {
        var o1 = { 
            "a" : "A"
        };
        var id1 = acre.store.put(o1);
        var o2 = { 
            "b" : "B"
        };
        var id2 = acre.store.put(o2);
        
        acre.store.erase([id1,id2]);
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
            c++;
            if (c == 1) {
                deepEqual(r,o1);
            } else if (c == 2) {
                deepEqual(r,o2);
            }
        }
        ok(c == 2, "got correct number of results");
        
        acre.store.erase([id1,id2,id3]);
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
            c++;
            if (c == 1) {
                deepEqual(r,o1);
            }
        }
        ok(c == 1, "got correct number of results");
        
        acre.store.erase([id1,id2,id3]);
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
        
        acre.store.erase([id1,id2,id3]);
    });
    
}

acre.test.report();
