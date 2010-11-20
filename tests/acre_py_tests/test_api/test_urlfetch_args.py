from acre_py_tests import *
import re
import urllib2
import simplejson
from unittest import TestCase

class test_class(TestController):

    @tag(bug=False, bugid="ACRE-210")
    def test_urlfetch_post_with_headers(self):
        self.set_acre_script("urlfetch_args", {
            "method":"POST",
            "url":"%s/%s" % (self.host, "urlfetch_response"),
            "url_headers": {"x-note":"sent by urlfetch_args" }
        })
        try: 
            self.get();
            response = simplejson.loads(self.response.read());
            body = response['body'];
            headers = response['headers'];
            status = response['status']
            print "Got response with body %s" % body;
        
            # verify status
            self.assert_(status == 200, "Got unexpected HTTP response status.  Expected 200, got %s " % status);
        except urllib2.HTTPError, e:
            print (e.fp.read());
            self.assert_(False, "Got unexpected exception %s" % e );
            
        except Exception, e:
            self.assert_(False, "Got unexpected exception %s" % e );


    @tag(bug=False, bugid="ACRE-209")
    def test_urlfetch_freebase_search(self):
        freebase_server = re.compile("http://").sub("", self.freebase_service)
        self.set_acre_script("urlfetch_args", {
                "method":"GET",
                "url":"http://%s/api/service/search?limit=1&start=0&query=rza" % freebase_server,
                #"params": {"limit":1, "start":0, "query":"rza" }
            })
        try:
            self.get();
            response = simplejson.loads(self.response.read());
            body = response['body'];
            headers = response['headers'];
            status =response['status']
            result = simplejson.loads( body );

            print "Got response %s" % body;
            print "Got response with status %s" % status;
            print "Got search result %s" % result;
 
            # verify status
            self.assert_(status == 200, "Got unexpected HTTP response status.  Expected 200, got %s " % status);

            # verify headers
            exp_content_type ="text/plain; subtype=json;charset=UTF-8"
            content_type = headers['content-type'];
            self.assert_(content_type == exp_content_type,"Got unexpected content-type. Expected: %s, Got: %s" % (exp_content_type, content_type));

            # verify result
            expected_pattern = "Bobby Digital";
            self.assert_(len(result['result']) > 0, "Did not find > 0 results")

            #self.assert_(re.compile(expected_pattern).search(result['result']), "Did not find %s in search results" % expected_pattern)

        except Exception, e:
            self.assert_(False, "Got unexpected exception %s" % e );

    @tag(bug=False, bugid="ACRE-209")
    def test_urlfetch_get_with_params(self):
        self.set_acre_script("urlfetch_args", {
           "method":"GET",
           #"url_params": {"foo":"bar"},
           "url":"%s/%s" % (self.host, "urlfetch_response?foo=bar")
        })

        try: 
            self.get();
            response = simplejson.loads(self.response.read(), encoding="utf-8");
            print "Got response %s" % response;
            body = simplejson.loads(response['body'], encoding="utf-8");
            headers = response['headers'];

            # verify request method
            method = body['request_method'];
            self.assert_(method == "GET", "Did not find expected request method GET.  Got: %s " % method);

            # verify params
            params = body['params'];
            print "Got params %s" % params;
            exp_params = {unicode("foo"): unicode("bar") }
            self.assert_(params == exp_params, "Did not find expected params.  Got: %s Expected: %s" % ( params, exp_params) );

            # query string
            query_string= body["query_string"];
            exp_query_string = "foo=bar";
            print "Got query string %s" % query_string;
            self.assert_(query_string == exp_query_string, "Did not get expected query_string. Got: %s Expected: %s" % (query_string, exp_query_string));
         

        except Exception, e:
            print "logs from urlfetch_args request:\n%s" % self.log;
            print(self.log);
            self.assert_(False, "test threw unexpected error. %s" % e);


    @tag(bug=False, bugid="ACRE-209")
    def test_urlfetch_args(self):
        self.set_acre_script("urlfetch_args", { 
            "method":"POST",
            #"url_params": {"foo":"bar"},
            #"url_headers": { "content-type":"text/plain" },
            "content":"hello world",
            "url": "%s/%s" % (self.host, "urlfetch_response?foo=bar")
        })

        try: 
            self.get();
            response = simplejson.loads(self.response.read());
            print "Got response %s" % response;

            # verify request method
            headers =  response['headers'];
            print "Headers %s" % headers;

            # get request body
            body =  simplejson.loads(response['body']);
            print "Body: %s" % body;

            # verify request method
            method = body['request_method'];
            print 
            self.assert_(method == "POST", "Did not find expected request method POST.  Got: %s " % method);

            # verify request_body
            request_body = body['request_body'];
            print "Got request_body %s" % request_body;
            exp_request_body = re.compile("hello world");
            self.assert_(exp_request_body.search(request_body), "Did not find expected request body.  Got: %s Expected %s" % (request_body, "hello world\\n" ));

            # verify params
            params = body["params"];
            print "Got params %s" % params;
            exp_params = {"foo":"bar" }
            self.assert_(params == exp_params, "Did not find expected params.  Got: %s Expected %s:" % ( params, exp_params) );

            # query string
            query_string= body["query_string"];
            exp_query_string = "foo=bar";
            print "Got query string %s" % query_string;
            self.assert_(query_string == exp_query_string, "Did not get expected query_string. Got: %s Expected: %s" % (query_string, exp_query_string));

        except Exception, e:
            print "logs from urlfetch_args request:\n%s" % self.log;
            #XTINE: WILL: do we need? print("logs from urlfetch_response request:\n\n" % self.get_log(headers['x-metaweb-tid']));
            self.assert_(False, "test threw unexpected error. %s" % e);

test_class.reviewed = True
