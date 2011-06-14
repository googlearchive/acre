acre.require('/test/lib').enable(this);

// not all acre instances might have a task queue present so check to make sure
if (acre.tasks) {

    test('acre.tasks exists and has all the pieces', function() {
        ok(typeof acre.tasks != "undefined", "task queue exists");
        ok(typeof acre.tasks.add == "function", "tasks.add exists");
    });
    
    test('acre.tasks add works with no parameters', function() {
        try {
            acre.tasks.add({});
            ok(true,"exception wasn't triggered");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });

    test('acre.tasks add works with countdown and GET method', function() {
        try {
            acre.tasks.add({
                "name" : "test-task-1-" + (new Date()).getTime(),
                "countdown" : 1000,
                "url" : "/acre/status",
                "method" : "GET",
                "headers" : {
                   "x-something" : "somewhat",
                   "foo" : "bar"
                },
                "params" : {
                    "this" : "that",
                    "foo" : "bar"
                }
            });
            ok(true,"task was added");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });

    test('acre.tasks add works with eta and POST method', function() {
        try {
            acre.tasks.add({
                "name" : "test-task-2-" + (new Date()).getTime(),
                "eta" : (new Date()).getTime() + 2000,
                "url" : "/acre/status",
                "method" : "POST",
                "headers" : {
                   "x-something" : "somewhat",
                   "foo" : "bar"
                },
                "payload" : "whatever",
                "payload_encoding" : "ISO-8859-1"
            });
            ok(true,"task was added");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });
    
}

acre.test.report();
