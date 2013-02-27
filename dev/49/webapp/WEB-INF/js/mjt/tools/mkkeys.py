#!/usr/bin/env python

import os, sys, re
import optparse

options = None

############################################################

def hack_key(m):
    print m.groups()
    host, key = m.groups()
    if host not in options.target_host:
        return ''
    return m.group(0)

def hack_keys(keyjs):
    key_re = re.compile(r"^\s*'(\S+)'\s*:\s*// G\S+\s*'([A-Za-z0-9_-]+)',\s*$", re.M|re.DOTALL)

    #print 'kjs', keyjs

    #print 'zz %r' % key_re.findall(keyjs)

    newjs = 'nojs'
    newjs = key_re.sub(hack_key, keyjs)
    return newjs

############################################################

def main():
    from optparse import OptionParser

    op = OptionParser(usage="%prog [-t target_host] [-u mjt_url] infile outfile")

    op.add_option('-u', '--mjt_url', default=None,
                  dest='mjt_url',
                  help = 'url prefix for mjt files')

    op.add_option('-t', '--target-host', default=[],
                  action='append',
                  dest='target_host',
                  help = 'expected hostname for api keys')

    global options

    options, args = op.parse_args(sys.argv)

    if len(args) != 3:
        op.error("two args needed")
        sys.exit(1)

    _, infile, outfile = args


    if infile == '-':
        inf = sys.stdin
    else:
        inf = open(infile)

    if outfile == '-':
        outf = sys.stdout
    else:
        outf = open(outfile, 'wb')

    outstr = hack_keys(inf.read())
    outf.write(outstr)

############################################################

if __name__ == '__main__':
    main()

