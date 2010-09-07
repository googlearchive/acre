//TODO: how to make this Acre-independant, so I can add to QUnit repository??

//var debug = function() {console.log.apply(this,arguments); };
var debug = function() {};

//WILL: should this really be file global?
var currentModule;

var currentFile = {
  file:acre.request.script.name,
  run_url: acre.make_dev_url(acre.request.script.app.id) + '/' + acre.request.script.name,
  modules:[],
  total:null,
  failures:null
};

function _pushModule(name) {
  currentModule = { name:name, tests:[] };
  currentFile.modules.push(currentModule);
  return currentModule;
}

// create an inital dummy module, in case the first test isn't in a module
// we will throw this away if it's empty
var defaultModule = _pushModule('DEFAULT');

function extend(a, b) {
  for ( var prop in b ) {
    a[prop] = b[prop];
  }
  return a;
}

function currentTest() {
  var tests = currentModule.tests;
  return tests[tests.length-1];
}

function done(failures, total) {
  debug('done: failures='+failures+' total='+total);
  currentFile.failures = failures;
  currentFile.total    = total;
}

function log(result, message) {
  debug('log: ['+result+'] '+message);
  currentTest().log.push({result:result,message:message||'no comment'});
}

function testStart(name,testEnvironment) {
  debug('--testStart:'+name);
  // runtime is initally starttime
  currentModule.tests.push({name:name, runtime:+new Date(), testEnvironment:testEnvironment||null, log:[]});
}

function testDone(name, failures, total) {
  debug('--testDone:'+name+' failures='+failures+' total='+total);
  extend(currentTest(), {
    runtime:+new Date() - currentTest().runtime, // convert start time to runtime
    failures:failures,
    total:total
  });
}

function moduleStart(name) {
  debug('**moduleStart: '+name);
  _pushModule(name);
}

function moduleDone(name, failures, total) {
  debug('**moduleDone:  '+name+' failures='+failures+' total='+total);
  extend(currentModule, {
    failures:failures,
    total:total
  });
}

function _checkDefaultModule() {
  if (currentFile.modules.length>1 && defaultModule.tests.length===0) {
    // the user called module() before test(), so we can remove the defaultModule
    currentFile.modules.shift();
  } else {
    // count the results of the tests and store them in the default module
    defaultModule.failures=0;
    defaultModule.total=0;
    for (var i=0;i<defaultModule.tests.length;i++) {
      defaultModule.failures += defaultModule.tests[i].failures;
      defaultModule.total    += defaultModule.tests[i].total;
    }
  }
}

// duplicated in dashboard.sjs
function get_app_path() {
  //TODO: what's the acre way to get the app_path?
  return '//' + (acre.request.server_name).replace('.'+acre.host.name,'');
}

function report() {
  _checkDefaultModule(); // do we need to update the defaultModule?

  //only output if test was run directly (not required or run by /acre/test)
  if (!acre.request.params.test_self) { return; }

  var dashboard = acre.require('dashboard');
  var testsuite = {
    app_path:get_app_path(),
    tid:acre.request.headers['x-metaweb-tid'] || null, // missing on local acre server
    testprops:[], //HACK remove this
    testfiles:[currentFile],
    total:currentFile.total,
    failures:currentFile.failures
  };
  // console.error('HACK: report testsuite',testsuite );
  dashboard.show_suite(testsuite);
}

function add_log_hooks(testfile) {
  extend(testfile.acre.test,{
    done        : done,
    log         : log,
    testStart   : testStart,
    testDone    : testDone,
    moduleStart : moduleStart,
    moduleDone  : moduleDone,
    report      : report      //WILL: new api?
  });
}

