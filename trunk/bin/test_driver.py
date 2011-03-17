
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
OPTIONAL: app is the path to a pre-generated manifest (see below)
"""
import re
import os
import sys
import time
import getopt
import logging
import urllib
import urllib2
import cookielib
import json as simplejson
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
                        
acre_host = os.environ["ACRE_HOST_BASE"]
devel_host = os.environ["ACRE_FREEBASE_SITE_ADDR"]
acre_port = os.environ["ACRE_PORT"]
host_delimiter_path = os.environ["ACRE_HOST_DELIMITER_PATH"]

def gen_manifest(apps):
    # fetch urls for the manifest based on a list of app names
    manifest = {}
    for app in apps:
        manifest[app] = []
        host = app + "." + host_delimiter_path + "." + acre_host + ":" + acre_port
        url = "http://" + host + "/acre/test?mode=discover&output=json"
        try:
            f = urllib2.urlopen(url)
        except:
            sys.stderr.write("error fetching: %s\n" % url)
            raise
        results = simplejson.loads(f.read())
        for t in results['testfiles']:
            manifest[app].append(t['run_url'] + "?output=flatjson")
    return manifest

def drive_apps(apps,color,jsn):
    out = sys.stdout
    total_failures = 0
    total_errors = 0
    total_skips = 0
    total_tests = 0
    test_results = {}
    fail_log = ""
    starttime = time.time()

    # you provided a manifest object (called test_driver.drive_apps)
    if isinstance(apps, dict):
        manifest = apps
    else:
        manifest = gen_manifest(apps)

    # this will login to freebase if the env var is defined
    r = Fetcher(username=os.environ.get("FSTEST_USERNAME"), 
        password=os.environ.get("FSTEST_PASSWORD"),
        api_url=os.environ.get("ACRE_METAWEB_BASE_ADDR"))
    
    for app, test_urls in manifest.iteritems():

        out.write(app + ":\n")
        for test_url in test_urls:
            errors = 0
            skips = 0
            failures = 0
            fetch_starttime = time.time()
            path = test_url.split("/")[3:]
            last = path.pop()
            module = re.split('(\?|.sjs\?)', last)[0]
            if len(path) > 0:
                pack = '/'.join(path)
            else:
                pack = app
            try:
                # fetch test file!
                data = simplejson.loads(r.fetch(test_url))
                [tests, failures, skips, results] = parse_json(pack, module, data)
            except KeyboardInterrupt:
                raise
            except:
                errors = 1
                tests = 1
                results = {\
                  "%s/%s" % (pack, module):\
                  ["ERROR","error fetching url: " +\
                  test_url + "time elapsed: %2.3fs" % (time.time() - fetch_starttime) +\
                  " py_exception: %s %s" % sys.exc_info()[:2]]\
                  } 
            # add results
            test_results = dict(test_results.items() + results.items())
            if failures > 0 or skips > 0 or errors > 0:
                fail_log += "\n" + testoutput(results)
            total_tests += tests
            total_failures += failures
            total_errors += errors 
            total_skips += skips
            out.write(module.ljust(60,'.'))
            if color:
                if failures > 0 or errors > 0:
                    out.write(colors.FAIL)
                else:
                    out.write(colors.OK)
            out.write(" %i/%i" % ((tests - failures - skips - errors), tests))
            if color:
                out.write(colors.RESET)
            out.write("\n")
         
    ret = 0
    out.write("\n")
    out.write("Total: ")
    if color:
        if total_failures > 0 or total_errors > 0:
            out.write(colors.FAIL)
        else: 
            out.write(colors.OK)
    out.write("%i/%i" % ((total_tests - total_failures - total_skips - total_errors), total_tests))
    if total_failures > 0: 
        ret = 1
    if color:
        out.write(colors.RESET)
    out.write("\n")
    if total_tests == 0:
        out.write("\nWARNING: no tests were found or run\n")
        ret = 1
    if fail_log: 
        out.write(fail_log + "\n")

    if jsn:
        out.write("\nJSON OUTPUT:\n")
        joutput = {
            "host": "%s:%s" % (acre_host, acre_port),
            "passed":(total_tests - total_failures - total_skips),
            "failed":total_failures,
            "errors":total_errors,
            "skipped":total_skips,
            "elapsed": time.time() - starttime,
            "testresults":test_results
        }
        out.write("json=%s\n" % simplejson.dumps(joutput))
    return ret

def testoutput(results):
    output = ""
    for t, r in results.iteritems():
        output += "%s: %s\n" % (r[0], t)
        output += "  %s\n" % r[1]
    return output

def parse_json(pack, module, data):
    results = {}
    failures = int(data.get("failures"))
    tests = int(data.get("total"))
    skips = int(data.get("skips"))
    for t in data['tests']:
       name = "%s/%s:%s" % (pack, module, t['name'])
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

class Fetcher:

    def __init__(self, username=None, password=None, api_url=None):
        self.username=username
        self.password=password
        self.api_url=api_url
        if username: self.login()

    def login(self):
        username = self.username
        password = self.password
        host = self.api_url
        self.cookiefile = "./cookies.lwp"
        self.cookiejar = cookielib.LWPCookieJar()
        self.opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self.cookiejar))
        urllib2.install_opener(self.opener)
        data = urllib.urlencode({ "username":username, "password":password, 'mw_cookie_scope':'domain' })
        url = "http://%s/api/account/login?%s" % (host, data)
        request = urllib2.Request(url)
        self.cookiejar.add_cookie_header(request)
        respobj = urllib2.urlopen(request)
        respdata = respobj.read()
        cookies = self.cookiejar.make_cookies(respobj, request)

    def logout(self):
        data = urllib.urlencode({ 'mw_cookie_scope':'domain' })
        logout_url = "%s/api/account/logout?%s" % (self.api_url, data)
        response = self.request_url(logout_url)

    def fetch(self, url):
        request = urllib2.Request(url)
        if hasattr(self, 'cookiejar'): 
            self.cookiejar.add_cookie_header(request)
            return self.opener.open(request).read()
        else:
            request = urllib2.urlopen(url)
            return request.read()

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

