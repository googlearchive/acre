/*
 * <static> acre.urlfetch(url, method, headers, content, params)
 */

// This unescapes the query string, passes the result to acre.urlfetch, and returns the result.

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

console.info("Attempting to fetch url:" + url);

var response = {};

try {
  var query = "acre.urlfetch(\'" + url + "?" + url_params + "\', '" + method + "', " + JSON.stringify(url_headers) + ", '" + content + ")";
  //console.info(query);
  response = acre.urlfetch(url + (url_params ?  "?" + url_params : ""), method, url_headers, content);
  //console.info("Response: " + JSON.stringify(response));
} catch (e) {
  response['result'] = "FAIL";
  console.error("ERROR:  urlfetch threw exception: " + JSON.stringify(e));
  for (p in e) {
    response[p] = e[p];
  }
}

acre.write(JSON.stringify(response));
