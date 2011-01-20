#!/usr/bin/env python

import os, sys, urlparse, getopt

from metaweb_services import MetawebServicesBundle
from acreapp import OnDiskAcreApp, InGraphAcreApp

def error(msg):
    print >> sys.stderr, msg
    sys.exit(1);

def usage():
    print >> sys.stderr, """Usage: %s [-u user] [-p password] [-f] [-l] [-i] source [dest]

where the parameters are:

    source - the acre app to be copied 
    dest - the destination to copy the app to
    
The URL are of the form:
    
    freebase://username:password@freebase_api_server/app_id
    
for example

    freebase://bob:secure@sandbox-freebase.com/user/bob/example
    
and the options mean:

    -u
        the username to use (if not specified in the URL)
        
    -p
        the password associated to the given username (if not specified in the URL) 
        
    -l
        don't do anything, just show what would occur (defaults to 'no')

    -i
        ask confirmation before merging if there are conflicts (defaults to 'no')

    -f
        automatically override everything (defaults to 'no')

    """ % sys.argv[0]

# fulhack so that we can use urlparse for freebase:///
urlparse.uses_netloc.append('freebase')

if __name__ == "__main__":
    opts, leftover = getopt.getopt(sys.argv[1:], "ifhlu:p:")
    if len(leftover) == 0 or len(leftover) > 2:
        usage()
        sys.exit(1)

    force = False
    list_only = False
    username = None
    password = None
    interactive = True

    for a in opts:
        if a[0] == '-f':
            force = True
        elif a[0] == '-u':
            username = a[1]
        elif a[0] == '-p':
            password = a[1]
        elif a[0] == '-l':
            list_only = True
        elif a[0] == '-i':
            interactive = True
        elif a[0] == '-h':
            usage()
            sys.exit(0)

    try:
        in_app = urlparse.urlparse(leftover[0])
    except:
        error("%s is not a valid Acre app" % leftover[0])
                
    try:
        out_app = urlparse.urlparse(leftover[1])
    except IndexError, e:
        out_app = urlparse.ParseResult('','',in_app.path.split('/')[-1],'','','')

    if in_app.scheme != "" and in_app.scheme != "freebase":
        error("%s is not a valid acre URL" % leftover[0])

    if out_app.scheme != "" and out_app.scheme != "freebase":
        error("%s is not a valid acre URL" % leftover[1])
        
    if in_app.scheme == "" and in_app.scheme == out_app.scheme:
        error("You must specify at least one URL")
        
    if in_app.netloc:
        username = in_app.username or username
        password = in_app.password or password
        msb = MetawebServicesBundle(in_app.netloc, None, username, password)
        in_app = InGraphAcreApp(in_app.path, msb)
    else:
        in_app = OnDiskAcreApp(in_app.path, None)
        #XXX: why was this here? in_app.metadata['graph_host'] = 'trunk.qa.metaweb.com'
        in_app.msb = MetawebServicesBundle(in_app.metadata['graph_host'], None,
                                    username, password)

    # XXX out_app should preferbly be an instance of AcreApp, for now we use 	 
    # this hack. 	 
    if out_app.scheme != 'freebase':
        in_app.to_disk(out_app.path, force)
    else:
        username = out_app.username or username
        password = out_app.password or password
        omsb = MetawebServicesBundle(out_app.netloc, None, username, password)
        in_app.to_graph(out_app.path, omsb, list_only, interactive)
