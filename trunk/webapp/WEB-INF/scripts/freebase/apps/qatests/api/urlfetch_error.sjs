/*
 * <static> acre.urlfetch(url, method, headers, content, params)
 */

// This unescapes the query string, passes the result to acre.urlfetch,
// and returns the result.

var params = acre.request.params;

var status = params["status"] || "200";
var content_type = params["content_type"] || "text/plain; charset=utf-8";

var url  = params["url"];
var method = params["method"] || "GET";
var url_headers = params["url_headers"] ? JSON.parse(params["url_headers"]) : {};
var url_params = params["url_params"]; 
var content = params['content'];

acre.response.status = status;
acre.response.headers['content-type'] = content_type;

console.info( "Attempting to fetch url:" + url);

var response = {};
var r = {};

try {
  response = acre.urlfetch(url, method);
  console.info("typeof response: " + typeof response);
  r['message'] = "no exception thrown";
  for (p in response) {
    r[p] = response[p];
  }
} catch (e) {
  for (p in e) {
    r[p] = e[p];
  }
  console.info("Caught an exception trying to get or read urlfetch response:\n");
}

acre.write(JSON.stringify(r));
