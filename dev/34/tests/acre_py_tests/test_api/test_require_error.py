from acre_py_tests import *
import re
import urllib2
import simplejson
from unittest import TestCase

class test_class(TestController):

    def test_require_no_url(self):
        self.set_acre_script("require");
        try: 
            self.get();
            response = self.response.read();
            print "Got response %s" % response;
            response = simplejson.loads(response);
            message = response['message'];
            print "Got message %s" % message;
            expected_message = "No URL provided"
            p = re.compile(expected_message);
            self.assert_( p.match(message), "urlfetch returned an unexpected message.  Expected:\n%s\nGot:\n%s\n" %(expected_message, message));
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);
  
    def test_require_freebase_service(self):
        self.set_acre_script("require", { "url":"/api/service/touch"})
        expected_message = "Could not fetch data from //service.api.dev/touch"
        p = re.compile(expected_message);

        try: 
            self.get();
            response = self.response.read();
            response = simplejson.loads(response);
            print "Got response %s" % response;
            message = response['message'];
            print "Got message %s" % message;
            self.assert_( p.match(message), "urlfetch returned an unexpected message.  Expected:\n%s\nGot:\n%s\n" %(expected_message, message));
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);
 
    def test_require_file_does_not_exist(self):
        self.set_acre_script("require_error", { "url": "/freebase/apps/qatests/api/does_not_exist"})
        expected_message = "Could not fetch data from //api.qatests.apps.freebase.dev/does_not_exist"
        p = re.compile(expected_message);

        try:
            self.get();
            response = simplejson.loads(self.response.read()); 
            message = response['message'];
            self.assert_( p.match(message), "urlfetch returned an unexpected message.  Expected:\n%s\nGot:\n%s\n" %(expected_message, message));
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);
 
    def test_require_not_freebase_url(self):
        self.set_acre_script("require_error", { "url":"%s/freebase/apps/qatests/api/whatever" %self.freebase_service })
        try: 
            self.get();
            response = self.response.read();
            print "Got response %s" % response;
            response = simplejson.loads(response);
            message = response['message'];
            print "Got message %s" % message;
            expected_message = "Could not fetch data from"
            p = re.compile(expected_message);
            self.assert_( p.match(message), "urlfetch returned an unexpected message.  Expected:\n%s\nGot:\n%s\n" %(expected_message, message));
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);
  
    @tag(bug=False, who="alexbl", bugid="!ACRE-220") 
    def test_require_url_is_not_content(self):
        self.description = "acre.require receives an argument that is a freebase uri. uri points to an id that exists, but is not of type content.";
        self.set_acre_script("require_error", { "url":"/type/type" })
        expected_message = "Could not fetch data from //type.dev/type"

        try:
            self.get();
            response = simplejson.loads(self.response.read());
            print "Got response %s" % response;
            message = response['message'];
            print "Got message %s" % message;
            self.assert_( re.compile(expected_message).search(message), "urlfetch returned an unexpected message.  Expected:\n%s\nGot:\n%s\n" %(expected_message, message));
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);
            
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);

    @tag(bug=False, bugid="!ACRE-700", who="alexbl")
    def test_auto_require_error(self):
        self.set_acre_script("autorequire");
        try: 
            self.data = self.encode_data( { "require_id":"/freebase/apps/qatests/api/autorequire" } );
            self.get();
            response = self.response.read();
            response = simplejson.loads(response);
            print "Got response %s" % response;
            message = response['message'];
            expected_message = "A script can not require itself"
            p = re.compile(expected_message);
            self.assert_( p.match(message), "urlfetch returned an unexpected message.  Expected:\n%s\nGot:\n%s\n" %(expected_message, message));
        except Exception, e:
            self.assert_(False, "test threw unexpected error. %s" % e);

test_class.reviewed = True
