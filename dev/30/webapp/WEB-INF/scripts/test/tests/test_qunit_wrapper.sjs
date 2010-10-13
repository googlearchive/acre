// run as http://tests.test.dev.acre.z/test_qunit_wrapper

acre.require('/test/lib').enable(this);

acre.require.call(this,'test-qunit');
acre.require.call(this,'test-equiv');

acre.test.report();
