from acre_py_tests import *
from urllib2 import HTTPError
import simplejson
import re

class test_class(TestController):
    # note acre.environ is deprecated
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

    @tag(bug=False, bugid="ACRE-189")
    def test_environ_1(self):
        self.set_acre_script("environ_2", "foo=bar")
        self.get()
        self.check();

    def test_environ_body_params(self):
        self.method = "POST";
        data ={ "body_param_1": "foo", "body_param_2":"bar" };
        self.set_acre_script("environ");
        self.data = self.encode_data( data );
        self.get();
        response_body = self.response.read();
        print "Got response body: %s" % response_body;
        response_obj = simplejson.loads(response_body);
        self.assert_( data == response_obj['body_params'], "Did not get expected acre.environ.body_params.  Expected: %s Got: %s" % ( data, response_obj['body_params'] ) );


#
# Utility functions for this test class.
#
    def verify_environ(self, environ):
        exp_freebase_service = self.freebase_service.replace( "www.", "(www.)?");
        exp_freebase_service = exp_freebase_service.replace( ".", "\.");
        self.verify_field("server_host", self.server_host, environ['server_host']);
        self.verify_field("server_name", self.server_name, environ['server_name']);
        self.verify_field("server_protocol", "http", environ['server_protocol']);
        self.verify_field("request_method", self.request_method, environ['request_method']);
        self.verify_field("path_info", "/", environ['path_info']);
        self.verify_field("query_string", self.data, environ['query_string']);
        self.verify_field("script_id", "%s/%s" % (self.script_namespace, self.acre_script), environ['script_id']);
        self.verify_field("script_name", self.acre_script, environ['script_name']);
        self.verify_field("script_namespace", self.script_namespace, environ['script_namespace']);

    def verify_field( self, field, expected, actual):
        if field == "freebase_service_url":
            self.assert_( re.compile(expected).search(actual), "Unexpected freebase_service_url. Expected pattern: %s Got: %s" % (expected, actual));

        else:
            self.assert_( expected == actual, "Unexpected value for %s. Expected: %s Actual: %s " % (field, expected, actual) );

