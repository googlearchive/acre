# Introduction #

Say you have this javascript code

```
try {
  try {
    log("throwing");
    throw "whatever"
  } catch (e) {
    log("caught: " + e);
    log("throwing inside the catch");
    throw "something else";
  } finally {
    log("in finally")
  }
} catch (ee) {
  log("caught externally: " + ee);
}
```

The output of this program, according to the javascript language specification, should be be this

```
throwing
caught: whatever
throwing inside the catch
in finally
caught externally: something else
```

which is exactly what V8/node.js and Rhino do. In Acre, unfortunately, the output is this (same code, just different implementation of the log function)

```
throwing
caught: whatever
throwing inside the catch
caught externally: something else
```

Only one difference, but it's an important one: the "finally" block is never reached if an exception is thrown inside a catch block.

One way around it is to force another try/catch statement inside the catch block, one that doesn't need a finally block. That way, even if an exception gets raised inside a catch block, it's caught and finally is called, like this

```
try {
  try {
    log("throwing");
    throw "whatever"
  } catch (e) {
    try {
      log("caught: " + e);
      log("throwing inside the catch");
      throw "something else";
    } catch (e) {
      log("exception in catch: " + e);
    }
  } finally {
    log("in finally")
  }
} catch (ee) {
  log("caught externally: " + ee);
}
```

One day we'll get around to finding out why this happens in Acre and not in Rhino and fix it, but for now I just wanted to pass along this info since it is a rare situation but it would be very easy to trip on it by accident and one never thinks that the interpreter is doing something wrong and not your code.