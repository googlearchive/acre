WILL: This directory is all that's left of Nick's original framework.
      I don't believe any of these files are used,
      but it's worth reviewing them for good ideas

This is a basic test framework for Acre applications.

Some terminology:

the LOADER loads and runs TESTERs using acre.require()
each TESTER:
  loads utility functions from the TLIB (tlib.sjs) using acre.require()
  invokes the TARGET script via http
  checks the response from the TARGET for correctness
  fails or succeeds by logging a message
  exits by falling through or throwing an exception
the LOADER catches exceptions in the TESTER and
generates a JSON http response with the test result.

the TARGET is an arbitrary acre application.  it
may be a real-world app like tippify or an internal
testing app containing unit tests.  the TARGET is
only invoked using http, providing isolation from
the test code.

ideally, the driver would catch exceptions in the tester.
however, rhino's implementation of catch destroys the
exception stack so this is somewhat tricky.

the biggest missing piece here is the ability to run
the tester with a larger quota so that we still have
time/space to handle targets that exhaust their
quota.

there is a browser-based driver in all.mjt.
