from acre_py_tests import *
from urllib2 import HTTPError
import simplejson
import re

class test_class(TestController):

    def test_current_script(self):
        self.set_acre_script("current_script.sjs");
        self.request_method = "GET";

        try:
            self.get()
            self.response_body = self.response.read();
            print ("got response: " + self.response_body);
            result = simplejson.loads(self.response_body, encoding='utf-8')

            print "Verify acre.current_script.id"
            self.assert_( result['id'] == "%s/current_script.sjs" % self.script_namespace, "Did not get expected value for acre.current_script.id. Expected: %s Got: %s" % ("%s/current_script.sjs" % self.script_namespace, result['id'] ));
            print "Verify acre.current_script.app.id"
            self.assert_( result['app']['id'] == self.script_namespace, "Did not get expected value for  acre.current_script.app.id. Expected: %s Got: %s" % (self.script_namespace, result['app']['id'] ));

        except HTTPError, e:
            self.assert_(False, "Unexpected http error:\n%s\n%s" % (e.code, self.log))

        except Exception, e:
            self.assert_(False, "Caught unknown exception: %s" % e) 

test_class.reviewed = True
