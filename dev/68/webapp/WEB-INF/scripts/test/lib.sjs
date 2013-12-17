var TEST_FRAMEWORK=acre.current_script.app.id;

function _add_funcs_to_file(qunitfile,testfile) {
  
  // map QUnit to acre.test (/acre/test entry for wrapped tests like test_qunit_wrapper is supported by modifying the file proto)
  (testfile.__proto__.acre||testfile.acre).test = qunitfile.QUnit;
  
  // Adds the following QUnit test functions to the test file
  var test_funcs = [
  'module','test','ok',
  'equal', 'notEqual', 'deepEqual', 'notDeepEqual', 'strictEqual', 'notStrictEqual',
  'equals','same',                              // Deprecated
  'QUnit', 'expect' //,'start','stop','init'    // QUnit self-test uses these. Do we need them?
  ];

  test_funcs.forEach(function(prop) {
    if (prop in testfile) {
      console.warn(acre.current_script.id+': over-writing '+prop);
    }
    testfile[prop] = qunitfile[prop];
  });

}

// Add QUnit functions to the test file

function enable(testfile) {
  // was the test executed directly (rather than being required as a lib or by /acre/test ?)
  if (testfile.acre.current_script.id === acre.request.script.id || acre.request.script.id.split('/').pop() === 'routes') {
    // enable output from acre.test.report()
    acre.request.params.test_self = true;
  }
  
  if (acre.request.params.mode==='discover') {
    _add_funcs_to_file( acre.require(TEST_FRAMEWORK+'/qunitdiscover'), testfile );
    
  } else { // mode === 'execute'
    _add_funcs_to_file( acre.require(TEST_FRAMEWORK+'/qunit'), testfile ); // from http://github.com/jquery/qunit
    
    // the test results are captured by hooking the log functions
    acre.require(TEST_FRAMEWORK+'/qunitlogger').add_log_hooks(testfile);
  }
  // acre.test.engine is used in both modes
  acre.require(TEST_FRAMEWORK+'/qunit-acre-utils').add_utils(testfile);

}
