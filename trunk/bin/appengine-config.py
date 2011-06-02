#!/usr/bin/python

import os, re, pdb, shutil, subprocess
from optparse import OptionParser

IN_SUFFIX = '.in'

class ConfigParser:
  '''
  Implements <config_file>.in --> <config_file> conversion.
  Given a .in file, it will substitute all @VAR@ strings with the
  corresponding environment variable

  '''

  #list of acre config parameters that are irrelevant to App Engine Acre
  IGNORED_PARAMS = ['ACRE_LOGDIR', 'ACRE_DATADIR', 'ACRE_JSLOGS', 'ACRE_SERVICE_ADDR', 'HTTP_PROXY_HOST', 'HTTP_PROXY_PORT', 'ACRE_ACCESSLOGS']


  def __init__(self, directory, filename):
    self.full_path = os.path.join(directory, filename)
    self.filename = filename

  def env_var(self, matchobj):
    '''
    regex substitution callback
    will substitute the string matched with the environment variable of the same name
    '''
    
    k = matchobj.groups(0)[0]

    if k in self.IGNORED_PARAMS:
        return ''

    if os.environ.get(k):
        print '%s: %s' % (k, os.environ[k])
        return os.environ[k]
    
    print "No value found for variable %s in %s" % (k, self.full_path)
    return ""

  def convert(self):
    '''read the file given in the constructor and 
    substitute any occurance of the pattern @<PARAM_NAME>@ 
    Finally, spit-out the same filename without the suffix .in
    '''

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


def copy_configuration_files(options):

  #copy necessary configuration files from the alternate config directory
  #this is used for private configuration 

  #if a directory and target where specified in the command line, use them
  if options.config and options.directory:
    if not os.path.isdir(options.directory):
        print 'ERROR: specified directory %s does not exist' % options.directory
        exit(-1)


    for source_target in [('ots.%s.conf.in', 'ots.other.conf.in'), ('private.%s.conf.in', 'private.conf.in')]:
      f = os.path.join(options.directory, source_target[0] % options.config)
      if os.path.exists(f):
        target = 'webapp/META-INF/%s' % source_target[1]
        if os.path.exists(target):
          os.chmod(target, 0777)
        shutil.copy(f, target)
        print 'Copied %s to %s' % (f, target)


    #these two files require a default
    for source_target in [('appengine-web.%s.xml.in', 'appengine-web.xml.in'), ('web.%s.xml.in', 'web.xml.in'), ('cron.%s.xml.in', 'cron.xml.in')]:

      target = 'webapp/WEB-INF/%s' % source_target[1]
      if os.path.exists(target):
        os.chmod(target, 0777)

      f = os.path.join(options.directory, source_target[0] % options.config)
      if os.path.exists(f):
        shutil.copy(f, target)
        print 'Copied %s to %s' % (f, target)
      else:
        f = 'webapp/WEB-INF/%s' % (source_target[0] % 'default')
        shutil.copy(f, target)
        print 'Copied %s to %s' % (f, target)
      

  #no directory and target specified, use the default 
  #only do this for appengine-web.xml - no default ots (there is one already in the standard checkout)
  else:

    for source_target in [('appengine-web.default.xml.in', 'appengine-web.xml.in'), ('web.default.xml.in', 'web.xml.in'), ('cron.default.xml.in', 'cron.xml.in')]:
      target = 'webapp/WEB-INF/%s' % source_target[1]
      if os.path.exists(target):
        os.chmod(target, 0777)

      f = 'webapp/WEB-INF/%s' % source_target[0]
      shutil.copy(f, target)
      print 'Copied %s to %s' % (f, target)

    for ots_file in ['ots.other.conf.in', 'ots.other.conf']:
      f = 'webapp/META-INF/%s' % ots_file
      if os.path.exists(f):
        os.chmod(f, 0777)
        os.remove(f)


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

def create_configuration_files(dir):

  #for every .in file, produce the equivalent .conf file without the .in
  for filename in [x for x in os.listdir(dir) if x.endswith(IN_SUFFIX) and not x.endswith(".default.xml" + IN_SUFFIX)]:
    parser = ConfigParser(dir, filename)
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

#Step 1: copy any configuration files from private directories into the acre tree
copy_configuration_files(options)

#Step 2: evaluate any configuration values that need to be calculated at build time
modify_config_params()

#Step 3: Create configuration files from their source .in files
create_configuration_files("webapp/META-INF")
create_configuration_files("webapp/WEB-INF")





