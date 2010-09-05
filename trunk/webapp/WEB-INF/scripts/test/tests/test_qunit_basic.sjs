/*global module test ok equals*/

// Test the Acre-specific parts of the QUnit framework

// Run this as
// http://tests.test.dev.acre.z/test_qunit_basic?output=json&mode=discover
// http://tests.test.dev.acre.z/test_qunit_basic?output=json

acre.require('/test/lib').enable(this);

module('check listfiles mode');

test('check /acre/test?mode=listfiles returns list of run_urls',function() {
  // we don't use  acre.test.urlfetch because we're not doing a file based test
  var testurl = acre.request.base_url+'acre/test?mode=listfiles';
  var response_str = acre.urlfetch(testurl).body;
  var response = JSON.parse(response_str);
  ok( response.length > 3, "We expect to see plenty of test_files");
  ok( /http\S+tests.test\S+test_qunit_basic/.test(response_str), 'This file should appear in the list of test files urls');
  ok( !(/acre-tests.willmoffat.user/.test(response_str)),        'Tests for dependent libs should NOT show up');
});

test('check /acre/test?mode=listfiles&recurse=1 returns list of run_urls',function() {
  // we don't use  acre.test.urlfetch because we're not doing a file based test
  var testurl = acre.request.base_url+'acre/test?mode=listfiles&recurse=1';
  var response_str = acre.urlfetch(testurl).body;
  var response = JSON.parse(response_str);
  ok( response.length > 3, "We expect to see plenty of test_files");
  ok( /http\S+tests.test\S+test_qunit_basic/.test(response_str), 'This file should appear in the list of test files urls');
  ok( /acre-tests.willmoffat.user/.test(response_str),           'Tests for dependent libs SHOULD show up');
});


module('check discovery mode',{
  args:{output:'json',mode:'discover'}
});
test('check',function() {
  var response = acre.test.urlfetch();
  var body = response.body;
  var ts = JSON.parse(body); //test_suite

  ok( ts.app_path, 'app_path exists' );
  var m = ts.testfiles[0].modules[0];
  var expected_module = {
    name:'DEFAULT',
    testEnvironment:{},    // the module testEnvironment is also logged, I don't use this currently, since every test also logs it's testEnvironment
    tests:[{
      name:"minimum test",
      testEnvironment:{}
    }
    ]
  };
  same( m, expected_module, 'default empty module');
  
  var run_url = response.request_url.replace(/\?.+$/,''); // strip away any url params
  equals( ts.testfiles[0].run_url, run_url, 'check that run_url actually is the url that runs this test');

});


module('check execute mode',{
  args:{output:'json',mode:'execute'}
});
test('check',function() {
  var response = acre.test.urlfetch();
  var body = response.body;
  var ts = JSON.parse(body); //test_suite
  var test, m;

  ok( ts.app_path, 'app_path exists' );
  same( ts.failures, 0, 'failures is defined and 0');
  ok(   ts.total>=2   , 'total defined at test_suite level, and there are at least 2 tests');

  m = ts.testfiles[0].modules[0]; // first module
  equals( m.name, 'DEFAULT',  'unamed modules are called DEFAULT');
  same( m.failures, 0, 'failures defined in default module' );
  same( m.total,    1, 'totals   defined in default module' );

  m = ts.testfiles[0].modules[2];
  test = m.tests[1];
  equals( test.name, 'test with testEnvironment', 'check the correct test');
  same( test.testEnvironment, {hamsters:'cute'}, 'make sure that testEnvironment was set and logged correctly for this test');
  
  var run_url = response.request_url.replace(/\?.+$/,''); // strip away any url params
  equals( ts.testfiles[0].run_url, run_url, 'check that run_url actually is the url that runs this test');
});


module('acre.require gives no output', {
  file:'require_mode'
});

test('check no output when acre.requiring a test',function() {
  // this is a test_ file even although it doesn't start with test_
  // this target acre.require()s 'qunit_basic' 
  var body = acre.test.urlfetch().body;
  same(body.length,1, "body is empty"); //ACRE-1589 - should be body.length===0
});

test('check modules were discovered',{
  args:{mode:'discover'}
}, function() {
  var body = acre.test.urlfetch().body; // should output the discovered modules
  var modules = JSON.parse(body);
  var test, m;

  m = modules[0]; // first module
  equals( m.name, 'DEFAULT',  'unamed modules are called DEFAULT');

  m = modules[2];
  test = m.tests[1];
  equals( test.name, 'test with testEnvironment', 'check the correct test');
  same( test.testEnvironment, {hamsters:'cute'}, 'make sure that testEnvironment was set and logged correctly for this test');
});


acre.test.report();
