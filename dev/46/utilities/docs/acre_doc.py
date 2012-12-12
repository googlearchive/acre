#!/usr/bin/env python

import json
import optparse

class AcreDoc:
  """produces a flattened doc from acre json.

   the acre json was derived from our acreassist code
   but we are now forking that data and checking it in.
   ./api_acre.json
   that will be the seed data for producing docs for 
   the time being. For the record it came from here:
   http://acreassist.dfhuynh.user.dev.freebaseapps.com/json

   that source file is heirarchical. this was suitable for
   the acre assist logic, but not useful for a doc format.
   we will keep the source file in case we have need for it.
   I did add one element to make it easier to find stuff, 
   a fully qualified "id" for each "member" called "fqid".
   for generating documentation, we flatten it and create a 
   simple sorted index of all the acre modules and the
   functions/attributes that have doc data.
   
   sub-class AcreDoc to produce different doc formats.
  """
  
  def __init__(self, path):
    self.modules = {}
    jsn = open(path).read()
    self.data = json.loads(jsn)
    self.sortedkeys = []
 
  def produce_doc_data(self): 
    self.recurse(None, self.data)
    mods = []
    for k in self.modules:
      mods.append(k)
    def loweretc(item):
      # ignore case, and periods
      item = item.lower()
      return item.replace('.','')
    self.sortedkeys = sorted(mods, key=loweretc)

  def produce_output(self):
    self.produce_doc_data()
    
    self.output_header()
    for mod in self.sortedkeys:
      self.output_modheader(mod)
      for k, v in self.modules[mod].iteritems():
        self.output_member(k, v)
    self.output_footer()

  def enhance_json(self):
    """output of acreassist app, add 'fqid'."""
    a.recurse(None, a.data)
    print json.dumps(a.data, indent=2)

  def recurse(self, id, obj):
    typ = obj.get('type')
    mems = obj.get('members') 
    if typ == 'module':
      this_module = {}
      for k, v in mems.iteritems():
        if id is None: 
          passedid = k
        else:
          passedid = id + '.' + k
        # while we're here let's add the 
        # fully qualified id into the src data
        mems[k]['fqid'] = passedid
        ret = self.recurse(passedid, v)
        # add it to the output
        if ret: this_module[passedid] = ret
      if this_module and id:
        self.modules[str(id)] = this_module
    else:
      return obj
   
  # subclass and override...
  def output_header(self):
    pass

  def output_footer(self):
    pass

  def output_member(self, name, obj): 
    names = name.split('.')
    if obj.get('type') == 'function':
      self.output_func(names.pop(), obj)
    else:
      self.output_other(names.pop(), obj)

  def output_modheader(self, mod): 
    pass

  def output_func(self, name, obj):
    pass

  def output_other(self, name, obj):
    pass 

class AcreWikiDoc(AcreDoc):
  
  def __init__(self, path):
    AcreDoc.__init__(self, path)
 
  def output_header(self):
    pass   

  def output_footer(self):
    pass

  def output_modheader(self, mod): 
    print '== %s ==' % mod

  def output_func(self, name, obj):
    if obj.get('deprecated'):
      name += '<span style="color:red"> (DEPRECATED)</span>'
    desc = obj.get('description', 'No Description')
    top = "\n'''%s''' function(" % name
    ul = ''
    for param in obj['paramInfo']:
      pname = '<span style="color:green;font-weight:bold">%s</span>' % param['name']
      top += pname + ', '
      optional = 'optional'
      if param.get('optional'): optional = 'required'
      ul += '* %s (%s, %s) - %s\n' % \
        (pname, param['type'], optional, param['description'])

    top = top.rstrip(', ') + ')'
    output = top + "\n\n''" + desc + "''\n" + ul.rstrip()
    print output

  def output_other(self, name, obj):
    if obj.get('deprecated'):
      name += '<span style="color:red"> (DEPRECATED)</span>'
    desc = obj.get('description', 'No Description')
    output = "\n'''%s''' %s\n\n''%s''" % (name, obj.get('type'), desc)
    print output
  
class colors:
  GREEN  = '\033[92m'
  RED  = '\033[91m'
  CYAN  = '\033[96m'
  MAGENTA  = '\033[95m'
  RESET = '\033[0m'

class AcreTxtDoc(AcreDoc):
  
  def __init__(self, path):
    AcreDoc.__init__(self, path)
 
  def output_header(self):
    
    print colors.GREEN + "+--------------------+"
    print "+ Acre API Reference +"   
    print "+--------------------+" + colors.RESET

  def output_footer(self):
    pass

  def output_modheader(self, mod): 
    print colors.MAGENTA + mod + colors.RESET + ':'

  def output_func(self, name, obj):
    name = colors.GREEN + name + colors.RESET
    if obj.get('deprecated'):
      name += colors.RED + ' (DEPRECATED)' + colors.RESET
    desc = obj.get('description', 'No Description')
    top = '  %s function(' % name
    ul = ''
    for param in obj['paramInfo']:
      pname = colors.CYAN + param['name'] + colors.RESET
      top += pname + ', '
      optional = 'optional'
      if param.get('optional'): optional = 'required'
      ul += '    * %s (%s, %s) - %s\n' % \
        (pname, param['type'], optional, param['description'])

    top = top.rstrip(', ') + ')'
    output = top + '\n  ' + desc + '\n' + ul.rstrip()
    print output

  def output_other(self, name, obj):
    name = colors.GREEN + name + colors.RESET
    if obj.get('deprecated'):
      name += colors.RED + ' (DEPRECATED)' + colors.RESET
    output = '  %s %s\n  %s' % (name, obj.get('type'), obj.get('description'))
    print output
  

if __name__ == "__main__":
  parser = optparse.OptionParser('usage: %prog [options] filepath')
  parser.add_option('-f', '--format', dest='format', default='ANSI',
                    help='specify an output format (wiki|ANSI) default is ANSI text')

  (options, args) = parser.parse_args()

  print options.format
  if len(args) !=1:
    parser.error('this program takes one argument: the json file path')
  if options.format == 'wiki':
    a = AcreWikiDoc(args[0])
  elif options.format == 'ANSI':
    a = AcreTxtDoc(args[0])
  else:
    parser.error('invalid format option')
  a.produce_output()


