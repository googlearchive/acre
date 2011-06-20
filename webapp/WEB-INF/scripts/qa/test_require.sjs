acre.require('/test/lib').enable(this);

var req_app = "//require.qatests.apps.freebase.dev";

test('basic require',function() {
    var scope = acre.require(req_app + "/foo.sjs");
    ok(scope.foo, "foo was set");
});

test('applied require',function() {
    var scope = acre.require(req_app + "/foo.sjs");
    acre.require.call(scope, req_app + "/bar.sjs");
    ok(scope.bar, "bar was set");
});

test('relative require',function() {
    var scope = acre.require(req_app + "/relative.sjs");
    ok(scope.foo, "foo was set");
});

acre.test.report();