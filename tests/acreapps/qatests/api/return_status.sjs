// This tests returning a different http status code.  This acre script
// expects a query parameter "status" whose value is an http status code.

status = acre.environ.params["status"];
content_type = acre.environ.params["content_type"];
location =  (acre.environ.params["location"] ) ? acre.environ.params["location"] : "http://" + acre.environ.server_host;


if ( String(status) == "undefined" ) {
    status = "200";
}

if (Number(status) >= 300 && Number(status) <= 399 ) {
  acre.response.set_header( "Location", location );
}

if ( String(content_type) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}


  acre.response.status = status;
  acre.response.headers['content-type'] = content_type;

acre.write( "status is: " + status +"\n" );
acre.write( "content_type is: " + content_type +"\n" );



