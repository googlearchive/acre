/**
  *
  * require_script.  url is a script.
  * 
  * this script takes two params:
  * url: freebase uri that points to a script
  * eval_string:  a string to evaluate after the url require has been imported.
  *
  * this test returns a result object which consists of the result of acre.require.
  * it has an additional property, eval_result, which contains the result of evaluating
  * the eval string after loading the file specified by acre.require.  (this should
  * contain some kind of reference to data (variables, functions) that are defined
  * in the loaded file.
  *
  */

var params = acre.request.params;

var status = params["status"] || "200";
var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };

var url = params['url'];
var eval_string = params['eval_string'];

var result = {};

try { 
  result = acre.require(url);
  console.log("acre.require returned " + result + "\n");
  result['eval_result'] = eval(eval_string);
} catch (e) {
  result['result'] = "FAIL";
  result['description'] = "error passing " + url + " to acre.require";
  for (p in e) {
    console.log("exception: " + p + ": " + e[p] + "\n");
    result[p] = e[p];
  }
}

acre.response.status = status;
acre.response.headers = headers;

acre.write(JSON.stringify(result) + "\n");
