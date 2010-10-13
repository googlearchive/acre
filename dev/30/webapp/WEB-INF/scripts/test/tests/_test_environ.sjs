//WILL: Not working - one of Nick's old tests. TODO: integrate into new system

//
//  example adaptation of test_environ.py.
//
//  this script demonstrates multiple tests in the same
//  script.  all exports starting with "test_" are 
//  considered tests by the test discovery code.
//
//  this is not complete - verify_environ() is a stub
//   because we don't have the equivalent of test.ini
//
//  target script: /freebase/apps/qatests/api/environ
//  

console.log('HACK: test_environ');

// standard library for tests
var tlib = acre.require('/test/tlib');

// this is a well-known name that sets defaults for each tester
var defaults = {
    targetapp: acre.make_dev_url('/freebase/apps/qatests/api'),
    targetpath: '/',
    works: true
};

// test the reported acre.environ against expected values
var test_environ = {
    bugid: 'ACRE-189',

    targetpath: '/environ',

    run: function () {
        var result = tlib.urlfetch_json(this.targetapp + this.targetpath);
        verify_environ(result);    
    }
};

// test that query_string works
var test_environ_query_string = {
    bugid: 'ACRE-173',

    targetpath: '/environ?foo=bar',

    run: function () {
        var result = tlib.urlfetch_json(this.targetapp + this.targetpath);
        
        tlib.assertprop(result, 'query_string', 'foo=bar');
    }
};

// test that path_info works
var test_environ_path_info = {
    targetpath: '/environ/some/path/info/here',

    run: function () {
        var result = tlib.urlfetch_json(this.targetapp + this.targetpath);
        tlib.assertprop(result, 'path_info', "/some/path/info/here");
    }
};

// test that query_string isn't set by POST
var test_environ_query_string_neg = {
    bugid: 'DEPRECATED',
    works: false,

    targetpath: '/environ',
    method: 'POST',
    data: 'foo',
    content_type: 'application/x-www-form-urlencoded',

    run: function () {
        var resp = tlib.urlfetch_json(this.targetapp + this.targetpath);
        tlib.assertprop(resp, 'query_string', '');
    }
};




//
// XXX doesn't work yet - 
// relies on a bunch of internal variables in the
// test framework
//
function verify_environ() {
    var environ = acre.environ;
    // XXX this isn't right - will always succeed
    var expenv = acre.environ;

    var exp_request_url = "http://%s" % expenv.server_name;
    if ( expenv.port != 80 ) {
        exp_request_url = exp_request_url + ':' + expenv.port;
    }
    exp_request_url = exp_request_url + '/' + expenv.acre_script;
 
    tlib.assertprop(environ, 'freebase_site_url', expenv.freebase_service);
//    tlib.assertprop(environ, 'freebase_service_url', expenv.freebase_api_service);

    tlib.assertprop(environ, 'request_url', exp_request_url);
    tlib.assertprop(environ, 'server_host', expenv.server_host);
    tlib.assertprop(environ, 'server_name', expenv.server_name);
    tlib.assertprop(environ, 'server_protocol', 'http');
    tlib.assertprop(environ, 'server_port', expenv.port);
    tlib.assertprop(environ, 'request_method', expenv.request_method);
    tlib.assertprop(environ, 'path_info', '/');
    tlib.assertprop(environ, 'query_string', expenv.data);
    tlib.assertprop(environ, 'script_id',
                    environ.script_namespace + '/' + expenv.acre_script); //WILL: should this be environ?
    tlib.assertprop(environ, 'script_name', expenv.acre_script);
    tlib.assertprop(environ, 'script_namespace', expenv.script_namespace);
}

tlib.runtests(this);