//TODO: encode test names - or use JSON sub object for each module?

(function(window) {

  var modules = [];

  function _new_module(name,testEnvironment) {
    return {name:name, testEnvironment:testEnvironment||{}, tests:[] };
  }

  function module(name,testEnvironment) {
    modules.push(_new_module(name,testEnvironment));
  }
    
  // expected and async are ignored
  function test(testName, expected, callback, async) {
    if (!modules.length) {
      modules.push(_new_module('DEFAULT')); //create an inital dummy module, since this test isn't in a module
    }
    var currentModule = modules[modules.length-1];
    
    var testEnvironment = extend({},currentModule.testEnvironment);
    if ( arguments.length === 2 ) {
      callback = expected;
      expected = null; 
    }
    // is 2nd argument a testEnvironment?
    if ( expected && typeof expected === 'object') {
      extend(testEnvironment,expected); // expected is actually testEnvironment
    }
    
    currentModule.tests.push({
      name:testName, testEnvironment:testEnvironment
    });
  }

  function extend(a, b) {
    for ( var prop in b ) {
      a[prop] = b[prop];
    }
    return a;
  }

  function get_modules() {
    // make a copy of the module list. WILL: why is this required?
    var m = extend([],modules);
    modules = []; //reset the module list on each call
    return m;
  }

  function report() {
    //only output if test was run directly (not required or run by /acre/test)
    if (!acre.request.params.test_self) { return; }
    
    var m = get_modules();
    acre.require('dashboard').report_modules(m);
  }

  
  var QUnit = {
    module: module,
    test:   test,  
    get_modules: get_modules, //WILL
    report: report //WILL
  };
  [
    'ok',
    'equal', 'notEqual', 'deepEqual', 'notDeepEqual', 'strictEqual', 'notStrictEqual', // not used in discover mode
    'equals','same',                                                                   // Deprecated
    'expect' // TODO?
  ].forEach(function(name) {
    QUnit[name]=function() { console.warn('qunitdiscover: '+name+'() should not be called in discover mode'); };
  });

  extend(window, QUnit);
  window.QUnit = QUnit;

}
)(this);
