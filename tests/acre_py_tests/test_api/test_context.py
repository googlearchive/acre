from acre_py_tests import *
from urllib2 import HTTPError
import simplejson
import re

class test_class(TestController):
    def test_context(self):
        self.set_acre_script("context");
        self.request_method = "GET";

        try:
            self.get()
            self.response_body = self.response.read();
            print ("got response: " + self.response_body);
            result = simplejson.loads(self.response_body, encoding='utf-8')

            print "Verify acre.context.script_namespace"
            self.assert_( result['script_namespace'] == self.script_namespace, "Did not get expected value for script_namespace. Expected: %s Got: %s" % (self.script_namespace, result['script_namespace'] ));
            print "Verify acre.context.script_id"
            self.assert_( result['script_id'] == "%s/context" % self.script_namespace, "Did not get expected value for script_id. Expected: %s Got: %s" % ("%s/context" % self.script_namespace, result['script_id'] ));

        except HTTPError, e:
            self.assert_(False, "Unexpected http error:\n%s\n%s" % (e.code, self.log))

        except Exception, e:
            self.assert_(False, "Caught unknown exception: %s" % e) 

test_class.reviewed = True
