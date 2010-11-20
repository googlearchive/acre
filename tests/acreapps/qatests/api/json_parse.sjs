/**
 *  JSON.parse
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
  console.info( "JSON.parse: " + string );
  result["parse"] = JSON.parse( string );
} catch (e) {
  for ( p in e ) {
    result[p] = e[p];
  }
  console.error("Caught an exception: " + e );
}

acre.response.status = status;
acre.response.headers = headers;
acre.write( JSON.stringify(result) +"\n" );


