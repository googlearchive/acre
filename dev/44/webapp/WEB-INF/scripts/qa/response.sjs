// This tests returning a different http status code.  This acre script
// expects a query parameter "status" whose value is an http status code.

var params = acre.request.params;

var status = params["status"] || "200";
var content_type = params["content_type"] || "text/plain; charset=utf-8";

acre.response.status = status;
acre.response.headers['content-type'] = content_type;

acre.write("status is: " + status + "\n");
acre.write("content_type is: " + content_type + "\n");


