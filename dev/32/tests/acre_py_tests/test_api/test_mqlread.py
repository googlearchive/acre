from acre_py_tests import *
import re
import urllib2
import simplejson
from unittest import TestCase

class test_class(TestController):

    def test_simple_mql_read(self):
        self.set_acre_script("mqlread", { "q": {"id":"/user/acretestbot", "type":[] }})
        expected_response = {"type":["/type/user", "/type/namespace", "/freebase/user_profile"], "id":"/user/acretestbot"};
        try: 
            self.get();
            response = self.response.read();
            print response
            response_dict = simplejson.loads(response, encoding='utf-8')
            result = response_dict['result'];
            self.assert_( result == expected_response, "mqlread returned an unexpected response.  Expected:\n%s\nGot:\n%s\n" %(expected_response, response_dict));
        except Exception, e:
            self.print_exception_msg(e);
   
    def test_long_response(self):    
        self.set_acre_script("mqlread", { "q": [{ "id": None , "type":"/type/type", "*":[] }]})
        try: 
            self.get();
            response = self.response.read();
            print(response);
            response_dict = simplejson.loads(response, encoding='utf-8');
            result = response_dict['result']
            self.assert_( len(result)==100, "mqlread returned an unexpected number of results.  Expected 100, got %s" % len(result))
        except Exception, e:
            self.print_exception_msg;

    def test_nonunique_query(self):    
        self.set_acre_script("mqlread", { "q": [{ "id": None, "type":"/music/album", "name~=":"Greatest Hits", "name":None, "artist":None}] })

        try: 
            self.get();
            response = self.response.read();
            response_dict = simplejson.loads(response, encoding='utf-8');
            print(response);
            result = response_dict['result']
            self.assert_( len(result)==100, "mqlread returned an unexpected number of results.  Expected 100, got %s" % len(result))
        except Exception, e:
            self.print_exception_msg;

    def test_multiple_queries(self):    
        self.set_acre_script("mqlread", { "q": [{ "id": "/user/acretestbot", "type":[]},{"id":"/user/nix", "type":[]}] })
        try: 
            expected_code="/api/status/error";
            expected_msg ="Expected a dictionary or a list with one element in a read (were you trying to write?)"

            self.get();
            response = self.response.read();
            response_dict = simplejson.loads(response, encoding='utf-8');
            code = response_dict['jsonp']['result']['code']; 
            msg = response_dict['jsonp']['result']['messages'][0]['message']; 
            print "Got code:\n%s" % (code);
            self.assert_( code == expected_code, "Expected code %s, Got %s" % (expected_code, code))
            self.assert_( msg == expected_msg, "Expected message %s, Got %s" % (expected_msg, msg) );
        except Exception, e:
            self.print_exception_msg;

    # removed @tag(slow=True)
    #def test_query_timeout(self):    
         
    def test_mqlread_cursor_simple(self):
        query=  [{ "id" : None, "limit" : 5, "type" : "/type/type" }] ;
        self.set_acre_script("mqlread", { "q": query, "envelope": {"cursor":True}})

        expected_result =[{"type": "/type/type", "id": "/type/lang"}, {"type": "/type/type", "id": "/type/value"}, {"type": "/type/type", "id": "/type/int"}, {"type": "/type/type", "id": "/type/float"}, {"type": "/type/type", "id": "/type/boolean"}] ;
        try:
            self.get();
            response = simplejson.loads(self.response.read())
            print ("mqlread returned %s " % response['result']);

            # verify that we got 5 items and a cursor back
            result = response['result'];
            cursor = response['cursor'];
            cpattern = re.compile("[\w\-\_\=]+");

            print "Got cursor: %s " % cursor;
            self.assert_( len(result) == 5, "Expected 5 items in the result.  Got %s " % len(result) );
            self.assert_( cpattern.match(cursor), "Expected but did not find cursor in response envelope." );
            # self.assert_(result == expected_result, "Got an unexpected result. Expected %s. Got:\n%s" % (expected_result, result));

            # repeat query, but with cursor
            self.set_acre_script("mqlread", { "q": query, "envelope": {"cursor":cursor}})
            self.get();
            expected_result_next = [{"type":"/type/type", "id":"/type/rawstring"}, {"type":"/type/type", "id":"/type/uri"}, {"type":"/type/type", "id":"/type/datetime"}, {"type":"/type/type", "id":"/type/text"}, {"type":"/type/type", "id":"/type/key"}];

            response_next = simplejson.loads(self.response.read(), encoding='utf-8');
            print ("mqlread with cursor returned %s " % response_next['result']);
            # verify that we got 5 items and a cursor back
            result_next = response_next['result'];
            cursor_next = response_next['cursor'];

            self.assert_( len(result_next) == 5, "Expected 5 items in the result.  Got %s " % len(result) );
            self.assert_( cpattern.match(cursor_next), "Expected but did not find cursor in response envelope." );
            self.assert_(result_next == expected_result_next, "Got an unexpected result. Expected %s. Got:\n%s" % (expected_result, result));


        except urllib2.HTTPError, e:
            err_log = self.log
            err_msg = e.fp.read()
            self.assert_(False, "mqlread returned an unexpected error. Code: %s Message: %s\nLog:%s\n" % (e.code, err_msg, err_log))
 
    def test_cursor_query(self):
        self.set_acre_script("mqlread", { "q": [{ "id" : None, "limit" : 5, "type" : "/type/type" }] , "envelope": {"cursor":True }})

        try: 
            self.get();
            response = self.response.read();
            response_dict = simplejson.loads(response, encoding='utf-8')
            print ("mqlread returned %s " % response);
            # verify that we got 5 items and a cursor back
            result = response_dict['result'];
            cursor = response_dict['jsonp']['result']['cursor'];
            cpattern = re.compile("[\w\-\_\=]+");
            self.assert_( len(result) == 5, "Expected 5 items in the result.  Got %s " % len(result) );
            self.assert_( cpattern.match(cursor), "Expected but did not find cursor in response envelope." )
 
        except Exception, e:
            self.print_exception_msg;
           
    def test_as_of_time(self):
        self.set_acre_script("mqlread", { "q" : { "id" : None, "return" : "count", "type" : "/type/user" }, "envelope": {"as_of_time": "2008-01-01" }})
        expected_response = "15666";
        try: 
            self.get();
            response = self.response.read();
            response = simplejson.loads(response, encoding='utf-8');
            result = response['result'];
            print "Got result:\n%s" % result;
            self.assert_ ( expected_response == result, "Expected %s users as_of_time 2008-01-01; Query returned a result of %s" % (expected_response, result) );
 
        except Exception, e:
            self.print_exception_msg;

    def test_envelope_lang(self):
        self.set_acre_script("mqlread", { "q" : { "id" : "/topic/en/anarchism", "name" : None, "type" : "/common/topic" }, "envelope": {"lang":"/lang/de"} })
        expected_response = { "id" : "/topic/en/anarchism", "name" : "Anarchismus", "type" : "/common/topic" };
        try: 
            self.get();
            response = self.response.read();
            response_dict = simplejson.loads(response, encoding='utf-8')
            result = response_dict['result'];
            self.assert_( result == expected_response, "mqlread returned an unexpected response.  Expected:\n%s\nGot:\n%s\n" %(expected_response, result));
        except Exception, e:
            self.print_exception_msg;

    def test_mqlread_returns_error(self):
        self.set_acre_script("mqlread", { "q": { "id":None, "type":"/type/type", "property_does_not_exist":"foo" }})
        expected_response = "Type /type/type does not have property property_does_not_exist";
        p = re.compile(expected_response);
        try: 
            self.get();
            response = self.response.read();
            print "acre.freebase.mqlread returned %s" % response
            self.assert_( p.search(response), "mqlread returned an unexpected response.  Expected:\n%s\nGot:\n%s\n" %(expected_response, response));
        except Exception, e:
            self.print_exception_msg(e);

test_class.reviewed=True
