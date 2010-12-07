from acre_py_tests import *
from urllib2 import HTTPError
import simplejson
import re

class test_class(TestController):
    @tag(bug=False, bugid="ACRE-882")
    def test_console(self):
        self.set_acre_script("acre_console", domain="api.qatests.apps.freebase");
        try:
            self.get()
            self.response_body = self.response.read();
            print ("got response: " + self.response_body);
            result = simplejson.loads(self.response_body, encoding='utf-8')

            del result['enabled'];

            print "result: %s" % result

            self.assert_ ("%s" % result == "{}", "console has unexpected visible properties: %s" % result );
         

        except HTTPError, e:
            self.assert_(False, "Unexpected http error:\n%s\n%s" % (e.code, self.log))
            raise;

test_class.reviewed = True
