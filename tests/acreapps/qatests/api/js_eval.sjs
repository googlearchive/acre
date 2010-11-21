// This script looks for an argument named "js" in the query string.
// It passes the value of js to eval and returns the response.

var params = acre.request.params;

var status = params["status"] || "200";
var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };

acre.response.status = status;
acre.response.headers = headers;

try {
  var js = params["js"];
  console.log("EVALUATING STRING: " + js +"\n");
  var response = eval(js);
  console.log("EVAL(" + js + ") RETURNED: " + response);
  acre.write(response + "\n");
 } catch (e) {
  console.error("EVAL THREW AN EXCEPTION: " + e);
  var r = {};
  for ( p in e ) {
    console.log("error " + p + ":" + e[p] + "\n");
    r[p] = e[p];
  }
  acre.write(JSON.stringify({ "result": r }));
}
