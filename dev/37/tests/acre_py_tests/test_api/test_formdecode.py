from acre_py_tests import *
import re
import urllib2
try:
    import simplejson
except ImportError:
    import json as simplejson
from unittest import TestCase
from urllib2 import HTTPError

class test_class(TestController):

    @tag(bug=False, bugid="ACRE-662")
    def test_formdecode_simple(self):

        self.set_acre_script("formdecode");
        data = { "foo":"bar", "arg0": "PASS", "string": "hello", "int": 1, "boolean": True, "null": None, "float": 3.14 }
        self.data = self.encode_data(data);
        self.method = "POST";

        try: 
            self.get();
            body = self.response.read();
            print (body);
            body = simplejson.loads(body);
            self.assert_( body['arg0'] == "PASS", "arg0 value was not PASS" );
            self.assert_( body['string'] == "hello", "string value was not hello" );
            self.assert_( body['int'] == "1", "int value was not 1" );
            self.assert_( body['boolean'] == "true", "boolean value was not true" );
            self.assert_( body['null'] == "null", "null value was not null" );
            self.assert_( re.compile("3\.14").search(body['float']), "float value did not match 3.14" );
            self.assert_( body['foo'] == "bar", "foo value was not bar" );

        except Exception, e:
            self.print_exception_msg(e);

test_class.reviewed = True
