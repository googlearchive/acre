from acre_py_tests import *
import re
import urllib2
try:
    import simplejson
except ImportError:
    import json as simplejson
from unittest import TestCase

class test_class(TestController):

    @tag(bug=False, oldbugs=["ACRE-211"], bugid="ME-1410")
    def test_urlfetch_get_jpg(self):
        freebase_server = re.compile("http://").sub("", self.freebase_service)
        self.set_acre_script("urlfetch", {
            "method":"GET",
            "url":"http://%s/api/trans/raw/freebase/apps/qatests/mjt/cupcake" % freebase_server
        })
        try: 
            self.get();
            response = self.response.read();
            headers = self.get_response_headers();
            response_json = simplejson.loads(response);
            
            print "Got headers: %s " % headers;
            print "\n\nGot response: %s " % response;

            print "Verifying urlfetch body\n";
            self.assert_( response_json['body'] == "[object Binary]", "Did not get expected response body: %s" % response_json['body'] );
            self.assert_( response_json['content_type'] == "image/jpeg", "Did not get expected response content_type: %s" % response_json['content_type'] );
            self.assert_( response_json['content_type_charset'] == None, "Did not get expected response content_type_charset: %s" % response_json['content_type_charset'] );

            print "Verifying urlfetch headers\n";
            self.assert_( response_json['headers']['content-type'] == "image/jpeg", "Did not get expected response headers content-type: %s" % response_json['headers']['content-type'] );
            if re.search( "trunk", self.freebase_service ):
                self.assert_( int(response_json['headers']['content-length']) < 7000, "Did not get expected response headers content-length: %s" % response_json['headers']['content-length'] );
            else:
                self.assert_( response_json['headers']['content-length'] == "6630", "Did not get expected response headers content-length: %s" % response_json['headers']['content-length'] );

      
        except urllib2.HTTPError, e:
            print (e.fp.read());
            self.assert_(False, "Got unexpected exception %s" % e );
            raise;
                
    @tag(bug=True, oldbugs=["ACRE-211"], bugid="ACRE-1321", slow=True)
    def test_urlfetch_get_image(self):
        self.set_acre_script("urlfetch_binary", 
             data={
                 "method":"GET",
                  "url":"http://farm4.static.flickr.com/3185/2558016119_395148deb6.jpg?v=0",
            },
            domain="api.qatests.apps.freebase"
        )
        try: 
            self.get();
            body = self.response.read();
            # print "Got response content-length: %s" % self.response.headers['Content-Length'];
            # content_length = headers['content-length'];
            # self.assert_(content_length == "159867", "Got unexpected content-length. Expected 159867, Got: %s " % content_length ); 

            # verify content-type
            print "Got response content-type: %s" % self.response.headers['Content-Type'];
            self.assert_(self.response.headers['Content-Type'] == "image/jpeg", "Got unexpected content-type. Expected image/jpeg , Got: %s " % self.response.headers['Content-Type']);

            # compare body to expected body
            f = open("%s/%s" % (self.data_path, "/jpg/cupcake.jpg"));
            exp_body = f.read(); 
            print "Comparing data received to expected data.";
            self.assert_( exp_body == "%s" % body, "Got unexpected urlfetch body content.");

            # verify body length
            body_length = len(body);
            print "Verifying body length.  Expected: %s Got: %s" % ( len(exp_body), body_length);
            self.assert_(body_length == len(exp_body), "Got unexpected body length. Expected %s, Got: %s " % (len(exp_body), body_length ));
 
        except urllib2.HTTPError, e:
            print (e.fp.read());
            self.assert_(False, "Got unexpected exception %s" % e );
            raise;

        except Exception, e:
            self.assert_(False, "Got unexpected exception %s" % e );
            raise;

    @tag(slow=True, bug=False, oldbugs=["ACRE-1102"], bugid="CLI-8734")
    def test_urlfetch_html_arnold_schwarznegger(self):
        from urllib2 import Request

        self.data = {
            "method":"GET",
            "url":"%s/view/en/arnold_schwarzenegger" % self.freebase_service
        }
        self.set_acre_script("urlfetch", self.data)

        try: 
            response = self.request_url( 
                  url="http://api.qatests.apps.freebase.%s" % self.server_host,
                  port = self.port,
                  path= "urlfetch?%s" % self.data
            );
            #response = unicode(response, errors="ignore");
            #response = simplejson.loads(response);
            print "Parsed JSON response successfully: %s" % response;
            body = response['body'];
            print "Got body: %s" % body;
            headers = response['headers'];
            print "Got headers: %s" % headers;
            #status = response['status'];
            #print "Got status %s" % status;
        
        except urllib2.HTTPError, e:
            msg = e.fp.read();
            if re.compile("Unrecoverable error: the script was taking too long").search(msg):
                print "Got a script timeout. Happens. %s" % msg
            else:
                self.print_exception_msg(e);
            raise;

test_class.reviewed = True
