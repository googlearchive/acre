from acre_py_tests import *
import re
import simplejson


class test_class(TestController):
    def test_json_stringify_simple(self):
        self.set_acre_script("json_stringify", { "string":  {} })
        exp_result = { "string" :'"{}"' }
        self.get();
        result = simplejson.loads(self.response.read());
        print ("Got response:  %s" % result );
        self.assert_( result == exp_result, "Got unexpected result: %s " % result);
            
    @tag(bug=False, bugid="ACRE-248")
    def test_json_stringify_undefined(self):
        self.set_acre_script("json_stringify", {})
        exp_result = "JSON.stringify: can not stringify undefined"

        try:
            self.get();
            result = self.response.read();
            print ("Got result : %s " % result);
            self.assert_(re.compile(exp_result).search(result), "Got unexpected result.  Got: %s Expected: %s " % (result, exp_result));
            
        except Exception, e:
            self.print_exception_msg(e);

    def test_json_stringify_string(self):
        self.set_acre_script("json_stringify", {'string': 'hello there' })
        exp_result = { "string":"\"hello there\""};

        try:
            self.get();
            response = simplejson.loads(self.response.read());
            print ("%s" % response);
            self.assert_(response == exp_result, "Got unexpected result.  Got: %s Expected: %s " % (response, exp_result));
            
        except Exception, e:
            self.print_exception_msg(e);

test_class.reviewed = True
