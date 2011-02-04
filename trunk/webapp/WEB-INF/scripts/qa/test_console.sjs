/*global module test ok equals*/

// http://tests.test.dev.acre.z/test_console

acre.require('/test/lib').enable(this);

var ACRE_MAX_LOGS_SIZE = 25000; // from acre/library/src/com/google/acre/Configuration.java
var MAX_LOG_KB = Math.floor(ACRE_MAX_LOGS_SIZE/1024) - 1; // why do we need 1KB of overhead?
var TOO_BIG_KB = MAX_LOG_KB + 10; // add a lot just to make sure

function contains(haystack,needle) {
  return haystack.indexOf(needle) >= 0;
}

function urlfetch_log(firephp) {
  var headers = {'x-acre-enable-log':'debug'};
  if (firephp) {
    // Acre will treat this as User-Agent:FirePHP
    headers = {'x-acre-enable-log':'FirePHP'};
  }
  var response = acre.test.urlfetch('GET', headers );
  var logs;

  if (firephp) {
    var log_headers = response.headers;
    logs = [];
    for (var key in log_headers) {
      // only show the FirePHP WildFire headers
      if (key.indexOf('x-wf-1-1-')===0) {
        logs.push(log_headers[key]);
      }
    }
    return logs.join();
  }

  var r = JSON.parse(response.body);
  logs = r.logs;
  return logs;
}
function eat_logs_until_msg(logs,str) {
  var junk = true;
  while (junk) {
    if (!logs.length) {
      ok(false,'Ran out of log messages looking for '+str);
      return;
    }
    var log_entry = logs.shift();
    var args = log_entry[1];
    if (args[0]===str) { junk=false; }
  }
}
function check_log(logs,level,check_value_cb) {
  var log_entry = logs.shift();
  var meta = log_entry[0];
  var args = log_entry[1];
  ok( meta.Time > 1000,  'timestamp exists, and is a number');
  same(meta.Type,level,  'correct console level');
  check_value_cb(args);
}

test('check console',function() {
  var logs = urlfetch_log();

  check_log(logs, 'INFO', function(args) {
    same(args[0], 0, 'simple number');
  });

  check_log(logs, 'INFO', function(args) {
    same(args[0], 0, 'simple number');
    same(args[1], 1, 'simple number second arg');
  });

  check_log(logs, 'WARN', function(args) {
    same(args[0], "a string");
  });

  check_log(logs, 'ERROR', function(args) {
    same(args[0], {"~~ID~~":0} , 'empty JSON_JS obj str');
  });

  check_log(logs, 'LOG', function(args) {
    same(args[0], null , 'null');
  });

  check_log(logs, 'INFO', function(args) {
    same(args[0], '~~UNDEFINED~~' , 'undefined');
  });

  check_log(logs, 'INFO', function(args) {
    same(args[0], {"~~ID~~":0,"a":"this is a string"}, 'Make sure that strings values in objects are quoted');
  });

  check_log(logs, 'INFO', function(args) {
    same(args[0], '\'\n"', 'single quote, newline then quote');
  });

  check_log(logs, 'INFO', function(args) {
    same(args[0], {"~~ID~~":0,"a":"\'\n\""}, 'obj with single quote, newline then quote');
  });

  check_log(logs, 'INFO', function(args) {
    same(args[0], {"~~ID~~":0,"arr":["~~ID:1~~",11,22,33],"un":"~~UNDEFINED~~","nul":null,"zero":0,"str":"a string","obj":{"~~ID~~":2}}, 'object test');
  });


  check_log(logs, 'INFO', function(args) {
    same(args[0], {"~~ID~~":0, name:'hamster', furry:true}, 'Check that console logs objects in their current state');
  });
  check_log(logs, 'INFO', function(args) {
    same(args[0].furry, false, 'Check the console logs objects in their current state - part 2');
  });

  // TODO(SM): fix failing test
  //check_log(logs, 'INFO', function(args) {
  //  same(args[0].cookies, '~~TOO_DEEP~~', 'should only be one level deep');
  //});

  check_log(logs, 'INFO', function(args) {
    ok( args[0]['~~FUNC~~'].indexOf('return')===-1 , 'default is not to show function source');
  });

  // TODO(SM): fix failing test
  //check_log(logs, 'INFO', function(args) {
  //  ok( args[0]['~~FUNC~~'].indexOf('return')>=0 , 'show function source');
  //});

  // TODO: it's confusing having code-under-test and tests seperate. Need to figure out way to line up tests and test docs
  // TODO(SM): fix failing test
  // check_log(logs, 'INFO', function(args) {
  //   ok(args[0].JSON.parse['~~FUNC~~'], 'do not skip anything, JSON.parse should be dumped as a function');
  // });
  
  // ACRE-1596 - cannot log Sizzle'd dom
  // sizzle generates junk logs messages
  eat_logs_until_msg(logs,'document=');
  check_log(logs, 'INFO', function(args) {
    var str = JSON.stringify(args[0]);
    ok( contains(str,'innerHTML":"<DIV/>"'), 'Sensible results from logging a sizzled dom' );
  });

  same(logs.length,0,'Checked all log messages');
  
});

test('check console_big_string 20k',{
  file:'console_big_string',
  args: { kb:20,str:'acre' }
}, function() {

  var logs = urlfetch_log();

  check_log(logs, 'INFO', function(args) {
    var logged_str = args[0];
    same(logged_str.length, 20*1024, '20K string was logged');
  });

});

// we have control on header sizes only
if (acre.host.server == "acre_server" ) {

    test('ACRE_MAX_LOGS_SIZE should allow a string of length ' + MAX_LOG_KB + 'K to be logged in FirePHP mode',{
      file:'console_big_string',
      args: { kb:MAX_LOG_KB,str:'acre' }
    }, function() {

      var logs = urlfetch_log(true);
      ok( !contains(logs,'Logs Truncated'),  'The Logs Truncated warning should NOT appear' );
      ok(  logs.length > (MAX_LOG_KB*1024),  'The log should be at least '+MAX_LOG_KB+'K (including the FirePHP overhead)' );
      ok(  contains(logs,'acre1acre2'),      'This string should have been logged' );

    });


    test('ACRE_MAX_LOGS_SIZE should prevent a string of length ' + TOO_BIG_KB + 'K from being logged in FirePHP mode',{
      file:'console_big_string',
      args: { kb:TOO_BIG_KB,str:'acre' }
    }, function() {

      var logs = urlfetch_log(true);
      ok(  contains(logs,'Logs Truncated'),   'The Logs Truncated warning should appear' );
      ok(  logs.length < (TOO_BIG_KB*1024),   'The log should be shorter, since the large string should have triggered the truncation' );

    });
}

acre.test.report();
