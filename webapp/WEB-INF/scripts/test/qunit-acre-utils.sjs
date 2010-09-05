
//HACK: de-dup make_dev_url() and get_app_path() 
function make_dev_url(app_path) {
    var protocol = acre.request.protocol;
    var port = acre.request.server_port;
    port = ((protocol == 'http' && port != 80) || (protocol == 'https' && port != 443)) ? ":" + port : '';
    return protocol + ":" + app_path + '.' + acre.host.name + port;
}
function get_app_path() {
  //TODO: what's the acre way to get the app_path?
  return '//' + (acre.request.server_name).replace('.'+acre.host.name,'');  
}



function add_utils(testfile) {
    var ok     = testfile.ok;
    var module = testfile.module;

    testfile.acre.test.urlfetch = function(/*...*/) {
        var testEnv = testfile.acre.test.current_testEnvironment;
        var baseurl = make_dev_url(testEnv.app_path || get_app_path());
        // MAGIC: use test.file or current filename (minus test_)
        var filename = testEnv.file || testfile.acre.current_script.name.replace('test_','');
        baseurl += '/' + filename;
        // MAGIC: use testEnv.args
        var url = acre.form.build_url(baseurl,testEnv.args);

        ok(url,'valid url'); // TODO

        var args = Array.prototype.slice.call(arguments);
        args.unshift(url);

        try {
            var res = acre.urlfetch.apply(this,args);
            ok(res.headers['x-metaweb-tid'], 'tid'); // every acre response should contain a tid
            return res;
        } catch (e) {
            return e.response;
        }
    };

    testfile.acre.test.engine = function (message, name) {
        module(message, {
                   'app_path':'//engines.tests.test.dev',
                   'file':name
               });
    };

    testfile.acre.test.exception = function (res, name, message) {
        ok(res.code == '/api/status/error', "returns error result");
        ok(res.messages[0].info.name == name, "Exception is of type: "+name);
        var reason = "Exception has message: "+message;

        if (message instanceof RegExp) {
            ok(message.test(res.messages[0].info.message), reason);
        } else {
            ok(message == res.messages[0].info.message, reason);
        }
    };

    testfile.acre.test.api_results = function(r) {
        ok(r.status=='200 OK', 'mqlread had 200 OK status');
        ok(r.code=='/api/status/ok', 'mqlread returned successfully');
        ok(r.result.result !== null, "mqlread returned results");
    };


}

