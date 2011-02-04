// This returns the acre.request object as a json formatted string.

var params = acre.request.params;

acre.response.status = params["status"] || "200";
acre.response.headers['content-type'] = "text/plain"
acre.write(JSON.stringify(acre.request) + "\n");
