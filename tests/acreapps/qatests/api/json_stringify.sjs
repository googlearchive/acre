/**
 *  JSON.stringify
 */

var params = acre.request.params;

var status = params["status"] || "200";
var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };
var string = params["string"];

var result = {};

try {
  console.info("JSON.stringify: " + string);
  result["string"] = JSON.stringify(string);
} catch (e) {
  result = e;
  console.error("Caught an exception: " + e);
}

acre.response.status = status;
acre.response.headers = headers;
acre.write(JSON.stringify(result) + "\n");
