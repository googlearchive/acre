// This tests returning a different http status code.  This acre script
// expects a query parameter "status" whose value is an http status code. 
// other query parameters are added to the response asto the response as  headers.

status = acre.environ.params["status"];
content_type = acre.environ.params["content_type"];
headers = acre.environ.params["headers"];

if ( String(status) == "undefined" ) {
    status = "200";
}

if ( String(content_type) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}

if (String(headers)!= "undefined") {
    headers = JSON.parse(headers);
  acre.response.status = status;
  acre.response.headers = headers;
    acre.start_response(status, headers);
} else {
  acre.response.status = status;
  acre.response.headers['content-type'] = content_type;
}
acre.write( "status is: " + status + "\n" );
acre.write( "content_type is: " + content_type +"\n" );

// return ok so that the test driver knows that evaluation succeeded.
acre.write( "ok")



// return ok so that the test driver knows that evaluation succeeded.
acre.write( "ok")

