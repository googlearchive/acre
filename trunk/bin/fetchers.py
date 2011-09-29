import os
import sys
import time
import logging
import urllib
import urllib2
import cookielib
import json as simplejson
import socket
try:
  # I'll complain later if you really need this
  from selenium import webdriver
  from selenium import common
except ImportError:
  pass
# global socket timeout, seemed to help with a weird connection reset issue in appengine
socket.setdefaulttimeout(140)

logger = logging.getLogger('tst')

#-----------------------------------------------------------------------#

TEST_TIMEOUT = 120
devel_host = os.environ["ACRE_FREEBASE_SITE_ADDR"]
devel_port = os.environ["ACRE_FREEBASE_SITE_ADDR_PORT"]

class QunitFetcher:

  def __init__(self, browser='chrome', selenium_rh=None):
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

  def quit(self):
    self.driver.quit()

  def cleanup(self):
    self.quit()
  def fetchtest(self, pack, module, test_url):
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
    return [tests, failures, 0, results]

class AcreFetcher:

  def __init__(self, username=None, password=None, api_url=None):
    if not username: username = os.environ.get("FSTEST_USERNAME")
    if not password: password = os.environ.get("FSTEST_PASSWORD")
    if not api_url: api_url = os.environ.get("ACRE_METAWEB_BASE_ADDR")
    self.username=username
    self.password=password
    self.api_url=api_url
    #if username: self.login()

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

  def fetchtest(self, pack, module, test_url):
    i = 0
    max_retry = 5
    while i <= max_retry:
      i+=1
      try:
        data = simplejson.loads(self.fetch(test_url))
        return parse_json(pack, module, data)
      except socket.error:
        print "WARN: error fetching (%s) %s" % (i, module)
        if i > max_retry: raise
        time.sleep(10)


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
  return tests, failures, skips, results
