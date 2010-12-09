acre.require('/test/lib').enable(this);

test('Test acre.write',function() {
  equal("ok",acre.test.urlfetch().body);
});

acre.test.report();
