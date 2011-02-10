#!/usr/bin/env python
#
# the script finds tests on disk and looks up the url path (route) for that app
# the output is an input for ./acre testfs
# 
import sys
import os
import json
import urllib2
import re

# assuming we're in the root of acre, find tests in www
base_path = os.path.split(os.path.abspath(os.path.join(__file__,'..')))[0]
www_path = base_path + '/' + \
  'webapp/WEB-INF/scripts/googlecode/freebase-site/svn/trunk/www'

def discover(opts, whitelist):
    params = '?output=flatjson'
    if opts.nomock:
        params += '&mock=0'
    url = "http://environments.svn.freebase-site.googlecode.dev.%s:%s/%s"\
    % (opts.host, opts.port, opts.env)
    try:
        response = urllib2.urlopen(url)
    except:
        sys.stderr.write("error fetching: %s\n" % url)
        sys.stderr.write("perhaps you need to add %s to /etc/hosts?\n\n" % opts.host)
        raise
    data = json.loads(response.read())
    
    apps = {}
    for p in data['prefix']:
        appurl = p.get('app')
        prefix = p.get('prefix')
        if appurl:
            m = re.match('//([^\.]+)\.www[^\/]+(/.*$|$)', appurl)
            if not m: continue
            app = m.groups()[0]
            path = app + m.groups()[1]
            apps[path] = prefix
    
    test_paths = {}
    os.chdir(www_path)
    fls = os.popen("find . -name test_*sjs").read().split('\n')
    manifest = {}
    for f in fls:
        if not f: break
        tfile = f[2:].split('/')
        tapp = tfile[0]
        if whitelist and tapp not in whitelist: continue
        if not manifest.get(tapp):
            manifest[tapp] = []
        tpath = tfile[:len(tfile)-1]
        fl = tfile[len(tfile)-1:][0]
        i = len(tpath)
        found = False
        # start with an exact match then try the parent 
        while i > 0:
            path = '/'.join(tpath[:i])
            remainder = '/'
            if len(tpath) > i:
                remainder = '/' + '/'.join(tpath[i:]) + '/'
            
            i = i - 1
            if apps.get(path):
                #print tpath, path
                found = True
                manifest[tapp].append("http://" + opts.env + ":" +\
                  opts.port + apps[path] + remainder + fl + params)
                #print  apps[path] + remainder + fl + "?output=flatjson"
                break
        if not found: sys.stderr.write("WARN: did not find a route for: %s\n" % f)
    
    ret = json.dumps(manifest, indent=2)
    print ret

from optparse import OptionParser
def main(argv=None):
    if argv is None:
        argv = sys.argv

    usage = "usage: discover_tests.py [--help] optional args are whitelisted apps"
    parser = OptionParser(usage=usage)
    parser.add_option('-n',  dest='host', default="acre.z", help='host base to fetch envs. (default acre.z)')
    parser.add_option('-p',  dest='port', default="8115", help='port (default 8115)')
    parser.add_option('-m',  dest='nomock', action="store_true", help='turn off mockmode')
    parser.add_option('-e',  dest='env', default="devel.sandbox-freebase.com", help='environments file (default devel.sandbox-freebase.com)')
    (opts, args) = parser.parse_args(argv)
    discover(opts, args[1:])
    

if __name__ == '__main__':
    sys.exit(main())

