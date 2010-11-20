// This unescapes the query string, passes the result to acre.urlfetch,
// and returns the result.

var params = acre.environ.params;

status = params["status"];
content_type = params["content_type"];
url  = params["url"];
method = params["method"] ? params["method"] : "GET";
headers = params["headers"];
params=params["params"];

if ( String(status) == "undefined" ) {
    status = "200";
}

if ( String(content_type) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}

acre.response.status = status;
acre.response.headers['content-type'] = content_type;

console.info( "Calling acre.urlfetch with no url" );

r = {};

try {
  response = acre.urlfetch();
  console.info("typeof response: " + typeof response);
  r['result']="FAIL";
  r['message'] = "expected an exception, but none was thrown."
  
} catch (e) {
  for ( p in e ) {
    r[p] = e[p];
  }
 
}

acre.write( JSON.stringify(r));

