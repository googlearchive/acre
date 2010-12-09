
__usage__ = """Usage: %(program)s [-l log_level] [-h] app

Where OPTIONS is one or more of:

    -l,--log
        log level (DEBUG, INFO, WARNING, ERROR)
                
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

program = sys.argv[0]

logging.basicConfig()
logger = logging.getLogger("main")
                
class colors:
    OK    = '\033[92m'
    FAIL  = '\033[91m'
    RESET = '\033[0m'

#-----------------------------------------------------------------------# 
                        
def drive_test(url):
    test = urllib2.urlopen(url + "?output=jsonsummary")
    return simplejson.loads(test.read())
                
def drive_app(app):
    out = sys.stdout
    
    acre_host = os.environ["ACRE_HOST_BASE"]
    acre_port = os.environ["ACRE_PORT"]
    host_delimiter_path = os.environ["ACRE_HOST_DELIMITER_PATH"]
    host = app + "." + host_delimiter_path + "." + acre_host + ":" + acre_port
    
    url = "http://" + host + "/acre/test?mode=discover&output=json"
    f = urllib2.urlopen(url)
    results = simplejson.loads(f.read())
    
    total_failures = 0
    total_tests = 0
    
    for t in results['testfiles']:
        test_url = t['run_url']
        test_results = drive_test(test_url)
        tests = test_results['total']
        failures = test_results['failures']
        total_tests += tests
        total_failures += failures
        test_name = test_url.split("test_")[1] + " "
        out.write(test_name.ljust(40,'.'))
        if failures == 0:
            out.write(colors.OK)
        else:
            out.write(colors.FAIL)
        out.write(" %i/%i" % (failures, tests))
        out.write(colors.RESET)
        out.write("\n")
        
    out.write("\n")
    
    out.write("Total: ")
    if total_failures == 0:
        out.write(colors.OK)
    else:
        out.write(colors.FAIL)
    out.write("%i/%i" % (total_failures, total_tests))
    out.write(colors.RESET)
    out.write("\n")
        
#-----------------------------------------------------------------------# 

def usage(msg=''):

    if msg:
        print >> sys.stderr, msg
        print >> sys.stderr
    print >> sys.stderr, __usage__ % globals()

def main():

    LOG_LEVEL = logging.ERROR
 
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hl:", ["help", "log="])
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
        if o in ("-l", "--log"):
            LOG_LEVEL = eval('logging.' + a)

    logger.setLevel(LOG_LEVEL)
                
    drive_app(app)
    
#-----------------------------------------------------------------------# 

if __name__ == "__main__":
    main()
                
#---------------------------- End of File ------------------------------#

