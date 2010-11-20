# -*- coding: utf-8 -*-
from acre_py_tests import *
import re
import simplejson
from urllib2 import HTTPError

class test_class(TestController):

    def test_touch(self):
        from urllib2 import Request, urlopen
        self.url = "http://%s:%s/acre/touch" % (self.server_name, self.port)
        print "Getting url: %s " % self.url;
        tid_pattern = "^([\w\;\.\:]*)\;\d{4,5}-\d\d-\d\d(?:T\d\d(?:\:\d\d(?:\:\d\d(?:Z)(?:\;\d{1,4})?)?)?)?$";

        expected_msg = {
            "status":"200 OK",
            "code":"/api/status/ok",
            "transaction_id": tid_pattern
        } 

        try:
            result =  urlopen( Request(self.url) );
            body = result.read();
            print "Got response: %s" % body;
            response = simplejson.loads(body);
            for p in expected_msg:
                self.assert_(re.compile(expected_msg[p]).search(response[p]), "Did not find %s in response %s: %s" % (expected_msg[p], p, response[p]))
      

        except HTTPError, e:
            body = e.fp.read();
            code = e.code;
            msg = e.msg;
            hdrs = e.hdrs;
            print "Got an HTTPError: \ncode: %s\nmsg: %s\nheaders: %s\nresponse %s" % (code, msg, hdrs, body);
            self.assert_( False, "Got an HTTPError: \ncode: %s\nmsg: %s\nheaders: %s\nresponse %s" % (code, msg, hdrs, body));
        
 
        except Exception, e:
            self.assert_(False, "Got unexpected error: %s" % e);

test_class.reviewed = True
