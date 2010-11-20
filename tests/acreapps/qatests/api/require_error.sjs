/**
  *
  *  require_error:  negative test cases
  *
  */


// This script looks for an parameter named "url" in the query string.
// It passes the value to acre.require.


var params = acre.environ.params;
var url = params['url']

var result = { "description": "trying to load " + url };

if ( String(params["status"]) == "undefined" ) {
    status = "200";
}

if (String(params["content_type"]) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}

console.log( "loading file:" + url );

var result; 
var rc;

try { 
   rc = acre.require(  url );
   console.log( "acre.require returned " + rc +"\n");
   result['result'] = "FAIL";
   
   result['message'] = "acre.require did not throw an expected exception.  return value: " + rc;
} catch (e) {
  result['result'] = "PASS - an exception was caught:" + e;
  for ( p in e ) {
     console.log( "exception: " + p +": " + e[p]+"\n" );
     result[p] = e[p];
  }
}


console.log( "acre.require returned " + rc +"\n");

  acre.response.status = status;
  acre.response.headers['content-type'] = content_type;

acre.write( JSON.stringify(result) +"\n" );


