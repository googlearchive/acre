from acre_py_tests import *
import re
import simplejson
import urllib2
class test_class(TestController):

    def test_acre_response_status(self):
        from urllib2 import HTTPError
        from unittest import TestCase
        r = [200, 205, 210, 230, 245, 299]

        for code in r:
            self.set_acre_script("response", {'status':code})
            try:
                self.get()

                # the test does not throw an HTTPError, the HTTP status of the response was 200 or 206.  any other status code (including other non-200 2xx codes) will throw an urllib2.HTTPError.
                actual_code = code
                self.assert_( code < 300, "Status code was %s, but no HTTPError was thrown." % code );

            except HTTPError, e:
                #print "http error response code %s " % e.code
                actual_code = e.code

            self.assert_( code == actual_code, "code: %s actual code: %s" % (code, actual_code) )

    def test_acre_response_status_error(self):
        from urllib2 import HTTPError
        from unittest import TestCase

        r = range(300,310) + range(400,420) + range(500,510)
        for code in r:
            self.set_acre_script("response", {'status':code} )
            try:
                pass
            except HTTPError, e:
                #print "got http response code %s " % e.code
                self.assert_( e.code == code, "Expected code %s, got %s" % (code, e.code) )

test_class.reviewed = True
