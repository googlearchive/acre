acre.require('/test/lib').enable(this);

test('JSON roundtrippig map with numbers',function() {
  var a = JSON.parse('{ "1" : 1 }');
  equal(a["1"],1);
});

acre.test.report();
