from acre_py_tests import *
import re
try:
    import simplejson
except ImportError:
    import json as simplejson

class test_class(TestController):

    def test_exit_basic(self):
        self.set_acre_script("exit");
        self.get()
        _r = self.response.read();
        print "got response %s " % _r;
        r = simplejson.loads(_r);
        print ("result is %s " % r['result'] );
        self.assert_(r['result'] == 'PASS', "%s" % _r );

    def test_exit_no_catch(self):
        self.set_acre_script("exit_no_catch");
        self.get();
        _r = self.response.read();
        print "got response %s " % _r;
        r = simplejson.loads(_r);
        self.assert_( r['result'] == 'PASS', "%s" % _r );

    def test_exit_in_require(self):
        self.set_acre_script("exit_require");
        self.get();
        _r = self.response.read();
        print "got response %s " % _r;
        r = simplejson.loads(_r);
        self.assert_( r['result'] == 'PASS', "%s" % _r );

    def test_exit_args(self):
        self.set_acre_script("exit_args", {0:True, 1:"hello", 2:2})
        self.get();
        _r = self.response.read();
        print "got response %s " % _r;
        r = simplejson.loads(_r);
        self.assert_(r['result'] == 'PASS', "%s" % _r );

test_class.reviewed = True
