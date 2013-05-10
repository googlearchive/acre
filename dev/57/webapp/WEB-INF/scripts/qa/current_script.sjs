acre.require('/test/lib').enable(this);

test("current_script info", function() {
    equal(acre.current_script.id, "/qa/current_script.sjs");
    equal(acre.current_script.app.id, "/qa");
    equal(acre.current_script.app.path, "//qa.dev");
});


acre.test.report();
