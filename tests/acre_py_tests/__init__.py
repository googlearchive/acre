"""
When the test runner finds and executes tests within this directory,
this file will be loaded to setup the test environment. Tests
are run using python nose (usually invoked with ./acre test)

configuration comes in through os.environ, see config below

"""
import os
import sys
import urllib2
import httplib
import cookielib
import re
from unittest import TestCase
import simplejson
import urllib
from urllib2 import Request
import string
import types
import socket
# global socket timeout, seemed to help with a weird connection reset issue in appengine
socket.setdefaulttimeout(60)


__all__ = ['TestController', 'tag']

here_dir = os.path.dirname(os.path.abspath(__file__))
conf_file = here_dir + '/test.ini'

import simplejson
from nose.tools import *

def setup_context():
    """ 
    Test modules/packages can import this function and call it to
    ensure their tests have a valid context.
    
    """

def setup_package():
    setup_context()

def teardown_package():
    pass

class AcreRedirectHandler(urllib2.HTTPRedirectHandler):
    """
    A subclass of the default HTTPRedirectHandler which handles 301 and 302 status codes. 
    """
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        result = urllib2.HTTPRedirectHandler()
        print "Redirect handler caught error.\ncode: %s\nmsg: %s\nheaders: %s\nnewurl: %s\n" % (code, msg, headers, newurl);
        print "Now throwing catchable HTTPError";
        raise urllib2.HTTPError(newurl, code, msg, headers, fp)

class ExtraAsserts(object):
    
    def assertIn(self, array, value, msg=None):
        self.assert_(value in array, msg or "value %s not in %r" % (value, array))

    def assertNotIn(self, array, value, msg=None):
        self.assert_(not value in array, msg or "value %s is in %r" % (value, array))

    def assert_(self, cond, msg=None):
        return assert_true(cond, msg)

def tag(**kwds):
   """ decorator that sets attributes on a function

   usage:
       @tag(key1=v1, key2='something else')
       def fn(...):
           ....
   """
   def inner(f):
       for k,v in kwds.iteritems():
           setattr(f, k, v)
       return f
   return inner

class TestController(ExtraAsserts):

    def setUp(self, *args, **kwargs):
        self.cookiefile = "./cookies.lwp",
        self.cookiejar = cookielib.LWPCookieJar("./cookies.lwp")

        # Install cookie and redirect handlers.
        self.opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self.cookiejar))
        urllib2.install_opener(self.opener)

        # set test url
        self.data = None;
        self.method = "GET";
        self.headers = None

        config = os.environ
        self.server_base = config.get("ACRE_HOST_BASE")
        self.server_host = "dev." + self.server_base
        self.server_name = "api.qatests.apps.freebase." + self.server_host
        self.script_namespace = "/freebase/apps/qatests/api"

        self.port = int(config.get("ACRE_PORT"))
        self.server_url = 'http://' + self.server_name
        if self.port != 80:
            self.server_url += ':%d' % self.port

        self.host = self.server_url;
        self.username = config.get("TEST_USERNAME")
        self.password = config.get("TEST_PASSWORD")

        base_addr = config.get("ACRE_METAWEB_BASE_ADDR")
        port_str = config.get("ACRE_FREEBASE_SITE_ADDR_PORT")
        if port_str:
            port_str = ":" + port_str
        else:
            port_str = ":80"
        if base_addr:
            self.freebase_api_service = "http://api." + base_addr + port_str
            self.freebase_service = "http://api." + base_addr
            self.appeditor_host = "http://www." + base_addr + port_str
        else:
            print "tests are going nowhere with the env var: ACRE_METAWEB_BASE_ADDR"
            sys.exit(1)

        self.appeditor_service_url = None
        if self.appeditor_host:
            self.appeditor_service_url = self.appeditor_host + "/appeditor/services"

        self.auth_host = self.freebase_service
        self.data_path = "data"
        self.data_path = here_dir + '/' + self.data_path

    def set_acre_script(self, acre_script, data="", headers=None, domain=None):
        self.acre_script = acre_script
        if domain is not None:
            self.server_name = domain+"."+  self.server_host
        self.server_url = 'http://'+self.server_name;

        if self.port != 80 and not re.compile( ":%s$" % self.port ).search(self.server_url):
            self.server_url += ':%s' % self.port

        self.acre_url = self.server_url+"/"+ acre_script

        if (isinstance(data, basestring)):
            self.data = data
        else:
            self.data = self.encode_data(data)
   
    def get_url(self, url, data=None):
        """GET a non-Acre url"""
        from urllib2 import Request

        if data is not None:
            request = Request( url +"?" + data);
        else:
            request = Request( url )
        self.cookiejar.add_cookie_header(request)
        try:
            response = urllib2.urlopen(request)
            cookies = self.cookiejar.make_cookies(response, request) 
            #for c in cookies:
            #    print "Got cookie: %s" % c;

            return response
        except:
            raise

    def get(self,headers={}):
        """Http GET the test acre url, by default set the x-acre-enable-log header and store the logs in the response headers"""
        from urllib2 import Request
        self.log = None
        if self.method == "GET":
            if ('%s' % self.data).rstrip().lstrip(): 
                print "self.data is %s\n" % self.data;
                print "getting url: " + self.acre_url + "?" + self.data
                self.request = Request(self.acre_url +"?"+ self.data, headers=headers)
            else:
                print "getting url: " + self.acre_url
                self.request = Request(self.acre_url, headers=headers)
        else:
            print "POSTing request: %s with data %s" % (self.acre_url, self.data);          
            headers['Content-Type'] = "application/x-www-form-urlencoded"

            self.request = Request( self.acre_url, data=self.data, headers=headers )

        try:
            self.cookiejar.add_cookie_header(self.request)
            self.response = urllib2.urlopen(self.request)

            cookies = self.cookiejar.make_cookies(self.response, self.request);
            print "TID: %s" % self.response.headers['X-Metaweb-TID'];
            for c in cookies:
                print "Cookie: %s" % c;

            return self.response
        except urllib2.HTTPError, e:
            print "TID: %s" % e.hdrs['X-Metaweb-TID'];
            raise



    def get_response_headers(self, response=None):
        p = re.compile("[\r\n]+");
        if response is None:
            response = self.response;
        _headers = p.split( "%s" % response.info());
        headers = {}; 

        for _h in _headers:
            p = re.compile(":");
            if p.search("%s" % _h):
                _key = p.split("%s" % _h, maxsplit=1);
                key =  _key[0].strip();
                value = _key[1].strip();

                if headers.has_key(key):
                    if  isinstance (headers[key], list):
                        headers[key].append(value)
                    else:
                        headers[key] = [headers[key], value];
                else:
                    headers[key] = value;

        self.response_headers = headers;

        return self.response_headers;

    def sleep(self, seconds):
        from time import sleep
        sleep(seconds);

    def app_login(self, domain=None, username=None, password=None):
        self.cookiefile = "./cookies.lwp";
        self.cookiejar = cookielib.LWPCookieJar();
        self.opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self.cookiejar));
        urllib2.install_opener(self.opener);
        data = urllib.urlencode({ "username":username, "password":password, 'mw_cookie_scope':'domain' });
	if domain is None:
	     url = "http://%s" % self.server_host;
	else:
	    url = "http://%s.%s" % (domain, self.server_host);

	if self.port != 80:
	    url = "%s:%s" % ( url, self.port );

        url = "%s/acre/login?%s" % (url, data);
        print "Logging in: %s" % url
  
        try:
            request = urllib2.Request(url)
	    self.cookiejar.add_cookie_header(request)
            respobj = urllib2.urlopen(request);
            respdata = respobj.read();
            respurl  = respobj.geturl();
            resphead = respobj.info();

            #print "Got response: %s" % respdata;
            cookies = self.cookiejar.make_cookies(respobj, request);
            for c in cookies:
                print "Cookie: %s" % c;

        except urllib2.HTTPError, e:
            print "Login failed: %s " % e;
            print e.fp.read();
            raise;

        except Exception, e:
            print "Login failed: %s " % e;
            raise;

    
    def app_touch(self, domain=None):
        from time import sleep
        sleep(2);
        print "Calling acre  touch service";
	if domain is None:
            touch_url = 'http://' + self.server_base;
	else:
	    touch_url = "http://%s.%s" % (domain, self.server_host);

        if self.port != 80:
            touch_url += ':%d' % self.port
        self.request_url( "%s/acre/touch" % (touch_url))
 
    def freebase_touch(self):
        from time import sleep
        sleep(2);
        print "Calling freebase touch service";
        self.request_url( "%s/api/service/touch" % (self.freebase_api_service))
 
    def touch(self, host=None):
        from time import sleep
        sleep(2);
        print "Calling touch service";
        if host is None:
            host = 'http://' + self.server_base
            if self.port != 80:
                host += ':%d' % self.port
        self.request_url( "%s/acre/touch" % (host))
 
    def acre_touch(self):
        from time import sleep
        sleep(2);
        print "Calling touch service";
        self.request_url( "%s/acre/touch" % (self.appeditor_host))
 
    def get_dataset(self, data_type, data_start):
        files = os.listdir(os.path.join(self.data_path, data_type))
        return [ a for a in files if a.startswith(data_start) ]

    def get_data(self, data_type, data_file):
        return file(os.path.join(self.data_path, data_type, data_file)).read()

    def print_exception_msg(self, error):
        print "Got error: %s" % error;
        body = "";
        if (re.match("HTTP Error", "%s" % error)):
            tid = self.get_tid_from_error(error);
            body = error.fp.read();
        elif (self.response):
            if (self.response.headers):
                tid = self.get_tid();
            else:
                tid = None
        else:
             print "No response object found - no TID available.";

        self.assert_(False, "An unexpected error occurred.\nTest: %s?%s\nTID:%s\nMessage:\n%s\n%s" % (self.acre_url, self.data, tid, error, body));

    def get_tid_from_error(self, error):
        _headers = error.hdrs;
        tid = ""
        p = re.compile('x-metaweb-tid', re.I )
        for h in _headers:
             if p.match( h ):
                 tid = _headers[h]
        if tid == "":
            self.assert_(False, "No X-Metaweb-TID header found in Acre response.")
        return tid;

    #WILL: def get_log_messages_from_error(self, error, format="json", callback=None): #HACK: I don't think this is required anymore?

    def get_tid( self ):
        try: 
            if self.response.headers['X-Metaweb-TID']:
                return self.response.headers['X-Metaweb-TID']
            else:
               self.assert_(False, "No X-Metaweb-TID found in Acre response.");
        except Exception, e:
            print "Caught unexpected exception %s: %s " % (e, self.response.headers)

    def parse_headers(self, headers=None):
        #print self.response.info();
        p = re.compile("[\r\n]+")
        if headers is None:
            headers = p.split("%s" % self.response.info())
        else:
            headers = p.split("%s" % headers);
        #print "headers: %s " % headers;
        sep = re.compile('[a-zA-Z\-]+:[\s]*')
        for h in headers:
            #print "header line: " + h
            h = sep.split(h)
            if len(h) > 1:
                field = h.pop(0)
                value = h.pop()
                value = (value.rstrip()).lstrip()
                self.response.headers[field] = value
                #print "field: " + field + " value: " + value;

    def verify_log_message(self, expected_msg, expected_level=None):
        
        if not self.log or not len(self.log):
            self.assert_(False,'Log is empty, could not find %s' % (expected_msg))
        
        if not expected_level:
            expected_level = "LOG"
                
        found_log = False
        for msg in self.log:
            metadata = msg[0]
            con_args = msg[1]
            if isinstance(con_args, types.StringTypes):
                message = con_args
            elif isinstance(con_args, types.ListType):
                message = con_args[0] #HACK only the first arg
            else:
                print type(con_args)
                break
                        
            if message and isinstance(message, types.StringTypes):
                if (hasattr(expected_msg, 'search') and expected_msg.search(message)) or (expected_msg == message):
                    found_log = True
                    self.assert_(expected_level == metadata['Type'], "Did not find expected log level in message. Expected: %s. Actual: %s" %(expected_level, metadata['Type']))
                    break

        if not found_log:
            self.assert_(False, "Did not find expected message in the log. Expected: %s Actual %s" % (expected_msg, self.log))
    

    def check_for_failures(self):
        self.assert_(re.match('OK', self.response.read(), re.I|re.M), self.response.read())

    def encode_data(self, data):
        import urllib

        # clean up any values that look like they're supposed to be JSON
        # XXX/nix this is still kind of unpredictable.
        if isinstance(data, dict):
            for k,v in data.items():
                if not isinstance(v, basestring):
                    data[k] = simplejson.dumps(v)
                    print " --> %r" % data[k]

        self.data = urllib.urlencode(data)
        #print "encoded data: " + self.data
        return self.data
        
    def validate_html(self, response):
        # only import this stuff if we need it!
        from html5lib.html5parser import HTMLParser
        from html5lib.filters.validator import HTMLConformanceChecker
        import pprint
        
        p = HTMLParser()
        p.parse(response.body)

        if (p.errors and
            not (len(p.errors) == 1 and p.errors[0][1] == 'unknown-doctype')):

            lines = response.body.splitlines()
            for (line, col), error, vars in p.errors:
                print "----------------------------------"
                print "Error: %s on line %s, column %s" % (error, line, col)
                print "%5d: %s" % (line, lines[line-1])
                print "      %s^" % (" " * col,)
        
            self.assert_(False)

    def check( self ):
        r = self.response.read()
        #print("response body:" + r)
        self.assert_(re.compile('ok', re.I|re.M).search(r), "Did not find OK in acre response.")

    def login(self, username=None, password=None):
        self.freebase_login(username, password);
        if ( self.freebase_service != self.appeditor_host ):
            self.acre_login(username, password);

    def freebase_login(self, username=None, password=None, host=None):
        if host is None:
            host = self.freebase_service;
        self.cookiefile = "./cookies.lwp";
        self.cookiejar = cookielib.LWPCookieJar();
        self.opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self.cookiejar));
        urllib2.install_opener(self.opener);
        data = urllib.urlencode({ "username":username, "password":password, 'mw_cookie_scope':'domain' });
        url = "%s/api/account/login?%s" % (host, data);
        print "Logging in: %s" % url
  
        try:
            request = urllib2.Request(url)
	    self.cookiejar.add_cookie_header(request)
            respobj = urllib2.urlopen(request);
            respdata = respobj.read();
            respurl  = respobj.geturl();
            resphead = respobj.info();
            cookies = self.cookiejar.make_cookies(respobj, request);
            for c in cookies:
                print "Cookie: %s" % c;

            #print "Got response: %s" % respdata;

        except urllib2.HTTPError, e:
            print "Login failed: %s " % e;
            print e.fp.read();
            raise;

        except Exception, e:
            print "Login failed: %s " % e;
            raise;


    def  acre_login(self, username=None, password=None, host=None):
        if host is None:
            host = self.freebase_service;

        self.cookiefile = "./cookies.lwp";
        self.cookiejar = cookielib.LWPCookieJar();
        self.opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self.cookiejar));
        urllib2.install_opener(self.opener);
        data = urllib.urlencode({ "username":username, "password":password, 'mw_cookie_scope':'domain' });
        url = "%s/api/account/login?%s" % (host, data);
        print "Logging in: %s" % url
  
        try:
            request = urllib2.Request(url)
	    self.cookiejar.add_cookie_header(request)
            respobj = urllib2.urlopen(request);
            respdata = respobj.read();
            respurl  = respobj.geturl();
            resphead = respobj.info();

            print "Got response: %s" % respdata;
            cookies = self.cookiejar.make_cookies(respobj, request);
            for c in cookies:
                print "Got cookie: %s" % c;


        except urllib2.HTTPError, e:
            print "Login failed: %s " % e;
            print e.fp.read();
            raise;

        except Exception, e:
            print "Login failed: %s " % e;
            raise;

    def logout(self):
        self.freebase_logout();
        if ( self.freebase_service != self.auth_host ):
            self.acre_logout();

    def freebase_logout(self): 
        data = urllib.urlencode({ 'mw_cookie_scope':'domain' });
        logout_url = "%s/api/account/logout?%s" % (self.freebase_service, data);
        headers = { "X-Metaweb-Request" : 1 }            
        response = self.request_url(logout_url );

    def acre_logout(self): 
        data = urllib.urlencode({ 'mw_cookie_scope':'domain' });
        logout_url = "%s/api/account/logout?%s" % (self.appeditor_host, data);
        headers = { "X-Metaweb-Request" : 1 }            
        response = self.request_url(logout_url );

    def assertController(self, response, controller_name):
        """ Easy way to assert that a given controller was run

        Uses routes' parsed controller, which handles internal redirects
        
        """
        
        # chop leading '/' because routes doesn't give it to us
        
        if controller_name[0] == '/':
            controller_name = controller_name[1:]

        environ = response.req.environ
        self.assertEquals(environ['wsgiorg.routing_args'][1]['controller'],
                          controller_name)

    def request_url( self, url, port=None, path=None, args=None, data=None, headers={}, method=None, code=None ):

        #print "ARGS IS: %s DATA: %s" % (args, data)

        if port is not None and port != 80:
            url = "%s:%s" % (url, port);

        if path is not None:
            url = "%s/%s" % (url, path);

        if args is not None:
            url = "%s?%s" % (url, args);

        if data is not None:
            data = urllib.urlencode(data);

        try:
            print "\nRequesting url %s\n" % url
            print "     Adding headers: %s\n" % headers
           
            # by default, if data is provided, we POST IT unless method==GET 
            if data is not None and (method=="POST" or method==None): 
                headers['Content-Type'] = "application/x-www-form-urlencoded"
                print "     Posting data: %s\n" % data
                self.request = urllib2.Request(url, data=data, headers=headers);
            elif data is not None and method == "GET":
	        url = "%s?%s" % ( url, data );
                self.request = urllib2.Request(url, headers=headers);
   
            else:
                self.request = urllib2.Request(url, headers=headers);
                
            self.cookiejar.add_cookie_header(self.request);
            self.response = self.opener.open(self.request);

            body_result = None;
            body_message = None;
            body_json = None;
            body = self.response.read();

            try:
                body_json = simplejson.loads(body);
                if body_json.has_key("result"):
                    body_result = body_json['result'];
                if body_json.has_key("messages"):
                    body_messsage = body_json['messages'][0]['message'];
            except Exception, e:
                if url.find("api/trans") > -1:
                    print "Warn: request did not return a JSON object: %s" %  e;

            result = { "request_url": url, 
                     "body": body,
                     "body_json": body_json,
                     "body_result": body_result,
                     "body_message": body_message,
                     "response": self.response, 
                     "response_url" : self.response.geturl(), 
                     "headers": self.get_response_headers()
            }
            print "    URL: %s" % (url);
            if result['headers'].has_key('X-Metaweb-TID'):
                print "    TID: %s" % result['headers']['X-Metaweb-TID'];
            else:
                print "    Headers: %s" % result['headers'];

            if result['headers'].has_key('X-Metaweb-Cost'):
                print "    Cost: %s" % result['headers']['X-Metaweb-Cost'];

            cookies = self.cookiejar.make_cookies(self.response, self.request);
            for c in cookies:
                print "    Got cookie: %s" % c;

            if result.has_key('body_result'):
                print "    Result: %s" % result['body_result'];
            elif result.has_key('body_json'):
                print "    Result: %s" % result['body_json'];
            else:
                print "    Result: %s" % result['body'];

            print "\n";

            return result;

        except urllib2.HTTPError, e:
            result = { "body": e.fp.read(), 
                       "response": e,
                       "headers": e.hdrs, 
                       "code": e.code, 
                       "info": e.info, 
                       "msg":  e.msg, 
                       "newurl": e.url,
                       "request_url": url }

            print "    URL: %s?%s" % (url, data);
            if result['headers'].has_key('X-Metaweb-TID'):
                print "    TID: %s" % result['headers']['X-Metaweb-TID'];
            else:
                print "    Headers: %s" % result['headers'];
            if result['headers'].has_key('X-Metaweb-Cost'):
                print "    Cost: %s" % result['headers']['X-Metaweb-Cost'];
            print "    Result: %s" % result['body'];

            print "\n";

            
            if code is not None:
                self.assert_ (e.code == code, "Did not get expected HTTP Error code.  Expected: %s Got: %s" % ( code, e.code ));

            if result['code'] == 302 or result['code'] == 301:
                print "    Got redirect.\n"
                print "    Redirecting to %s\n" % result['newurl']
                return self.request_url(result['newurl']);

            else:
                print "    Got code %s\n%s\n" % (e.code, result['body'] );

            return result;

        except Exception, e:
            print "    Caught unexpected error %s\n" % e;
            for p in e:
                print "    %s" % p;
            self.assert_(False, "threw unexpected error:\n%s" % e);
          
    def mqlread(self, query, headers={}, host=None):
        if host is None:
            host = self.freebase_api_service;
        url = "%s/api/service/mqlread" % host;
        data = { "query": simplejson.dumps( query ) }
        headers['X-Metaweb-Request'] = 1;
        print "Sending MqlRead query: %s/%s" % (url, query);
        response = self.request_url( url, data=data, headers=headers );
        return response;

    def mqlwrite(self, query, headers={}, username=None, password=None, host=None):
        if username is None:
            username = self.username;
        if username is password:
            username = self.password;
        if host is None:
            host = self.freebase_api_service;
        #self.freebase_login(host=host);
        url = "%s/api/service/mqlwrite" % host;
        data = { "query": simplejson.dumps( query ) }
        headers['X-Metaweb-Request'] = 1;
        print "Sending MqlWrite query: %s/%s" % (url, query);
        return self.request_url( url, data=data, headers=headers );

    def create_timestamp(self):
        import time;
        time.sleep(1);
        dt = time.localtime();
        year = dt[0];
        if dt[1] < 10:
            month = "0%s" % dt[1]
        else:
            month =  dt[1];
        if dt[2] < 10:
            day   = "0%s" % dt[2];
        else:
            day=dt[2];
        if dt[3] < 10:
            hour = "0%s" % dt[3]
        else:
            hour =  dt[3];
        if dt[4] < 10:
            min = "0%s" % dt[4];
        else:
            min = dt[4];
        if dt[5] < 10:
            sec = "0%s" % dt[5]
        else:
            sec = dt[5];

        app_name = "%s%s%s-%s%s%s" % (year, month, day, hour, min, sec)

        print "timestamp created: %s" % app_name
        return app_name;


def FileTester(f, line_tester, filter=None):
    """
    Creates a function that yields a new tester for each line. This is
    nice for nose, because nose will run such a function and treat
    each tester as a separate test.

    line_tester can be any callable, including a class

    filter is any callable that returns a non-True or non-False
    value. So a filter can be as simple as 'lambda x: x' to just
    return non-blank lines.
    
    Sample usage:

    With a filename:
    def check_mydata(one_line):
        assert "data" in one_line
        
    test_mydata = FileTester("mydata.txt", check_mydata)

    Using a filter. This one checks for non-blank lines:

    test_mydata_stripped = FileTester("mydata.txt", check_mydata, lambda x: x.strip())

    """

    if isinstance(f, basestring):
        f = file(f)

    filename = getattr(f, 'name', None)
    if filename is None:
        # try really hard here - mostly we're just letting someone
        # wrap a generator around a file, as in SimpleFileTester
        # below. Maybe we eventually want to delve into recursive
        # generators, but not now.
        if hasattr(f, 'gi_frame'):
            # look at function declaration for name of first argument
            first_arg_name = f.gi_frame.f_code.co_varnames[0]

            # now look in the local variables for the value of that argument
            inner_file = f.gi_frame.f_locals[first_arg_name]

            # finally, lets just assume that it is a file
            
            # perhaps we can/should recurse here to walk up a
            # generator stack, but we've already worked pretty hard
            filename = getattr(inner_file, 'name', None)
            
        
    def run_test():
        def test_line(line):
            line_tester(line)

        for line in f:
            if filter and not filter(line):
                continue

            # update description so nose can print something
            test_line.description = '%s: %s' % (filename, line)
            yield test_line, line

    return run_test

def SimpleFileTester(f, line_tester):
    """
    This is a wrapper around FileTester which strips out "#" comments
    and blank lines. Your line_tester function will only get non-blank
    lines, with the comments stripped out.
    """

    # need to do the string->file conversion here because we need to
    # examine each line of the file.
    if isinstance(f, basestring):
        f = file(f)
        
    def linefilter(f):
        for line in f:
            if '#' in line:
                line = line[:line.index('#')]
            line.rstrip()
            yield line

    return FileTester(linefilter(f), line_tester, lambda x: x)
