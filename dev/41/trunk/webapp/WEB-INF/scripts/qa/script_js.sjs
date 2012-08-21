// This is a static file that should just pass through and not be evaluated.


function add( array ) {
  if (! (array instanceof Array) ) {
    return "input must be an array";
  } else {
    rc = 0;
    for ( p in array ) {
      rc +=  Number(array[p]);
    }
  }
  return rc;
}

var static_js_local_var = "PASS";

static_js_global_var = "PASS";




