/**
 *  JSON.stringify
 *
 */

var params = acre.environ.params;

var status = params["status"];
var headers = params["headers"];
var string = params["string"];

if ( String(status) == "undefined" ) {
    status = "200";
}
if ( String(headers) == "undefined" ) {
    headers  = { "content-type": "text/plain; charset=utf-8"} ;
} 

var result = {};

try {

  console.info( "JSON.stringify: " + string );
  result["string"] = JSON.stringify( string );
} catch (e) {
  result = e;
  console.error("Caught an exception: " + e );
}

acre.response.status = status;
acre.response.headers = headers;
acre.write( JSON.stringify(result) +"\n" );


