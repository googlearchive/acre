import cookielib
import json
import logging
import os
import re
import socket
import sys
import time
import urllib
import urllib2

# I'll complain later if you really need these
try:
  from selenium import webdriver
  from selenium import common
except ImportError:
  pass
try:
  # for python unittest driver, make sure acre root is in sys.path
  import tests
except ImportError:
  pass

# global socket timeout, seemed to help with a weird connection reset issue in appengine
socket.setdefaulttimeout(260)

logger = logging.getLogger('tst')

#-----------------------------------------------------------------------#

TEST_TIMEOUT = 240
devel_host = os.environ["ACRE_FREEBASE_SITE_ADDR"]
devel_port = os.environ["ACRE_FREEBASE_SITE_ADDR_PORT"]

class TestRunnerException(Exception):
  pass

flakey_pattern = '(Time limit exceeded|Timeout while fetching|Cannot read property .+ from undefined)'
class FlakeyBackendError(Exception):
  def __init__(self):
    pass
  def __str__(self):
    return 'backend timeout'

def retry(ExceptionToCheck, tries=5, delay=2, backoff=2):
  def deco_retry(f):
    def f_retry(*args, **kwargs):
      mtries, mdelay = tries, delay
      try_one_last_time = True
      while mtries > 1:
        try:
          return f(*args, **kwargs)
          try_one_last_time = False
          break
        except ExceptionToCheck, e:
          logger.warning('%s, Retrying in %d seconds...' % (e, mdelay))
          time.sleep(mdelay)
          mtries -= 1
          mdelay *= backoff
      if try_one_last_time:
        logger.warning('Last retry (%s)...' % tries)
        # let's the function know so it can choose not to raise, if desired
        kwargs['last_retry'] = True
        return f(*args, **kwargs)
      return
    return f_retry # true decorator
  return deco_retry

def selenium_import_test():
  try:
    import selenium
  except ImportError:
    print "failed to import 'selenium' package, have you installed selenium (easy_install)?"
    raise

class QunitFetcher:
  """This runs browser-side qunit tests using selenium, parses output."""

  def __init__(self, browser='chrome', selenium_rh=None):
    selenium_import_test()
    self.drivers = []
    logger.debug('selenium remote: %s' % selenium_rh)
    if browser == 'firefox':
      if selenium_rh:
        self.driver = webdriver.Remote(selenium_rh, 
          webdriver.common.desired_capabilities.DesiredCapabilities.FIREFOX)
      else:
        self.driver = webdriver.Firefox()
      self.browser = 'ff'
    elif browser == 'chrome':
      if selenium_rh:
        self.driver = webdriver.Remote(selenium_rh, 
          webdriver.common.desired_capabilities.DesiredCapabilities.CHROME)
      else:
        self.driver = webdriver.Chrome()
      self.browser = 'ch'
    else:
      print 'we dont currently support that browser name:', browser
      sys.exit(1)
    print 'browser: %s %s' % (\
    self.driver.desired_capabilities.get('browserName'),
    self.driver.desired_capabilities.get('version'))

  def set_module(self, app, test_path):
    self.test_path = test_path
    path = test_path.split("/")[3:]
    last = path.pop()
    self.module = re.split('(\?|.template\?)', last)[0]
    if len(path) > 0:
      self.pack = '/'.join(path)
    else:
      self.pack = app

  def quit(self):
    self.driver.quit()

  def cleanup(self):
    self.quit()
 
  def fetchtest(self):
    test_url = self.test_path
    pack = self.pack
    module = self.module
    driver = self.driver
    try:
      driver.get(test_url)
      # this should show up right away
      container=driver.find_element_by_id('qunit-tests')
      # this signifies all tests are done
      driver.implicitly_wait(TEST_TIMEOUT)
      container=driver.find_element_by_id('qunit-testresult')
      driver.implicitly_wait(1)
    except common.exceptions.NoSuchElementException:
      body = driver.page_source
      # what a server unavailable looks like in various browsers
      if ('Unable to connect' in body or
      'is not available' in body):
        msg = 'server unavailable'
      else:
        msg = 'unknown response:', body[:500]
      tid = '%s/%s' % (pack, module)
      msg = '%s %s' % (test_url, msg)
      return [1, 1, 0, {tid:['ERROR', msg]}]
    # pretty sure some qunit tests ran, so get output
    container=driver.find_element_by_id('qunit-tests')
    testresults=container.find_elements_by_xpath('li')
    tests = 0
    failures = 0
    skips = 0
    results = {}
    for t in testresults:
      name = "%s/%s:%s" % (pack, module,
              t.find_element_by_class_name("test-name").text)
      passed = int(t.find_element_by_class_name("passed").text)
      failed = int(t.find_element_by_class_name("failed").text)
      # there can be many asserts, but I consider it one test
      tests += 1
      if failed > 0:
        failures += 1
        results[name] = ['FAIL', t.text.encode('utf-8')]
    return [tests, failures, 0, 0, results]

class UnittestFetcher:
  """runs test_*py unittest files in the tests package."""

  def __init__(self):
    try:
      import tests
    except ImportError:
      print "failed to import 'tests' package, make sure acre root is in sys.path"
      raise

  def quit(self):
    pass

  def cleanup(self):
    pass
 
  def set_module(self, app, test_path):
    self.test_path = test_path
    self.pack = app
    self.module = test_path

  def fetchtest(self):
    """Run a python unittest.
       see tests/__init__.py
       unittest has the ability to take a module id in the form of
       a string e.g. 'tests.acre_py_tests.test_console' and do the
       importing and running required
    """

    testmod = self.module
    pack = self.pack
    fullmodule = 'tests.%s' % testmod
    r=tests.AcreTestProgram(module=fullmodule, argv=['testrunner'])
    results = {}
    num_errors = 0
    num_skips = 0
    for fail in r.result.failures:
      meth = str(fail[0]).split(' ')[0]
      failure = str(fail[1])
      results['%s.%s.%s' % (pack, testmod, meth)] = ['FAIL', failure]
    for skp in r.result.skipped:
      meth = str(skp[0]).split(' ')[0]
      msg = str(skp[1])
      results['%s.%s.%s' % (pack, testmod, meth)] = ['SKIP', msg]
      num_skips += 1
    for err in r.result.errors:
      meth = str(err[0]).split(' ')[0]
      error = str(err[1])
      results['%s.%s.%s' % (pack, testmod, meth)] = ['ERROR', error]
      num_errors += 1
    return [r.result.testsRun, len(r.result.failures), num_skips,  num_errors, results]

class AcreFetcher:
  """This knows how to run qunit/acre tests and parse results."""

  def __init__(self, username=None, password=None, api_url=None):
    if not username: username = os.environ.get("FSTEST_USERNAME")
    if not password: password = os.environ.get("FSTEST_PASSWORD")
    if not api_url: api_url = os.environ.get("ACRE_METAWEB_BASE_ADDR")
    self.username=username
    self.password=password
    self.api_url=api_url
    #if username: self.login()

  def set_module(self, app, test_path):
    self.test_path = test_path
    path = test_path.split("/")[3:]
    last = path.pop()
    self.module = re.split('(\?|.sjs\?)', last)[0]
    if len(path) > 0:
      self.pack = '/'.join(path)
    else:
      self.pack = app

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
    url = "http://%s:%s/account/signin" % (devel_host, devel_port)
    self.fetch(url)

  def logout(self):
    data = urllib.urlencode({ 'mw_cookie_scope':'domain' })
    logout_url = "%s/api/account/logout?%s" % (self.api_url, data)
    response = self.request_url(logout_url)

  def cleanup(self):
    pass

  @retry(urllib2.URLError)
  # we've had intermittent 104 socket errors with appengine, no clue
  @retry(socket.error)
  # for test error that are identifiably due to flakey backends
  @retry(FlakeyBackendError)
  def fetchtest(self, last_retry=False):
    test_url = self.test_path
    data = self.fetch(test_url)
    results = parse_json(self.pack, self.module, json.loads(data))
    if results[1] > 0:
      if re.search(flakey_pattern, data) and last_retry is False:
        raise FlakeyBackendError
    return results

  def fetch(self, url):
    request = urllib2.Request(url)
    if hasattr(self, 'cookiejar'):
      self.cookiejar.add_cookie_header(request)
      return self.opener.open(request).read()
    else:
      request = urllib2.urlopen(url)
      return request.read()

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
  return tests, failures, skips, 0, results
