from acre_py_tests import *
import re
import urllib2
try:
    import simplejson
except ImportError:
    import json as simplejson
from unittest import TestCase

class test_class(TestController):

    @tag(bug=False, oldbugs=["ACRE-823", "ACRE-210"])
    def test_urlfetch_invalid_protocol(self):
        freebase_server = re.compile("http://").sub("", self.freebase_service)
        self.set_acre_script("urlfetch", {
            "method":"GET",
            "url":"telnet://%s" % freebase_server
        })
        try: 
            self.get();
            response = self.response.read();
            print "Got response: %s" % response;

            result = simplejson.loads(response);
            message = result['message']
            # verify message
            exp_msg ="Malformed URL: telnet://%s" % freebase_server
            self.assert_(message == exp_msg, "Got unexpected error message. Expected: %s Got: %s" % (exp_msg, message));

        except urllib2.HTTPError, e:
            print (e.fp.read());
            self.assert_(False, "Got unexpected exception %s" % e );
            
        except Exception, e:
            self.assert_(False, "Got unexpected exception %s" % e );


    #@tag(bug=True, oldbugs=["ACRE-210"], bugid="ACRE-1348")
    #def test_urlfetch_host_does_not_exist(self):

    @tag(bug=False, bugid="ACRE-210")
    def test_urlfetch_invalid_method(self):
        freebase_server = re.compile("http://").sub("", self.freebase_service)
        self.set_acre_script("urlfetch", {
            "method":"foo",
            "url":"http://%s" % freebase_server
        })
        try: 
            self.get();
            response = self.response.read();
            print "Got response: %s" % response;
            result = simplejson.loads(response);
            message = result['message']
        
            self.assert_(message == "Failed: unsupported (so far) method foo", "Got unexpected %s " % message );

        except urllib2.HTTPError, e:
            print (e.fp.read());
            self.assert_(False, "Got unexpected exception %s" % e );
            
        except Exception, e:
            self.assert_(False, "Got unexpected exception %s" % e );

    @tag(bug=False, bugid="ACRE-1036")
    def test_urlfetch_file_does_not_exist(self):
        self.set_acre_script("file_does_not_exist");
        try: 
            self.get();
            response = self.response.read();
            print "Got response: %s" % response;
            self.assert_( False, "Expected a 404 response. Got: a 2xx response: %s" % response ) ;
        
        except urllib2.HTTPError, e:
            response = e.fp.read();
            print "Got %s: %s" % (e.code, response);
            self.assert_( e.code == 404, "Got an unexpected HTTPError. Expected a 404, got %s. Message: %s" % (e.code, response) );

test_class.reviewed = True
