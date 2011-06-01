from acre_py_tests import *
import re
import urllib2
try:
    import simplejson
except ImportError:
    import json as simplejson

from unittest import TestCase
from urllib2 import HTTPError

class test_class(TestController):
    def __init__(self, script, testcase):
        self.setUp();
        self.set_acre_script(script)
        self.get_results(script, testcase);

    def get_results(self, script, testcase):
        # acre_scripts is a list of acre urls.  each url points to an acre
        # application which evaluates 1-many javascript tests, each of which
        # returns a dict
        # a list of objects with the following form:
        # description: a text description of the test
        # result: "PASS" or "FAIL"
        # message:  information about the expected / actual results
        # comment: a text description of the result (ie, error message)
        msg = ""
        if testcase.has_key("message"):
             msg = testcase['message'];
        if testcase.has_key("comment"):
            msg +=": " + testcase['comment'];

        self.assert_(testcase['result'] == "PASS", msg);
        
def JSLineTester(acre_script, tests, result_tester):
    def test_result(acre_script, testcase):
        #description = acre_script +"_"+ testcase['description']
        result_tester(acre_script, testcase)

    def get (acre_script, tests):
        from urllib2 import Request
        print "getting url: " + acre_script+ "?script=" +tests;
        data = { "script":tests}
        #print "%s" % data;
        request = Request(acre_script + "?script=" +tests);
        try:
            response = urllib2.urlopen(request)
            return response
        except:
            raise

    def run_test():
        request_method = "GET";
        print ("getting url: " + acre_script+"\n");
        try:
            response = get(acre_script, tests);
            response_body = response.read();
            _result = eval(response_body);
            results = _result['result'];

            print ( results );

            for tc in results:
                yield test_result, acre_script, tc;

        except HTTPError, e:
            print "Unexpected error\n%s" % (e.code);
            assert(False);
   
        except Exception, e:
            print ("Caught unknown exception: %s" % e) ;
            assert(False);
    return run_test;

#
# Url to acre script that loads test scripts
#
test_runner="http://acre.xtine.user.acre.sandbox.taco.metaweb.com/acre/acre_tests";

#
# Add tests here
#
#test_js = JSLineTester( test_runner, "acre_basic", TestAcreJSController);
#acre_load_1 = JSLineTester(test_runner, "load_name", TestAcreJSController);

test_class.reviewed = True
