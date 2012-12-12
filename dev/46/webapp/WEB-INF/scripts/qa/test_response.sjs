acre.require('/test/lib').enable(this);

test('good response codes',function() {
  var codes = new Array(200, 205, 210, 230, 245, 299);
  for ( var i=0; i<codes.length; i++ ){
    this.file = 'response?status=' + codes[i]
    var result = acre.test.urlfetch();
    //equal(result.headers, 1);
    equal(result.status, codes[i]);
  }
    
});

test('bad response codes',function() {
  var codes = new Array(400, 401, 402, 403, 404, 405, 500, 503);
  for ( var i=0; i<codes.length; i++ ){
    this.file = 'response?status=' + codes[i]
    var result = acre.test.urlfetch();
    equal(result.status, codes[i]);
  }
    
});

test('301 response code', function() {
  var url = acre.request.base_url + 'response?status=301';
  var result = acre.urlfetch(url, {
        no_redirect : true
    });
  equal(result.status, 301);
});

acre.test.report();
