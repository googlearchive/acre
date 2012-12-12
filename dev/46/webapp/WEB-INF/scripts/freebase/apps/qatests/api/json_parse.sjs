/**
 *  JSON.parse
 */

var params = acre.request.params;

var status = params["status"] || "200";
var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };
var string = params["string"];

var result = {};

try {
  console.info("JSON.parse: " + string);
  result["parse"] = JSON.parse(string);
} catch (e) {
  for (p in e) {
    result[p] = e[p];
  }
  console.error("Caught an exception: " + e);
}

acre.response.status = status;
acre.response.headers = headers;
acre.write(JSON.stringify(result) + "\n");
