from acre_py_tests import *
import re
import urllib2
import simplejson
from unittest import TestCase
from urllib2 import HTTPError

class test_class(TestController):
   
    def test_require_query_not_unique(self):
        data ={ "url": "/freebase/apps/qatests/api/mqlread_not_unique" } 
        self.set_acre_script("require_query.sjs", data);
        expected_result =[{"type":"/music/artist", "id":"/en/blonde_redhead"}, {"type":"/music/artist", "id":"/en/bruce_cockburn"}, {"type":"/music/artist", "id":"/en/buck_owens"}]  ;

        try: 
            self.get();
            result = simplejson.loads(self.response.read());
            print "Query: %s" % result['query'];

            # verify the retreived file's properties: query
            print "Got query: %s" % result['query']['query'];
            self.assert_(result['query']['query'] == [{ "id":None, "type":"/music/artist", "limit":3 }], "Got an unexpected query.  Got: %s " % result['query']['query']); 
         
            # verify the retreived file's properties: name
            print "Got name: %s" % result['query']['name'];
            self.assert_(result['query']['name'] == "mqlread_not_unique.mql", "Got an unexpected name.  Got: %s Expected: %s " % ( result['query']['name'], "mqlread_not_unique.mql") );             
            
            # verify the query result
            print "Verifying result: %s" % (result['mqlread']['result'])
            self.assert_(result['mqlread']['result'] == expected_result, "Got an unexpected result.  Got: %s. Expected %s" % (result['mqlread']['result'], expected_result) );

        except Exception, e:
            self.print_exception_msg(e);

test_class.reviewed = True
