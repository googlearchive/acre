
//
// this is an example target app
//
// typically the target will be a user-visible app.
// custom target scripts like this one are more for platform testing
//
//

// this exposes the _dev entrypoints
// the actual acre._dev entrypoint is disabled in production so 
//  these tests cannot be run there.


var etype = acre.environ.path_info.substr(1);
if (etype == '')
   etype = 'Error';


var moretests = {
    js_infinite_loop: function() {
        while (1) {};
    }

    // TODO: 
    //   urlfetch_tarpit which tries a really long urlfetch - need a web service somewhere
}


function test() {
    try {
        try {
           if (etype in moretests) {
               moretests[etype]();
           } else {
               acre._dev.test_internal(etype);
           }
           acre.write('FAIL test did not throw\n');

        } catch (ee) {
            // XXX ACRE-960 user try...finally intercepts java.lang.RuntimeException (e.g. NPE)
            //  rhino MemberBox.invoke() converts RuntimeException into a js WrappedException
            //  there should be a rhino context option to disallow this.
            // this clause won't fire on java.lang.Error becaue only the known rhino
            //  exception classes are caught in generated code.
            acre._dev.syslog.warn('in catch: ' + ee, 'test.whatever');
            acre.write('FAIL try.. catch caught: ' + ee + '\n');
            acre.exit();
        } finally {
            // XXX ACRE-961 user try...finally intercepts java.lang.Error
            //  rhino should generate a check for java.lang.Error with every try...finally
            //  clause to make sure you can't intercept an internal error
            acre._dev.syslog.warn('in finally', 'test.whatever');
            // this fires on Error
            acre.write('FAIL try...finally interception\n');

            // try to cover the existing exception with a catchable one
            acre.exit();
        }
    } catch (e) {
        acre._dev.syslog.warn('ending catch: ' + e, 'test.whatever');
        acre.write('ending catch: ' + e + '\n');
    }
}

test();
acre.write('free and clear!\n');
