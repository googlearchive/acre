# -*- coding: utf-8 -*-
from acre_py_tests import *
import re
import simplejson
from urllib2 import HTTPError

class test_class(TestController):

    def test_log_simple_plain_text(self):
        self.set_acre_script("log", {'test_log_simple_plain_text':'a plain text message that should appear in the log'})
        self.get_dbg()
        self.check()
        self.check_body_log(self.data, 'INFO')
   
    def test_log_8_bit_char(self):
        self.set_acre_script("log", {'test_log_8_bit_char':'an unencoded string with 8-bit characters: é'})
        self.get_dbg()
        self.check()
        self.check_body_log(self.data, 'INFO')

    def test_log_long_string_260_chars(self):
        self.set_acre_script("log", { 'test_long_log_string_260_chars': '123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 ' })
        self.get_dbg()
        self.check()
        self.check_body_log(self.data, 'INFO')

    def test_log_long_string_1000_chars(self):
        self.set_acre_script("log", { 'test_long_log_string_1000_chars': '123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 '} )
        self.get_dbg()
        self.check()
        self.check_body_log(self.data, 'INFO')

    def test_writing_multiple_messages(self):
        self.set_acre_script("log",{'msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        self.get_dbg()
        self.check()
        self.check_body_logs(self.data, 'INFO')

    def test_log_warn(self):
        self.set_acre_script("log_warn",{'msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        self.get_dbg()
        self.check()
        self.check_body_logs(self.data, 'WARN')

    def test_log_info(self):
        self.set_acre_script("log_info",{'msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        self.get_dbg()
        self.check()
        self.check_body_logs(self.data, 'INFO')

    def test_log_error(self):
        self.set_acre_script("log_error",{'msg_0':'these messages should appear as errors','msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        try:
            self.get_dbg()
            self.check()
            print "DATA: %s" % self.data
            self.check_body_logs(self.data, 'ERROR')
        except Exception, e:
            self.print_exception_msg(e);


            
    #
    # Utility functions for this test class
    #
    def get_dbg(self):
        self.get({"x-acre-enable-log":"debug"}) 

    def check_body_log(self, msg, level=None):
        res = simplejson.loads(self.r)
        logs = res.get('logs')
        found = False
        for l in logs:
            type = l[0].get('Type')
            for item in l[1]:
                if item == msg and type == level: found = True
                #print "ITEM: %s LEVEL:%s" % (item,level)
        if found is False:
            note = '%s not found' % msg
            assert note is False

    def check_body_logs(self, data, level=None):
        msgs = data.split('&')
        for msg in msgs:
            self.check_body_log(msg, level)

    def check( self ):
        import re
        r = self.response.read()
        self.r = r
        self.assert_(re.compile('ok', re.M).search(r), "Did not find expected OK in acre response.")

    def get_tid( self ):
        self.parse_headers();
        print "tid:" + self.response_headers['X-Metaweb-TID']
        return self.response_headers['X-Metaweb-TID']

    def parse_headers(self):
        import re
        self.response_headers = {};
        p = re.compile("[\r\n]+")
        headers = p.split("%s" % self.response.info())
        for h in headers:
            sep = re.compile(':[\s]+')
            print "header line: " + h
            h = sep.split(h)
            if len(h) > 1:
                field = h.pop(0)
                value = h.pop()
                value = (value.rstrip()).lstrip()
                self.response_headers[field] = value
                print "field: " + field + " value: " + value
            
        return self.response_headers; 

test_class.reviewed = True
