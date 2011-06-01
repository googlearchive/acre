from acre_py_tests import *
from urllib2 import HTTPError
try:
    import simplejson
except ImportError:
    import json as simplejson
import re

class test_class(TestController):

    def test_request(self):
        self.set_acre_script("request.sjs");
        self.request_method = "GET";

        try:
            self.get()
            self.response_body = self.response.read();
            print ("got response: " + self.response_body);
            response_dict = simplejson.loads(self.response_body, encoding='utf-8')
            self.verify_request(response_dict);

        except HTTPError, e:
            self.assert_(False, "Unexpected http error:\n%s\n%s" % (e.code, self.log))

        except:
            #self.assert_(False, "Caught unknown exception") 
            raise

    @tag(bug=False, bugid="ACRE-189")
    def test_request_2(self):
        self.set_acre_script("request_2.sjs", "foo=bar")
        self.get()
        self.check();

    @tag(bug=False, bugid="ACRE-173")
    def test_request_query_string(self):
        self.set_acre_script("request_2.sjs",{ "foo":"bar" })
        expected_response= re.compile("get_query_string - OK");
        try:
            self.get()
            response = self.response.read();
            print "Got response %s" % response;
            self.assert_(expected_response.search(response), "Got unexpected response: %s " % response);
        except Exception, e:
            self.print_exception_msg(e); 

    def test_request_body_params(self):
        self.method = "POST";
        data ={ "body_param_1": "foo", "body_param_2":"bar" };
        self.set_acre_script("request");
        self.data = self.encode_data( data );
        self.get();
        response_body = self.response.read();
        print "Got response body: %s" % response_body;
        response_obj = simplejson.loads(response_body);
        self.assert_( data == response_obj['body_params'], "Did not get expected acre.request.body_params.  Expected: %s Got: %s" % ( data, response_obj['body_params'] ) );

#
# Utility functions for this test class.
#

    def verify_request(self, request):
        exp_freebase_service = self.freebase_service.replace( "www.", "(www.)?");
        exp_freebase_service = exp_freebase_service.replace( ".", "\.");
        self.verify_field("server_name", self.server_name, request['server_name']);
        self.verify_field("protocol", "http", request['protocol']);
        self.verify_field("method", self.request_method, request['method']);
        self.verify_field("path_info", "/", request['path_info']);
        self.verify_field("base_path", "", request['base_path']);
        self.verify_field("query_string", self.data, request['query_string']);
        self.verify_field("script_id", "%s/%s" % (self.script_namespace, self.acre_script), request['script']['id']);
        self.verify_field("script_name", self.acre_script, request['script']['name']);

    def verify_field( self, field, expected, actual):
        if field == "freebase_service_url":
            self.assert_( re.compile(expected).search(actual), "Unexpected freebase_service_url. Expected pattern: %s Got: %s" % (expected, actual));
        else:
            self.assert_( expected == actual, "Unexpected value for %s. Expected: %s Actual: %s " % (field, expected, actual) );

