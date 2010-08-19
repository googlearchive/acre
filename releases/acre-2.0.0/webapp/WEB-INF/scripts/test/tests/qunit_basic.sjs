// Run this as
// http://tests.test.dev.acre.z/qunit_basic?output=json&mode=discover
// http://tests.test.dev.acre.z/qunit_basic?output=json

// convert 'PATH/test/tests' to 'PATH/test/lib'
var TLIB = (acre.current_script.app.id).replace(/\/[^\/]+$/,'/lib');
acre.require(TLIB).enable(this);

//m0
test('minimum test',function() {
  ok(true);
});

//m1
module('minimum module');
test('minimum test',function() {
  ok(true);
});

//m2
module('module with testEnvironment',{
  hamsters:'evil'
});
test('minimum test',function() {
  equals(this.hamsters,'evil', 'testEnvironment was set by module');
});
test('test with testEnvironment',{
  hamsters:'cute'
}, function() {
  equals(this.hamsters,'cute', 'testEnvironment was overridden by test');
});

acre.test.report();
