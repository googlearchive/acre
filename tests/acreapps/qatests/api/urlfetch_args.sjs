/*
<static> acre.urlfetch(url, method, headers, content, params)


*/

// This unescapes the query string, passes the result to acre.urlfetch,
// and returns the result.

var params = acre.environ.params;

status = params["status"];
content_type = params["content_type"];

url  = params["url"];
method = params["method"] ? params["method"] : "GET";
url_headers = params["url_headers"] ?  JSON.parse(params["url_headers"]) : "undefined";
url_params = params["url_params"] ? params["url_params"]: null; 
content = params['content'];

if ( String(status) == "undefined" ) {
    status = "200";
}
if ( String(content_type) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}

if (String(url_headers) == "undefined" ) {
  url_headers = {}
}

acre.response.status = status;
acre.response.headers['content-type'] = content_type;

function log_object( o, name ) {
    console.log( "properties of object " + name );
    for ( p in o ) {
        console.log( p +": " + o[p] + "\n" );
       if (typeof o[p] == "object" ) {
           log_object( o[p], p );
        }
    }
}

console.info( "Attempting to fetch url:" + url  );

response = {};

try {
  query = "acre.urlfetch(\'" + url +"?" + url_params + "\', '" + method +"', " + JSON.stringify(url_headers) +", '"+content+ ")";
  console.info(query);
  response = acre.urlfetch(url+ (url_params ? "?" + url_params : ""), method, url_headers, content);
  console.info("Response: " + JSON.stringify(response) );
// log_object(response, "urlfetch returned a non-error response with these properties:" );
} catch (e) {
  response['result'] = "FAIL";
// log_object(e, "Caught error fetching url." );
  for ( p in e ) {
    response[p] = e[p];
  }
}

acre.write( JSON.stringify(response));



