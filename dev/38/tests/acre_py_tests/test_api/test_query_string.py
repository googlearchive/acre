from acre_py_tests import *
try:
    import simplejson
except ImportError:
    import json as simplejson
from urllib2 import HTTPError 


class test_class(TestController):
    # note acre.environ is deprecated  
    def test_send_100_params( self ):
        data = {};
        for i in range(0,100):
            data["param_%s" % i] = "value_%s" % i;

        self.set_acre_script("get_environ", data)
        try:
            self.get(); 
            environ = simplejson.loads(self.response.read());
            self.assert_(len(environ['params']) == 100, "Got unexpected number of parameters.  Expected 100 , got %s " % len(environ['params']) );
            self.assert_( environ['params'] == data, "Got unexpected param value.  Got %s " % environ['params'] );
            self.assert_(environ['query_string'] == self.data, "Got unexpected query_string value: %s " % environ['query_string'] );
        except Exception, e:
           self.assert_(False, "Got unexpected error: %s " % e);


    def test_send_254_params( self ):
        data = {};
        for i in range(0,255):
            data["p_%s" % i] = "v_%s" % i;
      
        self.set_acre_script("get_environ", data)
        try:
            self.get(); 
            environ = simplejson.loads(self.response.read());
            self.assert_(len(environ['params']) == 255, "Got unexpected number of parameters.  Expected 100 , got %s " % len(environ['params']) );
            self.assert_( environ['params'] == data, "Got unexpected param value.  Got %s " % environ['params'] );
            self.assert_(environ['query_string'] == self.data, "Got unexpected query_string value: %s " % environ['query_string'] );
          
        except Exception, e:
           self.assert_(False, "Got unexpected error: %s " % e);

test_class.reviewed = True
