acre.require('/test/lib').enable(this);

test('acre.exit',function() {
  this.file = "exit";
  equal('PASS',acre.test.urlfetch().body);
});

test('acre.exit require',function() {
  this.file = "exit_require";
  equal('PASS',acre.test.urlfetch().body);
});

acre.test.report();
