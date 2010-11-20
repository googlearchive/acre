/*

<static> acre.urlfetch(method, url, content, content_type)
allows an acre script to fetch data from an external url. this may not be part of the standard api, we will probably want to restrict which urls are available to prevent abuse. note that response.body is a javascript string, which means it has already been decoded. there are bugs in this process, because we don't sniff for here. returns a response object, e.g.: { status: 200, headers: { content-length: "14", content-type: "text/plain; charset=UTF-8", }, content_type: "text/plain", body: "hocus.\npocus.\n" } XXX method should be second arg instead of first, default to GET

Parameters:
method
url
content
content_type 

*/

// This unescapes the query string, passes the result to acre.urlfetch,
// and returns the result.

var params = acre.environ.params;

status = params["status"];
content_type = params["content_type"];
query = params["q"];
method = params["method"] ? params["method"] : "GET";
url  = params["url"];

if ( String(status) == "undefined" ) {
    status = "200";
}

if ( String(content_type) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}
    

acre.response.status = status;
acre.response.headers['content-type'] = content_type;

console.info( "Attempting to fetch url:" + url );

r = {};

try {
  response = acre.urlfetch(url, "GET");
  console.info("typeof response: " + typeof response);
  r['message'] = "no exception thrown";
  for ( p in response ) {
    r[p]  = response[p];
  }
 } catch (e) {
 for ( p in e ) {
    r[p] = e[p];
  }
  console.info( "Caught an exception trying to get or read urlfetch response:\n");
}

acre.write( JSON.stringify(r));

