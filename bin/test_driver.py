
__usage__ = """Usage: %(program)s [-l log_level] [-n] [-h] app

Where OPTIONS is one or more of:

    -l,--log
        log level (DEBUG, INFO, WARNING, ERROR)

    -n,--no-color
        avoid using color in output
                
    -h,--help
        show usage and exit
        
and 'app' is the name of the app which tests we should drive
NOTE: the name app should be without the '.dev.hostname' ending part
"""

import os
import sys
import time
import getopt
import logging
import urllib2
import simplejson
import socket
# global socket timeout, seemed to help with a weird connection reset issue in appengine
socket.setdefaulttimeout(60)

program = sys.argv[0]

logging.basicConfig()
logger = logging.getLogger("main")
                
class colors:
    OK    = '\033[92m'
    FAIL  = '\033[91m'
    RESET = '\033[0m'

#-----------------------------------------------------------------------# 
                        
def drive_test(url):
    test = urllib2.urlopen(url + "?output=json")
    return simplejson.loads(test.read())
                
def drive_app(app,color):
    out = sys.stdout
    
    acre_host = os.environ["ACRE_HOST_BASE"]
    acre_port = os.environ["ACRE_PORT"]
    host_delimiter_path = os.environ["ACRE_HOST_DELIMITER_PATH"]
    host = app + "." + host_delimiter_path + "." + acre_host + ":" + acre_port
    
    url = "http://" + host + "/acre/test?mode=discover&output=json"
    f = urllib2.urlopen(url)
    results = simplejson.loads(f.read())
    
    total_failures = 0
    total_skips = 0
    total_tests = 0
    fail_log = ""
    
    for t in results['testfiles']:
        test_url = t['run_url']
        data = drive_test(test_url)
        test_results = data['testfiles'][0]
        [tests, failures, skips, output] = check_log(test_results)
        if failures > 0 or skips > 0:
            fail_log += "\n" + output
        total_tests += tests
        total_failures += failures
        total_skips += skips
        test_name = test_url.split("test_")[1].split(".")[0] + " "
        out.write(test_name.ljust(40,'.'))
        if color:
            if failures == 0:
                out.write(colors.OK)
            else:
                out.write(colors.FAIL)
        out.write(" %i/%i" % (tests - failures, tests))
        if color:
            out.write(colors.RESET)
        out.write("\n")
        
    ret = 0
    out.write("\n")
    out.write("Total: ")
    if color:
        if total_failures == 0:
            out.write(colors.OK)
        else: 
            out.write(colors.FAIL)
    out.write("%i/%i" % (total_tests - total_failures, total_tests))
    if total_failures > 0: 
        ret = 1
    if color:
        out.write(colors.RESET)
    out.write("\n")
    if total_tests == 0:
        out.write("\nWARNING: no tests were found or run\n")
        ret = 1
    if fail_log: 
        out.write("\nFAILURES/SKIPS " + ("-" * 65) + "\n")
        print fail_log
    return ret

def check_log(obj):
    out = ""
    tests = 0
    failures = 0
    skips = 0
    for o in obj['modules']:
        mname = o['name']
        if mname == "DEFAULT":
            mname = ""
        else:
            mname = "  [%s]" % mname
        for t in o['tests']:
            testout = ""
            name = t['name']
            for l in t['log']:
                tests += 1
                res = l.get('result')
                msg = l.get('message')
                if not msg: msg = "fail but no message found"
                if res is False or res is None:
                    failures += 1
                    testout += "    %s\n" % msg
                elif res is True:
                    pass
                elif "Skipping test:" in res:
                    skips += 1
                    testout += "    Skipped: %s\n" % msg
            if testout:
                #print "TESTOUT:%s" % testout
                out += "   %s%s:\n%s" % (name, mname, testout)
    if out: out = " " + obj['run_url'] + "\n" + out
    return tests, failures, skips, out

#-----------------------------------------------------------------------# 

def usage(msg=''):

    if msg:
        print >> sys.stderr, msg
        print >> sys.stderr
    print >> sys.stderr, __usage__ % globals()

def main():

    LOG_LEVEL = logging.ERROR
    color = True
    
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hnl:", ["help", "no-color", "log="])
    except getopt.GetoptError, msg:
        usage(msg)
        sys.exit(1)
        
    if not len(args) == 1:
        usage()
        sys.exit(1)
    else:
        app = args[0]
        
    for o, a in opts:
        if o in ("-h", "--help"):
            usage()
            sys.exit()
        if o in ("-n", "--no-color"):
            color = False
        if o in ("-l", "--log"):
            LOG_LEVEL = eval('logging.' + a)

    logger.setLevel(LOG_LEVEL)
    sys.exit(drive_app(app,color))
    
#-----------------------------------------------------------------------# 

if __name__ == "__main__":
    main()
                
#---------------------------- End of File ------------------------------#

