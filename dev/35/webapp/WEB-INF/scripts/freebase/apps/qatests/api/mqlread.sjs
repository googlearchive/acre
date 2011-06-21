// This script looks for an argument named "q" in the query string.
// It passes the unescaped, JSON-parsed value to mqlread, and returns
// the mqlread response in the Acre response.

var params = acre.request.params;

var status = params["status"] || "200";
var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };
var string = params["string"];

var query = params["q"];
var envelope = params["envelope"];

if (envelope) {
  envelope = JSON.parse(envelope);
}
if (query) {
  query = JSON.parse(query);
}

try {
  console.info("SENDING QUERY: " + JSON.stringify(query));
  if (envelope) {
    console.info("ENVELOPE: " + JSON.stringify(envelope));
    var response = acre.freebase.mqlread(query, envelope);
  } else if (query) {
    var response = acre.freebase.mqlread(query);
  } else {
    var response = acre.freebase.mqlread();
  }
} catch (e) {
  var response = e;
  console.error("Caught an exception: " + e);
}

acre.response.status = status;
acre.response.headers = headers;

acre.write(JSON.stringify(response) + "\n");
