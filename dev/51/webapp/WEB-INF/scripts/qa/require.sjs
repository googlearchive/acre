/**
  * require
  */

var params = acre.request.params;

var status = params["status"] || "200";
var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };

var url = params['url'];
var eval_string = params['eval_string'];

var result = { "description": "trying to load " + url };

try { 
  result = acre.require(url);
  console.log("acre.require returned " + result + "\n");
  if (eval_string) {
    result['eval_result'] = eval(eval_string);
  }
} catch (e) {
  result['result'] = "FAIL";
  for (p in e) {
    console.log("exception: " + p + ": " + e[p] + "\n");
    result[p] = e[p];
  }
}

acre.response.status = status;
acre.response.headers = headers;

acre.write(JSON.stringify(result) + "\n");



