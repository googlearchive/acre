from acre_py_tests import *
from urllib2 import HTTPError
import simplejson
import re

class test_class(TestController):
    @tag(bug=False, oldbugs=["ACRE-189"], bugid="ACRE-1192")
    def test_environ(self):
        self.set_acre_script("environ");
        self.request_method = "GET";

        try:
            self.get()
            self.response_body = self.response.read();
            print ("got response: " + self.response_body);
            response_dict = simplejson.loads(self.response_body, encoding='utf-8')
            self.verify_environ(response_dict);

        except HTTPError, e:
            self.assert_(False, "Unexpected http error:\n%s\n%s" % (e.code, self.log))

        except:
            #self.assert_(False, "Caught unknown exception") 
            raise

    @tag(bug=False, bugid="ACRE-173")
    def test_environ_query_string(self):
        self.set_acre_script("environ_2",{ "foo":"bar" })
        expected_response= re.compile("get_query_string - OK");
        try:
            self.get()
            response = self.response.read();
            print "Got response %s" % response;
            self.assert_(expected_response.search(response), "Got unexpected response: %s " % response);
   
        except Exception, e:
            self.print_exception_msg(e); 


#
# Utility functions for this test class.
#
    def verify_environ(self, environ):
        exp_request_url = "http://%s" % self.server_name;
        if ( self.port != 80 ):
            exp_request_url = "%s:%s" % ( exp_request_url, self.port );

        exp_request_url = "%s/%s" % (exp_request_url, self.acre_script);
        exp_service_url = self.freebase_api_service.replace( "www.", "(www.)?");
        exp_service_url = exp_service_url.replace( ".", "\." );
        self.verify_field("server_host", self.server_host, environ['server_host']);
        self.verify_field("server_name", self.server_name, environ['server_name']);
        self.verify_field("server_protocol", "http", environ['server_protocol']);
        self.verify_field("request_method", self.request_method, environ['request_method']);
        self.verify_field("path_info", "/", environ['path_info']);
        self.verify_field("query_string", self.data, environ['query_string']);
        self.verify_field("script_id", "%s/%s" % ( self.script_namespace, self.acre_script), environ['script_id']);
        self.verify_field("script_name", self.acre_script, environ['script_name']);
        self.verify_field("script_namespace", self.script_namespace, environ['script_namespace']);

    def verify_field( self, field, expected, actual):
        if field == "freebase_service_url":
            self.assert_( re.compile( expected ).search(actual), "Unexpected value for freebase_service_url. Expected: %s Got: %s" % (expected, actual) );

        else:
            self.assert_( expected == actual, "Unexpected value for %s. Expected: %s Actual: %s " % (field, expected, actual) );

test_class.reviewed = True
