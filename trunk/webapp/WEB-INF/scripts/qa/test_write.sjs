acre.require('/test/lib').enable(this);

test('acre.write',function() {
  equal("ok",acre.test.urlfetch().body);
});

acre.test.report();
