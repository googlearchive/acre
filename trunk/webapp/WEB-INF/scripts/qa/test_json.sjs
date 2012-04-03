acre.require('/test/lib').enable(this);

test('JSON.parse map with strings',function() {
  var a = JSON.parse('{ "a" : 1 }');
  equal(a["a"],1);
});

test('JSON.parse map with single digit numbers',function() {
  var a = JSON.parse('{ "1" : 1 }');
  equal(a["1"],1);
});

test('JSON.parse map with numbers with leading zeros',function() {
  var a = JSON.parse('{ "01" : 1 }');
  equal(a["01"],1);
});

test('JSON.parse map with zero as key',function() {
  var a = JSON.parse('{ "0" : 1 }');
  equal(a["0"],1);
});

test('JSON.parse array',function() {
  var a = JSON.parse('[{"a":1},{"b":2}]');
  equal(a[1]["b"],2);
});

test('JSON.parse map nested',function() {
  var a = JSON.parse('[{ "object":"acre" }, {"object2":{ "name":"foo", "value":true, "integer":4}, "object3": "ok"}]')
  equal(a[1]["object2"]["name"],"foo");
  equal(a[1]["object2"]["value"],true);
  equal(a[1]["object2"]["integer"],4);
});

test('JSON.parse error',function() {
  try {
    var a = JSON.parse('{"foo","a":1}');
  } catch (e) {
    equal(e.message.substring(0,11), "key missing", "exception should have 'message'");
  }
});

test('JSON.parse deep array',function() {
  var a = JSON.parse('[[[[[[[[[[[[[[[[[[["foo"]]]]]]]]]]]]]]]]]]]');
     deepEqual(a[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0],"foo");
  notDeepEqual(a[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0],"foo");
});

test('JSON.parse deep array map',function() {
  var a = JSON.parse('[[[[[[[[[[[[[[[[[[[{"a":"foo"}]]]]]]]]]]]]]]]]]]]');
      equal(a[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0]["a"],"foo");
  deepEqual(a[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0],[{"a":"foo"}]);
});

function parsebad(jsn, rgxp) {
  try {
    JSON.parse(jsn);
    ok(false, "this json should raise an error: " + s1)
  } catch (e) {
    var start = e.message.substring(0,3)
    var msg = e.message
    // something resembline a json parse error
    ok(msg.search(rgxp) != -1, "exc: " + msg);
  };
};

test('JSON.parse trailing',function() {
  var msg = 'trailing';
  parsebad('{"Extra value after close": true} "misplaced quoted value"', msg);
  parsebad('["Comma after the close"],', msg);
  parsebad('["Extra close"]]', msg);
});

test('JSON.parse misc',function() {
  parsebad('[0e]', "For input string");
  parsebad('[0e+]', "numbers must end with");
  parsebad('[0e+-1]', "the sign of the exponent");
});

test('JSON.parse invalid',function() {
  var msg = 'invalid';
  parsebad('{"Illegal expression": 1 + 2}', msg);
  parsebad('{"Illegal invocation": alert()}', msg);
  parsebad('{"Numbers cannot be hex": 0x14}', msg);
  parsebad('["Unclosed array"', msg);
  parsebad('[\naked]', msg);
  parsebad('["Colon instead of comma": false]', msg);
  parsebad('{unquoted_key: "keys must be quoted"}', msg);
  parsebad('{"Double colon":: null}', msg);
  parsebad('["Bad value", truth]', msg);
  parsebad('{"Comma instead if closing brace": true,', msg);
  parsebad('["mismatch"}', msg);

});

test('JSON.parse key missing',function() {
  var msg = 'key missing';
  parsebad('{"Comma instead of colon", null}', msg);
  parsebad('{"Missing colon" null}', msg);

});

acre.test.report();
