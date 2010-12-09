acre.require('/test/lib').enable(this);

test('Test acre.request.path_info',function() {
  var path_info = "/path/info";
  this.file = "pathinfo" + path_info;
  equal(path_info,acre.test.urlfetch().body);
});

acre.test.report();
