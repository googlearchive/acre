
var params = acre.request.params;

var headers = params["headers"];

if (typeof headers != "undefined") {
  acre.response.headers = JSON.parse(headers);
}

// return ok so that the test driver knows that evaluation succeeded.
acre.write( "ok")
