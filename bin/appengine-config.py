#!/usr/bin/python

import os, re, pdb, shutil, subprocess
from optparse import OptionParser

IN_DIR = 'webapp/META-INF'
IN_SUFFIX = '.in'

class ConfigParser:
  '''
  Implements <config_file>.in --> <config_file> conversion.
  Given a .in file, it will substitute all @VAR@ strings with the
  corresponding environment variable

  '''

  IGNORED_PARAMS = ['ACRE_LOGDIR', 'ACRE_DATADIR', 'ACRE_JSLOGS', 'ACRE_SERVICE_ADDR', 'HTTP_PROXY_HOST', 'HTTP_PROXY_PORT', 'ACRE_ACCESSLOGS']


  def __init__(self, directory, filename):
    self.full_path = os.path.join(directory, filename)
    self.filename = filename

  def env_var(self, matchobj):
    
    k = matchobj.groups(0)[0]

    if k in self.IGNORED_PARAMS:
        return ''

    if os.environ.get(k):
        return os.environ[k]
    
    print "No value found for variable %s in %s" % (k, self.full_path)
    return '\'\''

  def convert(self):
    #read the source file
    fd = open(self.full_path)
    buf = []
    #substitute @VAR@ line by line
    for line in fd.readlines():
        buf.append(re.sub('\@([^\@]+)\@', self.env_var, line))

    buf.append('\n')
    fd.close()

    #write the results to the same filename without the .in
    fd = open(self.full_path[:-len(IN_SUFFIX)], 'w')
    fd.write(''.join(buf))
    fd.close()

    print 'Processed file %s' % self.full_path


def copy_external_configuration_files(options):

  #copy necessary configuration files from the alternate config directory
  #this is used for private configuration 

  if options.config and options.directory:
    if not os.path.isdir(options.directory):
        print 'ERROR: specified directory %s does not exist'
        exit(-1)

    f = os.path.join(options.directory, 'appengine-web.%s.xml' % options.config)
    if os.path.exists(f):
        shutil.copy(f, 'webapp/WEB-INF/appengine-web.xml')

    f = os.path.join(options.directory, 'ots.%s.conf.in' % options.config)
    if os.path.exists(f):
        shutil.copy(f, 'webapp/META-INF/ots.external.conf.in')


  return True

def modify_config_params():

  if os.path.isdir(os.path.join(os.getcwd(), '.svn')):
      cmd = ['svn', 'info']
  elif os.path.isdir(os.path.join(os.getcwd(), '.git')):
      cmd = ['git', 'svn', 'info']

  stdout, stderr = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()

  ver = []
  if stdout:
      for line in stdout.split('\n'):
          m = re.match('URL: (.*)', line)
          if m:
            ver.append('/'.join(m.group(1).split('/')[4:]))
              
          m = re.match('Revision: (\d+)', line)
          if m:
            ver.append(m.group(1))

  ver = ':'.join(ver)
      
  os.environ['ACRE_VERSION'] = ver
  return True

def create_configuration_files():

  #for every .in file, produce the equivalient .conf file without the .in
  for filename in [x for x in os.listdir(IN_DIR) if x.endswith(IN_SUFFIX)]:
    parser = ConfigParser(IN_DIR, filename)
    parser.convert()

  return True

#parse -c and -d command line options

parser = OptionParser()
parser.add_option('-c', '--config', dest='config', default=None,
                    help='the configuration group you want - e.g. acre')
parser.add_option('-d', '--dir', dest='directory', default=None,
                    help='the directory where configuration files are located')

(options, args) = parser.parse_args()


######### 3 steps ########

#Step 1: copy any external configuration files from private directories into the acre tree
copy_external_configuration_files(options)


#Step 2: evaluate any configuration values that need to be calculated at build time
modify_config_params()

#Step 3: Create configuration files under webapp/META-INF from their source .in files
create_configuration_files()





