/*
 * urlfetch an image
 */

var params = acre.request.params;

var url  = params["url"];
var method = params["method"] || "GET";
var url_headers = params["url_headers"] ? JSON.parse(params["url_headers"]) : {};
var url_params = params["url_params"]; 
var content = params['content'];

console.info("Attempting to fetch url:" + url);

var response = {};

try {
  var query = "acre.urlfetch(\'" + url + "?" + url_params + "\', '" + method + "', " + JSON.stringify(url_headers) + ", '" + content + ")";
  console.info(query);
  response = acre.urlfetch(url + (url_params ?  "?" + url_params : ""), method, url_headers, content);
  console.info("Response: " + JSON.stringify(response));

  acre.response.status = response['status'];
  acre.response.set_header("Content-Type", response['headers']['content-type']);
  acre.response.set_header("Content-Length", response['body'].size);
  acre.write(response['body']);
} catch (e) {
  response['result'] = "FAIL";
  for ( p in e ) {
    response[p] = e[p];
  }
  console.log(JSON.stringify(response));
}
