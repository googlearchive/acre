// target of test_qunit_basic
// make sure that test files don't output anything when required
// and that the list of modules is available

// use acre.request.params.mode='discover' unless you want to execute the tests

// require the test
var testfile = acre.require('qunit_basic');

if (acre.request.params.mode==='discover') {
  // output the discovered tests, this should be the only output
  acre.write(JSON.stringify( testfile.acre.test.get_modules(),null,2 ));
}