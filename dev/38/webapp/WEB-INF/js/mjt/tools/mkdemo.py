#!/usr/bin/env python
#
#  mkdemo.py takes the html output from rst2html.py
#  and turns each literal text block into a live
#  mjt demo, with source on the left and output
#  on the right.
#
#

import os, sys, re
import optparse
from BeautifulSoup import BeautifulSoup, Tag

from htmlentitydefs import name2codepoint


mjt_url = None

############################################################
#
#  from http://zesty.ca/python/scrape.py:
#

# This pattern matches a character entity reference (a decimal numeric
# references, a hexadecimal numeric reference, or a named reference).
charrefpat = re.compile(r'&(#(\d+|x[\da-fA-F]+)|[\w.:-]+);?')

def htmldecode(text):
    """Decode HTML entities in the given text."""
    if type(text) is unicode:
        uchr = unichr
    else:
        uchr = lambda value: value > 255 and unichr(value) or chr(value)
    def entitydecode(match, uchr=uchr):
        entity = match.group(1)
        if entity.startswith('#x'):
            return uchr(int(entity[2:], 16))
        elif entity.startswith('#'):
            return uchr(int(entity[1:]))
        elif entity in name2codepoint:
            return uchr(name2codepoint[entity])
        else:
            return match.group(0)
    return charrefpat.sub(entitydecode, text)

############################################################


script_includes = [
    # helpful for debugging on ie - should be optional?
    #'/firebuglite/firebug/firebug.js'
    ]

def hack_rst_examples(bs):
    example_index = 1
    for pretag in bs.findAll('pre', {'class':'literal-block'}):
        table = Tag(bs, "table", [('class', 'example')])
        tbody = Tag(bs, "tbody")
        table.insert(0, tbody)
        tr = Tag(bs, "tr")
        tbody.insert(0, tr)
        td = Tag(bs, "td", [('class', 'example_in')])
        tr.insert(0, td)
    
        pretag.replaceWith(table)
        td.insert(0, pretag)
    
        gentag = Tag(bs, "td", [('class', 'example_out')])
    
        tcall = Tag(bs, "span", [('id', ('gen_%d' % example_index))])
        tcall.insert(0, htmldecode(pretag.contents[0]))
    
        gentag.insert(0, tcall)
    
        tr.insert(1, gentag)
        example_index += 1
    
    
    head = bs.html.head
    
    for src in script_includes:
        head.insert(-1, Tag(bs, 'script', [('type', 'text/javascript'),
                                           ('src', src)]))
        
    # now insert some script to execute all the examples
    initscript = Tag(bs, 'script', [('type', 'text/javascript')])
    
    initscript.insert(0, '''
    function run_demos() {
    
    %s
    }
    ''' % ''.join(["mjt.run('gen_%d');\n" % ei for ei in range(1,example_index)]))
    head.insert(-1, initscript)

    bs.html.body.attrs.append(('onload', 'run_demos();'))
    
    print '%d examples found' % (example_index-1)


############################################################

def hack_mjt_urls(bs):
    for tag in bs.findAll('script'):
        if tag.has_key('src'):
            m = re.match(r'^\.\.[\./]*(/.+)$', tag['src'])
            if m:
                print 'TAG %r' % (tag['src'],)
                tag['src'] = mjt_url + m.group(1)
                print 'now %r' % (tag['src'],)


############################################################


def main():
    from optparse import OptionParser

    op = OptionParser(usage="%prog [-u mjt_url] infile outfile")

    op.add_option('-u', '--mjt_url', default=None,
                  dest="mjt_url",
                  help = 'url prefix for mjt files')

    op.add_option('--live-examples', default=False,
                  action='store_true',
                  dest="live_examples",
                  help = 'turn <pre> into live mjt examples')

    options, args = op.parse_args(sys.argv)

    if len(args) != 3:
        op.error("two args needed")
        sys.exit(1)

    _, infile, outfile = args

    bs = BeautifulSoup(open(infile))

    if options.mjt_url:
        global script_includes, mjt_url
        mjt_url = options.mjt_url
        script_includes = [ mjt_url + '/mjt.js' ]

    if options.live_examples:
        hack_rst_examples(bs)

    hack_mjt_urls(bs)

    open(outfile, 'wb').write(str(bs))

############################################################

if __name__ == '__main__':
    main()

