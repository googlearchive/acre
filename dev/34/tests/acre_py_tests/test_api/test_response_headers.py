from acre_py_tests import *
import re
class test_class(TestController):

    def test_acre_response_headers_basic(self):
        headers = {
            "foo":"bar",
        };
        self.run_acre_response_headers("200", headers, headers);

    @tag(bug=False, bugid="ACRE-218")
    def test_acre_response_headers_override_x_metaweb_tid(self):
        from urllib2 import HTTPError

        status="200";
        headers = {
            "X-Metaweb-TID":"an invalid value",
        };
        self.set_acre_script("response_headers", { "status":status, "headers":headers})
        try:
            self.get()
            actual_code = "200"
            headers = self.get_response_headers();
            self.assert_( not re.compile( "an invalid value").search(self.response_headers['X-Metaweb-TID']), "acre.start_response should not override X-Metaweb-TID, but it did: %s" % self.response_headers['X-Metaweb-TID'] );
  
        except HTTPError, e:
            print "http error response code %s " % e.code
            actual_code = e.code

            self.assert_( status == actual_code, "code: %s actual code: %s" % (status, actual_code) )


    def test_acre_response_headers_set_headers(self):
        status="200";
        headers = {
            "foo":"bar",
            "Server":"my acre server",
            "From":"metaweb@freebase.com",
            "Max-Forwards":"0",
            "Set-Cookie":"hello=from_acre",
            "Set-Cookie":"mwLastWriteTime=999"
        };
        expected_headers = {
            "foo":"bar",
            #"Server":"my acre server",
            "from":"metaweb@freebase.com",
            "max-forwards":"0",
            "set-cookie":"mwLastWriteTime=999"
        };
        self.run_acre_response_headers(status, headers, expected_headers);

    #
    # Utility functions for this test class
    #

    def run_acre_response_headers(self, status, headers, expected_headers):
        from urllib2 import HTTPError 
        from unittest import TestCase

        self.set_acre_script("response_headers", { "status":status, "headers":headers})
        try:
            self.get()
            actual_code = "200"
            self.check_response();
         
        except HTTPError, e:
            print "http error response code %s " % e.code
            actual_code = e.code

            self.assert_( status == actual_code, "code: %s actual code: %s" % (status, actual_code) )

        print self.response.info()
        self.parse_headers()

        for h in expected_headers:
            self.verify_header( h, expected_headers[h])
    
    def check_response( self ):
        import re
        r = self.response.read()
        print("response body:" + r)
        self.assert_(re.compile('ok', re.M).search(r), "Did not find OK in acre response.")

    def get_header( self, header ):
        self.assert_( self.response_headers[header.lower()], "Failed getting a value for header " + header )
        return self.response_headers[header]

    def verify_header(self, header, expected_value):
        actual_value = self.get_header(header);
        print "Checking header %s. Expect: %s. Got: %s" % ( header, expected_value, actual_value );
        self.assert_( re.match(expected_value,actual_value), "header: %s expected value: %s actual value: %s" % (header, expected_value, actual_value));

    def parse_headers(self):
        import re
        self.response_headers = {}
        p = re.compile("[\r\n]+")
        headers = p.split("%s" % self.response.info())
        for h in headers:
            sep = re.compile(':[\s]+')
            # print "header line: " + h
            h = sep.split(h)
            if len(h) > 1:
                field = h.pop(0)
                value = h.pop()
                value = (value.rstrip()).lstrip()
                self.response_headers[field.lower()] = value
                # print "field: " + field + " value: " + value

test_class.reviewed = True
