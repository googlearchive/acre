from acre_py_tests import *
import re
import urllib2
try:
    import simplejson
except ImportError:
    import json as simplejson
from unittest import TestCase

class test_class(TestController):

    def test_urlfetch_no_url(self):
        self.set_acre_script("urlfetch_no_url");
        try: 
            self.get();
            response = self.response.read();
            print "Got response %s" % response;
            response = simplejson.loads(response);
            message = response['message'];
            print "Got message %r" % message
            expected_message = "'url' argument \(1st\) to acre\.urlfetch\(\) must be a string";
            p = re.compile(expected_message)
            self.assert_( p.match(message), "urlfetch returned an unexpected message.  Expected:\n%s\nGot:\n%s\n" %(expected_message, message));
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);
  
    def test_urlfetch_returns_dict(self):
        self.set_acre_script("urlfetch", { "url":self.freebase_service+"/api/service/touch"})
        tid_pattern = "^([\w\;\.\:]*)\;\d{4,5}-\d\d-\d\d(?:T\d\d(?:\:\d\d(?:\:\d\d(?:Z)(?:\;\d{1,4})?)?)?)?$"
        tid_re = re.compile( "%s" % tid_pattern );
        expected_response = "ok"
        expected_response = expected_response.replace(".", "\.");

        try: 
            self.get();
            response_body = self.response.read();
            self.assert_(re.compile(expected_response).search(response_body), "urlfetch returned an unexpected response. Expected:\n%s\nGot:\n%s\n" % (expected_response, response_body) );
        except Exception, e:
            self.assert_(False, "test threw unexpected error. response was %s. error: %s" % (response_body, e));
 
    @tag(bug=False, bugid="ME-1069") 
    def test_urlfetch_account_logout(self):
        self.set_acre_script("urlfetch",  { "url": self.freebase_service+"/api/account/logout"})
        expected_response =  "Logout succeeded";

        expected_response = expected_response.replace(".", "\.");

        pattern = re.compile( "%s" % expected_response, re.M );
        try:
            self.get();
            response = self.response.read();
            self.assert_(pattern.search(response), "urlfetch returned an unexpected response. Expected:\n%s\nGot:\n%s\n" % (expected_response, response) );
            #self.assert_(response_dict == expected_response, "urlfetch returned an unexpected response. Expected:\n%s\nGot:\n%s\n" % (expected_response, response_dict) );
        except Exception, e:
            self.assert_(False, "test threw unexpected error. error is: %s response was %s"% (e, response));
 
    def test_urlfetch_options(self):
        response = self.request_url(
             url = "http://api.qatests.apps.freebase.%s" % self.server_host,
             port = self.port,
             path = "urlfetch_options" 
        )

        print "Got response: %s" % response

test_class.reviewed = True
