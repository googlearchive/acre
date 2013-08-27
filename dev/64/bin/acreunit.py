
import time
import sys

# Copyright 2012, Google Inc.
# Licensed under the Apache V2.0 License. See:
# http://code.google.com/p/acre/source/browse/trunk/LICENSE

class AcreTestException(Exception):
  pass

# let's hope your on python 2.7 which has
# unitest class level setup
if sys.version.startswith('2.7'):
  import unittest
else:
  try:
    import unittest2 as unittest
  except ImportError:
    raise AcreTestException(
      'you need to either install python 2.7, or install' +
      ' unittest2 with easy_install'
    )

class AcreTestProgram(unittest.TestProgram):
  """Stripped down unittest TestProgram.
     optionally pass through webdriver specific args:
     
     browser = which browser to use ('firefox', 'chrome')
     selenium_rh = webdriver remote uri
  """

  def __init__(self, module, argv, **kwargs):
    self.kwargs = kwargs
    unittest.TestProgram.__init__(self, module=module, argv=argv)
    
  def runTests(self):
    self.testRunner = AcreTestRunner()
    # pass additional kwargs to the test class that's being run
    if self.kwargs:
      self.module.TestClass.testrunner_kwargs = self.kwargs
    (self.result, self.timeTaken) = self.testRunner.run(self.test)

class AcreTestRunner:
  """A stripped down unittest TestRunner."""

  def __init__(self, descriptions=1, verbosity=1):
    self.descriptions = descriptions
    self.verbosity = verbosity
 
  def _makeResult(self):
    return unittest.TestResult()

  def run(self, test):
    "Run the given test case or test suite."
    result = self._makeResult()
    startTime = time.time()
    test(result)
    stopTime = time.time()
    timeTaken = stopTime - startTime
    return result, timeTaken

