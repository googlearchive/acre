// This script looks for an argument named "q" in the query string.
// It passes the unescaped, JSON-parsed value to mqlread, and returns
// the mqlread response in the Acre response.

var params = acre.environ.params;

status = params["status"];
query = params["q"];
envelope = params["envelope"];
headers = params["headers"];

if ( envelope ) {
   envelope = JSON.parse(envelope)
}
if (query) {
  query = JSON.parse(query);
}

if ( String(status) == "undefined" ) {
    status = "200";
}

if ( String(headers) == "undefined" ) {
    headers  = { "content-type": "text/plain; charset=utf-8"} ;
}


var response;
try {
  console.info( "SENDING QUERY: " + JSON.stringify(query) );
  if (envelope) {
    console.info( "ENVELOPE: " + JSON.stringify(envelope ));
    response = acre.freebase.mqlread( query, envelope );
  } else if (query) {
    response = acre.freebase.mqlread(query);
  } else {
    response = acre.freebase.mqlread();
  }
} catch (e) {
  response = e;
  console.error("Caught an exception: " + e );
}

  acre.response.status = status;
  acre.response.headers = headers;

acre.write( JSON.stringify(response) +"\n" );




