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

test('acre.require no url',function() {
  this.file = "require";
  var result = acre.test.urlfetch();
  var msg = JSON.parse(result.body).message;
  equal(msg, 'No URL provided');
});

test('acre.require noexist url',function() {
  this.file = "require?url=" + "/freebase/apps/qatests/api/does_not_exist";
  var result = acre.test.urlfetch();
  var msg = JSON.parse(result.body).message;
  equal(msg, "Could not fetch data from //api.qatests.apps.freebase.dev/does_not_exist");
});

test('acre.require noexist url2',function() {
  var url = acre.freebase.service_url + "/freebase/apps/qatests/api/whatever";
  this.file = "require?url=" + url;
  var result = acre.test.urlfetch();
  var msg = JSON.parse(result.body).message;
  equal(msg, "Could not fetch data from " + url);
});

test('acre.require bad content',function() {
  this.file = "require?url=" + "/type/type";
  var result = acre.test.urlfetch();
  var msg = JSON.parse(result.body).message;
  equal(msg, "Could not fetch data from //type.dev/type");
});

test('acre.require query',function() {
  this.file = "require_query?url=/qa/mqlread_not_unique.mql";
  var result = acre.test.urlfetch();
  var response = JSON.parse(result.body);
  equal(response.query.name, "mqlread_not_unique.mql");
  same(response.query.query, [{ "id":null, "type":"/music/artist", "limit":3 }]);
  same(response.mqlread.result, [{"type":"/music/artist","id":"/en/blonde_redhead"},{"type":"/music/artist","id":"/en/bruce_cockburn"},{"type":"/music/artist","id":"/en/buck_owens"}]);
});

test('acre.require query2',function() {
  this.file = "require_query?url=/qa/mql_query_test.mql";
  var result = acre.test.urlfetch();
  var response = JSON.parse(result.body);
  equal(response.query.name, "mql_query_test.mql");
  same(response.query.query, { "id":"/user/acretestbot", "type":[] });
  same(response.mqlread.result, { "type": [ "/type/user", "/type/namespace", "/freebase/user_profile" ], "id": "/user/acretestbot" });
});

test('acre.require script',function() {
  this.file = "require?url=/qa/script_js&eval_string=" + encodeURI('result.add([1,2,3,4,5])');
  var result = acre.test.urlfetch();
  var response = JSON.parse(result.body);
  equal(response.eval_result, 15);
});

test('acre.require script parse error',function() {
  this.file = "require_script?url=/qa/js_parse_error";
  var result = acre.test.urlfetch();
  var response = JSON.parse(result.body);
  equal(response.description, "error passing /qa/js_parse_error to acre.require");
});

test('acre.require script show_acre',function() {
  // ported this test over, not really clear what it's supposed to test -brendan
  this.file = "show_acre";
  var result = acre.test.urlfetch();
  var response = result.body;
  var pat = new RegExp('.+require..function.+');
  ok(pat.test(response.replace(/\n/g, '')), 'found a function');
});

acre.test.report();
