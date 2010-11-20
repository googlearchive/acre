/*
 * urlfetch an image
 */

var params = acre.request.params;


url  = params["url"];
method = params["method"] ? params["method"] : "GET";
url_headers = params["url_headers"] ?  JSON.parse(params["url_headers"]) : "undefined";
url_params = params["url_params"] ? params["url_params"]: null;
content = params['content'];

if (String(url_headers) == "undefined" ) {
  url_headers = {}
}

console.info( "Attempting to fetch url:" + url  );

response = {};

try {
  query = "acre.urlfetch(\'" + url +"?" + url_params + "\', '" + method +"', " + JSON.stringify(url_headers) +", '"+content+ ")";
  console.info(query);
  response = acre.urlfetch(url+ (url_params ? "?" + url_params : ""), method, url_headers, content);
  console.info("Response: " + JSON.stringify(response) );

  acre.response.status = 200;
  acre.response.set_header( "Content-Type", response['headers']['content-type']);
  acre.response.set_header( "Content-Length", response['body'].size );
  acre.write( response['body'] );
  
  
} catch (e) {
  response['result'] = "FAIL";
  for ( p in e ) {
    response[p] = e[p];
  }
  console.log( JSON.stringify( response ));
}
