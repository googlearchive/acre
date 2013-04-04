acre.require('/test/lib').enable(this);

test('JSON.stringify',function() {
  this.file = "json_stringify?string=foo";
  equal(acre.test.urlfetch().body, '{"string":"\\"foo\\""}\n');
});

test('JSON.stringify {}',function() {
  this.file = "json_stringify?string=%7B%7D";
  equal(acre.test.urlfetch().body, '{"string":"\\"{}\\""}\n');
});

test('JSON.stringify empty',function() {
  this.file = "json_stringify?string=";
  equal(acre.test.urlfetch().body, '{"string":"\\"\\""}\n');
});

test('JSON.stringify undefined',function() {
  this.file = "json_stringify";
  equal(acre.test.urlfetch().body, '"Error: JSON.stringify: can not stringify undefined\"\n');
});

acre.test.report();
