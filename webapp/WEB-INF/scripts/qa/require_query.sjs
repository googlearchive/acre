/**
 * require - argument to require is a URL that points to a resource whose acre handler type is query.
 */

var params = acre.request.params;

var url = params['url'];
var status = params['status'] || "200";
var content_type = params["content_type"] || "text/plain; charset=utf-8";

var result = {}; 

try { 
   console.log("retrieving " + url);
   result['query'] = acre.require(url);
   console.log("acre.require returned " + JSON.stringify(result['query']) + "\n");
   result['url'] = url;
   console.log("result is ----------------------- " + result);
   result['mqlread'] = acre.freebase.mqlread(result['query']['query']);
   console.log("mqlread returned " + JSON.stringify(result['mqlread']['result']));
} catch (e) {
  result['result'] = "FAIL";
  for (p in e) {
    console.log("exception: " + p + ": " + e[p] + "\n");
    result[p] = e[p];
  }
}

acre.response.status = status;
acre.response.headers['content-type'] = content_type;

acre.write(JSON.stringify(result) + "\n");
