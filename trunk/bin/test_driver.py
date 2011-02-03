
__usage__ = """Usage: %(program)s [-l log_level] [-n] [-h] app

Where OPTIONS is one or more of:

    -l,--log
        log level (DEBUG, INFO, WARNING, ERROR)

    -n,--no-color
        avoid using color in output
  
    -j --jsn
        include json output
                
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
    test = urllib2.urlopen(url + "?output=flatjson")
    return simplejson.loads(test.read())
                
def drive_apps(apps,color,jsn):
    out = sys.stdout
    
    acre_host = os.environ["ACRE_HOST_BASE"]
    acre_port = os.environ["ACRE_PORT"]
    host_delimiter_path = os.environ["ACRE_HOST_DELIMITER_PATH"]
    total_failures = 0
    total_skips = 0
    total_tests = 0
    test_results = {}
    fail_log = ""
    starttime = time.time()
    for app in apps:

        host = app + "." + host_delimiter_path + "." + acre_host + ":" + acre_port
        url = "http://" + host + "/acre/test?mode=discover&output=json"
        f = urllib2.urlopen(url)
        results = simplejson.loads(f.read())
        out.write(app + ":\n")
        for t in results['testfiles']:
            test_url = t['run_url']
            test_name = test_url.split("test_")[1].split(".")[0]
            data = drive_test(test_url)
            [tests, failures, skips, results] = parse_json(app, test_name, data)
            # add results
            test_results = dict(test_results.items() + results.items())
            if failures > 0 or skips > 0:
                fail_log += "\n" + testoutput(results)
            total_tests += tests
            total_failures += failures
            total_skips += skips
            out.write(test_name.ljust(40,'.'))
            if color:
                if failures == 0:
                    out.write(colors.OK)
                else:
                    out.write(colors.FAIL)
            out.write(" %i/%i" % ((tests - failures - skips), tests))
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
    out.write("%i/%i" % ((total_tests - total_failures - total_skips), total_tests))
    if total_failures > 0: 
        ret = 1
    if color:
        out.write(colors.RESET)
    out.write("\n")
    if total_tests == 0:
        out.write("\nWARNING: no tests were found or run\n")
        ret = 1
    if fail_log: 
        print fail_log
    if jsn:
        joutput = {
            "passed":(total_tests - total_failures - total_skips),
            "failed":total_failures,
            "skipped":total_skips,
            "elapsed": time.time() - starttime,
            "testresults":test_results
        }
        out.write("\njson=%s\n" % simplejson.dumps(joutput))
    return ret

def testoutput(results):
    output = ""
    for t, r in results.iteritems():
        output += "%s: %s\n" % (r[0], t)
        output += "  %s\n" % r[1]
    return output

def parse_json(app, module, data):
    results = {}
    failures = int(data.get("failures"))
    tests = int(data.get("total"))
    skips = int(data.get("skips"))
    for t in data['tests']:
       name = "%s/%s:%s" % (app, module, t['name'])
       r = t.get("result")
       if r == "pass": continue
       testout = ""
       if r.startswith("skip"):
          results[name] = ["SKIP", r]
          continue
       for l in t['log']:
           res = l.get('result')
           msg = l.get('message')
           if res is True: continue
           if not msg: msg = "fail but no message found"
           testout += "%s\n" % msg
       results[name] = ["FAIL", testout]
    return tests, failures, skips, results

#-----------------------------------------------------------------------# 

def usage(msg=''):

    if msg:
        print >> sys.stderr, msg
        print >> sys.stderr
    print >> sys.stderr, __usage__ % globals()

def main():

    LOG_LEVEL = logging.ERROR
    color = True
    jsn = False
    
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hnjl:", ["help", "no-color", "jsn", "log="])
    except getopt.GetoptError, msg:
        usage(msg)
        sys.exit(1)
        
    if len(args) == 0:
        usage()
        sys.exit(1)
    else:
        apps = args
        
    for o, a in opts:
        if o in ("-h", "--help"):
            usage()
            sys.exit()
        if o in ("-n", "--no-color"):
            color = False
        if o in ("-j", "--jsn"):
            jsn = True
        if o in ("-l", "--log"):
            LOG_LEVEL = eval('logging.' + a)

    logger.setLevel(LOG_LEVEL)
    sys.exit(drive_apps(apps,color,jsn))
    
#-----------------------------------------------------------------------# 

if __name__ == "__main__":
    main()
                
#---------------------------- End of File ------------------------------#

