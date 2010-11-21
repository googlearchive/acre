from acre_py_tests import *
import re
import urllib2
import simplejson
from unittest import TestCase
from urllib2 import HTTPError

class test_class(TestController):

    def test_require_script_simple(self):
        self.set_acre_script("require", { "url": "/freebase/apps/qatests/api/script_js", "eval_string" : "result.add([1,2,3,4,5])" })
        expected_eval_result = 15;

        try: 
            self.get();
            result = simplejson.loads(self.response.read());

            # verify result
            print "Verifying result. Value is: %s " % result;
            
            # Check eval_result
            value = result.get('eval_result')
            print "Verifying eval_result: %s" % value
            self.assert_(value == expected_eval_result, "Got an unexpected eval_result.  Expected: %s. Got: %s" % (expected_eval_result, value));

            # Check global variable that is defined in script,
            # XXX the test tests this by enumerating the this object, which doesn't work since
            # the prototype change
            #value = result.get('static_js_global_var')
            #print "Verifying global variable defined in script: %s" % value;
            #self.assert_(value == "PASS", "Got unexpected value for global variable: %s Expected: %s" % (value, "PASS"));

            # Check local variable that is defined in script
            value = result.get('static_js_local_var')
            print "Verifying local variable defined in script: %s" % value;
            self.assert_(value == "PASS", "Got unexpected value for local variable: %s Expected: %s" % (value, "PASS"));

        except Exception, e:
            self.print_exception_msg(e);


    @tag(bug=False, bugid="ACRE-237")
    def test_require_script_parse_err(self):
        self.set_acre_script("require_script", { "url":"/freebase/apps/qatests/api/js_parse_error" })

        expected_msg = "missing \; before statement"
        msg_pattern = re.compile(expected_msg);

        try: 
            self.get();
            result = simplejson.loads(self.response.read());
            print "Verifying expected error message in result: %s" % result;
            self.assert_( msg_pattern.search(result['message']), "Did not find expected message: %s in message: %s" % (expected_msg, result['message']));
        except Exception, e:
            self.print_exception_msg(e);

    @tag(bug=False,bugid="ACRE-95")
    def test_require_script_scope(self):
        self.set_acre_script("show_acre", {})
        expected_body = "require:[\s]+function"
        body_pattern = re.compile(expected_body);
 
        try:
            self.get(); 
            result = self.response.read();
            print "Verifying expected text in response: %s " % expected_body;
            self.assert_( body_pattern.search(result), "Did not find expected string %s in the message body: %s " % (expected_body, result));
        except Exception, e:
            self.print_exception_msg(e);

test_class.reviewed = True
