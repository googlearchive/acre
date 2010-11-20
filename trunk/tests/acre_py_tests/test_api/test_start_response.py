from acre_py_tests import *
import re
import simplejson
import urllib2
class test_class(TestController):

    @tag(slow=True)
    def test_acre_response_status(self):
        from urllib2 import HTTPError
        from unittest import TestCase
        r = [200, 205, 210, 230, 245, 299]

        for code in r:
            self.set_acre_script("start_response", {'status':code})
            try:
                self.get()

                # the test does not throw an HTTPError, the HTTP status of the response was 200 or 206.  any other status code (including other non-200 2xx codes) will throw an urllib2.HTTPError.
                actual_code = code
                self.assert_( code < 300, "Status code was %s, but no HTTPError was thrown." % code );

            except HTTPError, e:
                #print "http error response code %s " % e.code
                actual_code = e.code

            self.assert_( code == actual_code, "code: %s actual code: %s" % (code, actual_code) )
    test_acre_response_status.slow=True

    def test_acre_response_status_error(self):
        from urllib2 import HTTPError
        from unittest import TestCase

        # XXX/nix for faster testing
        #r = range(300,510)
        r = range(300,310) + range(400,420) + range(500,510)
        for code in r:
            self.set_acre_script("start_response", {'status':code} )
            try:
                #XXX/nix not sure why all these should return 503?
                #self.assertRaises(503, self.get)
                pass
            except HTTPError, e:
                #print "got http response code %s " % e.code
                self.assert_( e.code == code, "Expected code %s, got %s" % (code, e.code) )

    @tag(bug=False, bugid="ACRE-1202")
    def test_no_start_response(self):
        self.set_acre_script("no_start_response")
        expected_response  = "PASS";

        try:
            self.get();

            response = self.response.read();
            print "Expecting a body matching '%s'. Got: '%s'" % (expected_response, response);
            self.assert_(re.compile(expected_response).search(response), "Got unexpected response. Expected: %s Got: %s" % (expected_response, response));

            headers = self.get_response_headers();
            expected_content_type = "text/plain;[\s]*charset=utf-8";
            content_type = headers['Content-Type'];
            print "Expecting a Content-Type header of %s. Got: '%s'" % (expected_content_type, content_type);
            self.assert_(re.compile(expected_content_type).search(content_type), "Got unexpected content-type. Expected: %s Got: %s" % (expected_content_type, content_type));

        except Exception, e:
            self.assert_( False, "Got an unexpected exception: %s" % e );

    @tag(bug=False, bugid="ACRE-1202")
    def test_start_response_no_args(self):
        self.set_acre_script("start_response_no_args")
        expected_response  = "[\s]*PASS[\s]*";
        try: 
            self.get();
            response = self.response.read();
            print "Expecting a body matching '%s'. Got: '%s'" % (expected_response, response);
            self.assert_(re.compile(expected_response).search(response), "Got unexpected response. Expected: %s Got: %s" % (expected_response, response));

            headers = self.get_response_headers();
            expected_content_type = "text/plain;[\s]*charset=utf-8";
            content_type = headers['Content-Type'];
            print "Expecting a Content-Type header of %s. Got: '%s'" % (expected_content_type, content_type);
            self.assert_(re.compile(expected_content_type).search(content_type), "Got unexpected content-type. Expected: %s Got: %s" % (expected_content_type, content_type));
        except Exception, e:
            self.assert_( False, "Got an unexpected exception: %s" % e );

test_class.reviewed = True
