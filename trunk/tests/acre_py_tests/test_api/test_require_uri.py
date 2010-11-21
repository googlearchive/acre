from acre_py_tests import *
import re
import urllib2
import simplejson
from unittest import TestCase
from urllib2 import HTTPError

class test_class(TestController):

    def test_require_freebase_id(self):
        data ={ "url": "/freebase/apps/qatests/api/mql_query_test" };
        self.set_acre_script("require", self.encode_data(data));
        expected_query =  { "id":"/user/acretestbot", "type":[] }; 
        expected_result = {"url":"/freebase/apps/qatests/api/mql_query_test","name":"mql_query_test","query":{"id":"/user/acretestbot","type":[]}}

        try: 
            self.get();
            result = simplejson.loads(self.response.read());

            # verify the retreived file's properties
            print "Verifying query "
            self.assert_(result['query'] == expected_query, "Got an unexpected query.  Got: %s\nExpected: %s" % ( result['query'], expected_query)); 
          
            self.assert_(result['name'] == "mql_query_test", "Got an unexpected name.  Got: %s Expected: %s " % ( result['name'], "mql_query_test") );             
            # verify the query result
            # print "Verifying query result is %s " % expected_result;
            # self.assert_(result['mqlread']['jsonp']['result'] == expected_result, "Got an unexpected result.  Got: %s. Expected %s" % (result['mqlread']['jsonp']['result'], expected_result) );

        except Exception, e:
            self.print_exception_msg(e);

test_class.reviewed = True
