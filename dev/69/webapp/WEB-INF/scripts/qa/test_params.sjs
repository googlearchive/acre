acre.require('/test/lib').enable(this);


function gen_params(n) {
  var these_params = '?arg1=val1';
  for (var i = 2; i <= n; i++) {
    these_params += '&arg' + i + '=val' + i;
  }
  return these_params;
}

function count_params(params) {
  var count = 0;
  for (k in params) {
    count += 1;
  }
  return count;
}

test('100 params',function() {
  this.file = 'get_environ' + gen_params(100);
  var result = JSON.parse(acre.test.urlfetch().body);
  equal(count_params(result.params), 100);
});

test('158 params',function() {
  // test "driver" scripts can't produce GETS of more than 2000B
  this.file = 'get_environ' + gen_params(158);
  var result = JSON.parse(acre.test.urlfetch().body);
  equal(count_params(result.params), 158);
});

acre.test.report();
