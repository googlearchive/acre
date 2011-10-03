// This tests returning a different http status code.  This acre script
// expects a query parameter "status" whose value is an http status code. 
// other query parameters are added to the response asto the response as  headers.

var params = acre.request.params;

var status = params["status"] || 200;
var content_type = params["content_type"] || "text/plain; charset=utf-8";
var headers = params["headers"];

if (typeof headers != "undefined") {
  acre.response.headers = JSON.parse(headers);
} else {
  acre.response.headers['content-type'] = content_type;
}

acre.response.status = status;

acre.write("status is: " + status + "\n");
acre.write("content_type is: " + content_type + "\n");

// return ok so that the test driver knows that evaluation succeeded.
acre.write( "ok")
