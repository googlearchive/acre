acre.require('/test/lib').enable(this);

test('JSON roundtrippig map with strings',function() {
  var a = JSON.parse('{ "a" : 1 }');
  equal(a["a"],1);
});

test('JSON roundtrippig map with single digit numbers',function() {
  var a = JSON.parse('{ "1" : 1 }');
  equal(a["1"],1);
});

test('JSON roundtrippig map with numbers with leading zeros',function() {
  var a = JSON.parse('{ "01" : 1 }');
  equal(a["01"],1);
});

acre.test.report();
