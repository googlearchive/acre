# -*- coding: utf-8 -*-
from acre_py_tests import *
import re
import simplejson
from urllib2 import HTTPError

class test_class(TestController):

    def test_log_simple_plain_text(self):
        self.set_acre_script("log", {'test_log_simple_plain_text':'a plain text message that should appear in the log'})
        self.get()
        self.check()
        self.check_for_log_message(self.data, 'INFO')
   
    def test_log_8_bit_char(self):
        self.set_acre_script("log", {'test_log_8_bit_char':'an unencoded string with 8-bit characters: é'})
        self.get()
        self.check()
        self.check_for_log_message(self.data, 'INFO')

    def test_log_long_string_260_chars(self):
        self.set_acre_script("log", { 'test_long_log_string_260_chars': '123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 ' })
        self.get()
        self.check()
        self.check_for_log_message(self.data, 'INFO')

    def test_log_long_string_1600_chars(self):
        self.set_acre_script("log", { 'test_long_log_string_1600_chars': '123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 123456789 '} )
        self.get()
        self.check()
        self.check_for_log_message(self.data, 'INFO')

    def test_writing_multiple_messages(self):
        self.set_acre_script("log",{'msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        self.get()
        self.check()
        self.check_for_log_messages(self.data, 'INFO')

    @tag(bug=False, bugid="ACRE-1487")
    def test_log_debug(self):
        self.set_acre_script("log_debug",{'msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'});
        self.get(headers={ "x-acre-enable-log": "firephp:debug" });
        self.check()
        self.check_for_log_messages(self.data, 'LOG') # DEBUG is LOG in firephp speak

    def test_log_warn(self):
        self.set_acre_script("log_warn",{'msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        self.get()
        self.check()
        self.check_for_log_messages(self.data, 'WARN')

    def test_log_info(self):
        self.set_acre_script("log_info",{'msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        self.get()
        self.check()
        self.check_for_log_messages(self.data, 'INFO')

    def test_log_error(self):
        self.set_acre_script("log_error",{'msg_0':'these messages should appear as errors','msg_1':'12345 67890','msg_2':'abcdefg hijklmnop qrstuv wxyz'})
        try:
            self.get()
            self.check()
            self.check_for_log_messages(self.data, 'ERROR')
        except Exception, e:
            self.print_exception_msg(e);

    def test_log_js_parse_err(self):
        try:
            self.set_acre_script("js_parse_error", data={ "js_parse_error": "Unhandled exception: missing ; before statement"})
            self.get()
            self.check()
            self.check_for_log_message(self.data, 'INFO')
        except HTTPError, e:
            print "Got exception: %s" % e;
            self.verify_log_message( re.compile("Unhandled exception: missing \; before statement"), "ERROR" );

    def test_log_js_reference_err(self):
        try:
            self.set_acre_script("js_eval", data={ "js":"foo = bar" });
            self.get()
            self.verify_log_message( re.compile("EVAL THREW AN EXCEPTION: ReferenceError: \"bar\" is not defined\."), "ERROR" );
        except HTTPError, e:
            print "Got exception: %s" % e;
            raise;

            
    #
    # Utility functions for this test class
    #
    def check_for_log_message(self, msg, level=None):
        self.verify_log_message(msg, level)

    def check_for_log_messages(self, data, level=None):
        msgs = data.split('&')
        for msg in msgs:
            self.verify_log_message(msg, level)

    def check( self ):
        import re
        r = self.response.read()
        print("response body:" + r)
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
