// this script has no call to start_response - acre should set decent
// default values.



var result = {};

try {
  result = { "result":"PASS", "message":"no error message thrown" };

} catch(e) {
  for ( p in e ) {
    result[p] = e[p];
  }
}

acre.write(JSON.stringify(result));




