#! /usr/bin/env python

# A python decoder lib for the FirePHP protocol
# Written by Will Moffat & Faye Harris for Metaweb Technologies
# https://wiki.metaweb.com/index.php/Acre_log_headers
# http://www.firephp.org/Wiki/Reference/Protocol

import re
import simplejson

def FirePHP_decode(headers):
    
    r = re.compile(r'^X-Wf-1-1-1-(\d+): (\d*)\|(.+)\|(\\)?\s*$',re.IGNORECASE)
    
    ordered = [None]*len(headers)
    max_index = -1
    
    for header_name in headers:
        header = header_name + ': ' + str(headers[header_name])
        header_name = header_name.lower()

        #Is the header part of the WildFire protocol?
        if not header_name.startswith('x-wf-'):
            continue
        
        #We have hard coded support for WildFire protocol + we don't check the version
        if header_name == 'x-wf-1-structure-1' or header_name == 'x-wf-protocol-1' or header_name == 'x-wf-1-plugin-1':
            #ignore known protocol headers
            continue;
        
        # Decode the data
        # match    X-Wf-1-1-1-1: 48|[{"~~ID~~":1,"Type":"INFO"},"Test logging info"]|
        #   or     X-Wf-1-1-1-19: |...snip...|\
        #   or     X-Wf-1-1-1-0: 98|[{"Time":1285960735794,"Type":"INFO"},
        #                          ["Log written at: Fri Oct 01 2010 12:18:55 GMT-0700 (PDT)"]]|
        m = r.match(header)
        if not m:
            raise Exception("FirePHP.py: malformed log header "+header)
    
        g = m.groups()
        if len(m.groups()) != 4:
            raise Exception("FirePHP.py: malformed log header "+header)

        #print "header_name: %s" % header_name;
        #print "header_value: %s" % header; 

        
        (index,length,body,multiline)=g
        index = int(index)
        
        if length:    length = int(length)
        else:         length = None
        
        if multiline: multiline = True
        else:         multiline = False
        
        info = { "body": body }
        if not multiline and length:
            if length != len(body):
                raise Exception('FirePHP.py: Actual msg length (%d) != length field (%d)\n%s' % (len(body),length,header))
                continue
        else:
            info['length']    = length
            info['multiline'] = True;
        
        if ordered[index]:
            raise Exception('FirePHP.py: duplicate msg index %d\nOverwriting: %s' % (index,ordered[index]))
        
        if index > max_index: max_index = index
        ordered[index] = info;
    
    combined = __combineHeaders(ordered,max_index)
    return combined

    
def __combineHeaders(ordered,max_index):
    current_msg=''
    current_expected_len=0

    messages = []
    def __appendMsg(message_str):
        #print "message_str: %s" % message_str;
        try:
            msg = simplejson.loads(unicode(message_str, errors='ignore'))
            messages.append(msg)
        except Exception, e:
             print "Error decoding log: %s" % e;
    
    for i, info in enumerate(ordered):
        if not info:
            if i<=max_index: print '\nFirePHP.py: Warning - missing header, index: %d' % i
            continue;
        
        #simple one header message
        if not 'multiline' in info and not 'length' in info:
            if current_msg or current_expected_len:
                # xxx ACRE-1088 - we are generating bad headers often - comment out this line till fixed
                raise Exception('FirePHP.py: BAD STATE, currently in multiline mode but got single line msg.\ncurrent_msg: '+current_msg+'\n')
                print ('FirePHP.py: BAD STATE, currently in multiline mode but got single line msg.\ncurrent_msg: '+current_msg+'\n')
                continue;
            __appendMsg(info['body'])
        else:
            if 'length' in info and info['length']:
                current_expected_len = info['length']
            current_msg += info['body']
            if len(current_msg) == current_expected_len:
                __appendMsg(current_msg)
                current_msg=''
                current_expected_len=0
    return messages


# dump test headers with:
# APP=http://api.qatests.apps.freebase.dev.sandbox-freebaseapps.com/log?TEST_MESSAGE
# curl --header x-acre-enable-log:true --HEAD $APP -o FirePHP-test.txt
if __name__ == '__main__':
    import fire_php_test
    
    headers = fire_php_test.headers
    log = FirePHP_decode(headers)
    print 'log', log
    if log[2][1] == [u'TEST_MESSAGE']:
        print "\nSelf test OK"
    else:
        print "\nSelf test failed"

    # Use ipython to examine 'log'
    # from IPython.Shell import IPShellEmbed
    # ipshell = IPShellEmbed(); ipshell()
