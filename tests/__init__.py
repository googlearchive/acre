
import unittest
import time
import sys

class AcreTestProgram(unittest.TestProgram):
  """Stripped down unittest TestProgram."""

  def runTests(self):
    self.testRunner = AcreTestRunner()
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

