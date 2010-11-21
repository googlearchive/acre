from acre_py_tests import *
import re
import simplejson
from nose.tools import with_setup

class test_class(TestController):

    def test_json_parse_simple(self):
        data = { "object":"acre" }
        self.set_acre_script("json_parse", { "string": data})
        self.get();
        response = simplejson.loads(self.response.read());
        print (response);
        self.assert_( response == { "parse": data }, "Got unexpected result: %s " % response );

    def test_json_parse_array(self):
        data = [{ "object":"acre" }, {"object2":"mjt"}]
        self.set_acre_script("json_parse", { "string": data})
        self.get();
        response = simplejson.loads(self.response.read());
        print (response);
        self.assert_( response == { "parse": data }, "Got unexpected result: %s " % response );
            
    def test_json_parse_nested(self):
        data = [{ "object":"acre" }, {"object2":{ "name":"foo", "value":True, "integer":4}, "object3": "ok"}]
        self.set_acre_script("json_parse", { "string": data})
        self.get();
        response = simplejson.loads(self.response.read());
        print (response);
        self.assert_( response == { "parse": data }, "Got unexpected result: %s " % response );
          
    @tag(bug=False, bugid="ACRE-1167") 
    def test_json_parse_error(self):
        data = "hello there"
        self.set_acre_script("json_parse", { "string": data })

        try:
            self.get();
            response = self.response.read();
            print "Data:\n%s" % data;
            print ("JSON.parse returned:\n%s" % response);
            res = simplejson.loads(response)
                
            self.assert_(res.has_key("message"), "No error message thrown.  Response: %s" % res );
            
        except Exception, e:
            self.assert_(False, "Caught an unexpected exception %s " % e);        

    def test_json_checker_pass_cases(self):
        def test_pass(tc):
            idata = self.get_data('json', tc)
            self.set_acre_script("json_parse", {'string': idata } )
            self.get()
            response = simplejson.loads(self.response.read())
            expected = { "parse": simplejson.loads(idata) }
            self.assert_( response == expected, "Got unexpected result: %r \n instead of %r " % (response,  expected))

        # XXX this shouldn't be necessary...
        self.setUp()
        passes = self.get_dataset('json', 'pass')
        for a in  passes:
            yield test_pass, a

    @tag(bug=False, bugid="ACRE-1254")
    def test_json_checker_known_pass_failures(self):
        def test_fail(tc):
            data = self.get_data('json', tc)

            self.set_acre_script("json_parse", {'string': data } )

            try:
                self.get()
                response = self.response.read()
                print "tc:\n%s" % tc;
                print "Data:\n%s" % data;
                print ("JSON.parse returned:\n%s" % response);
                res = simplejson.loads(response)
                
                self.assert_( res.has_key("parse"), "Did not find a parsed JSON object in response. Got error: %s" % res );

            except Exception, e:
                self.assert_(False, "Caught an unexpected exception %s" % e)
    
        # XXX this shouldn't be necessary...
        self.setUp()
        fails = self.get_dataset('json', 'known_failures_pass_')
        for a in fails:
	    if not (a == "known_failures_pass_1.json"):
                yield (test_fail, a)

    @tag(bug=False, oldbugs=["ACRE-1167"], bugid="ACRE-1254")
    def test_json_checker_fail_cases(self):
        def test_fail(tc):
            data = self.get_data('json', tc)
            self.set_acre_script("json_parse", {'string': data } )

            try:
                self.get()
                response = self.response.read()
                print "tc:\n%s" % tc;
                print "Data:\n%s" % data;
                print ("JSON.parse returned:\n%s" % response);
                res = simplejson.loads(response)
                
                self.assert_(res.has_key("message"), "No error message thrown.  Response: %s" % res );

            except Exception, e:
                self.assert_(False, "Caught an unexpected exception %s" % e)

        # XXX this shouldn't be necessary...
        self.setUp()
        fails = self.get_dataset('json', 'fail')
        for a in fails:
	    if not (a == "fail29.json" or a == "fail30.json" or a == "fail31.json"):
                yield test_fail, a

    @tag(bug=False, bugid="ACRE-397")
    def test_json_check_log_for_err_msg(self):
        from urllib2 import HTTPError
        data = "hello there"
        self.set_acre_script("json_parse", {'string': data } )
        log_err= "A JSON payload must begin with an object or array"
        p = re.compile( log_err);
        log_pattern = re.compile(log_err);

        try:
            self.get();
            response = self.response.read();
            message = simplejson.loads(response)['message'];

            # verify that error message is returned in the response body
            self.assert_(p.search(message), "Did not find error message in result: %s " % message);

            # verify that the error appears in the log
            self.verify_log_message(log_pattern,'ERROR')
            
        except Exception, e:
            self.assert_(False, "Caught an unexpected exception %s " % e); 

test_class.reviewed = True
