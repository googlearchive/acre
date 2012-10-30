//WILL: Not working - one of Nick's old tests. TODO: integrate into new system
//
//  example test
//
//  target script: /test/targets/java_exception.sjs
//

// standard library for tests
var tlib = acre.require('/test/tlib');

var defaults = {
    works: true,
    targetapp: acre.make_dev_url('/test/targets'),
    targetfile: '/java_exception'
};

// build tests dynamically
// note that this violates the separation of tester and target
//  because we are using the test list of the tester host to
//  generate tests to be run against the target.  doing it right
//  would involve invoking the target to get a list of subtests.


var subtests = {
    RuntimeException: ['internal_error'],
    Error: ['internal_error'],
    NullPointerException: ['internal_error'],
    OutOfMemoryError: ['error_page', /Memory limit exceeded/],
    StackOverflowError: ['error_page', /Stack overflow/],
    ThreadDeath: ['error_page', /Execution time limit exceeded/],
    AcreScriptError: ['error_page', /faked script was taking too long/],
    java_infinite_loop: ['error_page', /Execution time limit exceeded/]
};


var top = this;
for (var subtest in subtests) {
    (function (subtest) {
      top['test_' + subtest] = {
        run: function () {
            // pass the subtest to the test script in the path_info
            var resp = tlib.urlfetch_safe(this.targetapp
                                            + this.targetfile + '/' + subtest);

            var ttype = subtests[subtest][0];

            switch (ttype) {
              case 'internal_error':
                tlib.assert((resp.status == 500
                             && (! /FAIL/.test(resp.body))
                             && /INTERNAL ERROR/.test(resp.body)),
                            'test failed: ' + resp.body);
                break;
              case 'error_page':
                var rx = subtests[subtest][1];
                tlib.assert((resp.status == 500
                             && (! /FAIL/.test(resp.body))
                             && rx.test(resp.body)),
                            'test failed: ' + resp.body);
                break;
              default:
                tlib.fail('unexpected test type: ' + ttype);
                break;
            }
        }
      }
    })(subtest);
}

tlib.runtests(this);

