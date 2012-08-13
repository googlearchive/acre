import fetchers
import os
import re
import sys
import traceback
import time
import logging
import json as simplejson
logger = logging.getLogger('tst')

# Copyright 2012, Google Inc.
# Licensed under the Apache V2.0 License. See:
# http://code.google.com/p/acre/source/browse/trunk/LICENSE

class colors:
  OK  = '\033[92m'
  FAIL  = '\033[91m'
  RESET = '\033[0m'

#-----------------------------------------------------------------------#

acre_host = os.environ["ACRE_HOST_BASE"]
acre_port = os.environ["ACRE_PORT"]

def drive_apps(manifest, opts):
  test_type = opts.test_type
  jsn = False
  color = True
  if opts.nocolor: color = False
  if opts.jsn: jsn = True
  out = sys.stdout
  total_failures = 0
  total_errors = 0
  total_skips = 0
  total_tests = 0
  test_results = {}
  fail_log = ""
  starttime = time.time()

  if test_type == 'qunit':
    tester = fetchers.QunitFetcher(browser=opts.browser, selenium_rh=opts.selenium_rh)
  elif test_type == 'unittest':
    if opts.browser:
      tester = fetchers.UnittestFetcher(browser=opts.browser, selenium_rh=opts.selenium_rh)
    else:
      tester = fetchers.UnittestFetcher()
  else:
    tester = fetchers.AcreFetcher()
  
  for app, test_paths in manifest.iteritems():
    out.write(app + ":\n")
    for test_path in test_paths:
      errors = 0
      skips = 0
      failures = 0
      fetch_starttime = time.time()
      tester.set_module(app, test_path)
      try:
        logger.debug('fetching url: %s' % test_path)
        [tests, failures, skips, errors, results] = tester.run_test()
      except KeyboardInterrupt:
        raise
      except:
        # TODO: I don't want any exception to interrupt the test run
        # however, I should add specific exceptions
        errors = 1
        tests = 1
        results = {\
          "%s/%s" % (tester.pack, tester.module):\
                   ["ERROR","exception running test: " +\
          test_path + " time elapsed: %2.3fs" % (time.time() - fetch_starttime) +\
          " py_exception: %s" % traceback.format_exc()]\
          }

      # add results
      test_results = dict(test_results.items() + results.items())
      if failures > 0 or skips > 0 or errors > 0:
        fail_log += "\n" + testoutput(results)
      total_tests += tests
      total_failures += failures
      total_errors += errors
      total_skips += skips
      out.write(" ")
      out.write(tester.module.ljust(60,'.'))
      if color:
        if failures > 0 or errors > 0:
          out.write(colors.FAIL)
        else:
          out.write(colors.OK)
      out.write(" %i/%i" % ((tests - failures - skips - errors), tests))
      if color:
        out.write(colors.RESET)
      out.write("\n")
    # for test_path
  # for app, test_path
  tester.cleanup()
  ret = 0
  out.write("\n")
  out.write("Total: ")
  if color:
    if total_failures > 0 or total_errors > 0:
      out.write(colors.FAIL)
    else:
      out.write(colors.OK)
  out.write("%i/%i" % ((total_tests - total_failures - total_skips - total_errors), total_tests))
  if total_failures > 0 or total_errors > 0:
    ret = 1
  if color:
    out.write(colors.RESET)
  out.write("\n")
  if total_tests == 0:
    out.write("\nWARNING: no tests were found or run\n")
    ret = 1
  if fail_log:
    out.write(fail_log + "\n")

  if jsn:
    out.write("\nJSON OUTPUT:\n")
    joutput = {
      "host": "%s:%s" % (acre_host, acre_port),
      "passed":(total_tests - total_failures - total_skips),
      "failed":total_failures,
      "errors":total_errors,
      "skipped":total_skips,
      "elapsed": time.time() - starttime,
      "testresults":test_results
    }
    out.write("json=%s\n" % simplejson.dumps(joutput))
  return ret

def testoutput(results):
  output = ""
  for t, r in results.iteritems():
    output += "%s: %s\n" % (r[0], t)
    output += "  %s\n" % r[1]
  return output
