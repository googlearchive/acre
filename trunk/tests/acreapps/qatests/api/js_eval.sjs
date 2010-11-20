// This script looks for an argument named "js" in the query string.
// It passes the value of js to eval and returns the response.

var params = acre.environ.params;

status = params["status"];
headers = params["headers"];
js = params["js"];

var response;
try {
  if ( String(status) == "undefined" ) {
    status = "200";
  }
  if ( String(headers) == "undefined" ) {
    headers  = { "content-type": "text/plain; charset=utf-8"} ;
  } 
  acre.response.status = status;
  acre.response.headers = headers;

  console.log( "EVALUATING STRING: " + js +"\n" );
  response = eval(js);
  console.log( "EVAL(" + js + ") RETURNED: " + response );
  acre.write( response +"\n" );
 } catch (e) {
  console.error("EVAL THREW AN EXCEPTION: " + e );
  r = {};
  for ( p in e ) {
    console.log( "error " + p +":" + e[p] +"\n" );
    r[p] = e[p]
  }
   r = { "result": r };
  acre.write ( JSON.stringify(r));
}

