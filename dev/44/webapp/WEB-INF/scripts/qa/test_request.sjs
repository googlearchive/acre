acre.require('/test/lib').enable(this);

test('acre.request basic',function() {
  expected = {
    "request_method": "GET",
    "request_body": "", 
    "status": 200, 
    "status_text": null, 
    "content_type": "text/plain; charset=utf-8",
   };

  this.file = 'request';
  var result = acre.test.urlfetch();
  for (k in expected) {
    equal(result[k], expected[k], k);
  }
  equal(result['cookies']['foo']['value'], 'bar');

});

acre.test.report();
