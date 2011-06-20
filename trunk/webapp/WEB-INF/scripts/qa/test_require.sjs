acre.require('/test/lib').enable(this);

var req_app = "//require.qatests.apps.freebase.dev";

test('basic require',function() {
    var scope = acre.require(req_app + "/foo.sjs");
    ok(scope.foo === "foo", "require worked");
});

test('applied require',function() {
    var scope = acre.require(req_app + "/foo.sjs");
    acre.require.call(scope, req_app + "/bar.sjs");
    ok(scope.bar === "bar", "require applied to same scope");
});

test('relative require',function() {
    var scope = acre.require(req_app + "/relative.sjs");
    ok(scope.foo, "relative require worked");
});

test('in-directory require',function() {
    var scope = acre.require(req_app + "/dir/dot_slash.sjs");
    ok(scope.bar === "bar", "top-level require worked");
    ok(scope.foo === "bar", "./ require worked");
});


acre.test.report();