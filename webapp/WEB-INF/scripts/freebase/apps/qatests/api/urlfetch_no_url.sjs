// This unescapes the query string, passes the result to acre.urlfetch,
// and returns the result.

var params = acre.request.params;

var status = params["status"] || "200";
var content_type = params["content_type"] || "text/plain; charset=utf-8";
var url = params["url"];
var method = params["method"] || "GET";
var headers = params["headers"];
var params = params["params"];

acre.response.status = status;
acre.response.headers['content-type'] = content_type;

console.info("Calling acre.urlfetch with no url");

var r = {};

try {
  var response = acre.urlfetch();
  console.info("typeof response: " + typeof response);
  r['result']="FAIL";
  r['message'] = "expected an exception, but none was thrown."
} catch (e) {
  for (p in e) {
    r[p] = e[p];
  }
}

acre.write(JSON.stringify(r));
