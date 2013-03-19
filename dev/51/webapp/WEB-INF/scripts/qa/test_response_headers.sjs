acre.require('/test/lib').enable(this);

test('set a header',function() {
  this.file = 'response_headers?headers=' + encodeURI('{"foo":"bar"}');
  var result = acre.test.urlfetch();
  equal(result.headers.foo, 'bar');
});

test('set a few headers',function() {
  args = {
     "foo": "bar",
     "server":"my acre server",
     "From":"metaweb@freebase.com",
     "Max-Forwards":"0",
     "Set-Cookie":"hello=from_acre",
     "date" : "2009",
     "Content-Encoding" : "baz",
     "Content-Type" : "garbage",
     "Expires" : "Fri, 29 Feb 2020 19:47:30 UTC",
  };  

  headers_changed = {
     "foo": "bar",
     "from":"metaweb@freebase.com",
     "max-forwards":"0",
     "set-cookie":"hello=from_acre",
     "content-encoding" : "baz",
     "content-type" : "garbage",
     "expires" : "Fri, 29 Feb 2020 19:47:30 UTC",
  };

  headers_not_changed = {
     "server":"my acre server",
     "date" : "2009"
  };

  this.file = 'response_headers?headers=' + encodeURI(JSON.stringify(args));
  var result = acre.test.urlfetch();
  for (k in headers_changed) {
    equal(headers_changed[k], result.headers[k]);
  }
  for (k in headers_not_changed) {
    ok(headers_changed[k] != result.headers[k], 'header ' + k + ': ' + headers_changed[k] + ' != ' + result.headers[k]);
  }
});


acre.test.report();
