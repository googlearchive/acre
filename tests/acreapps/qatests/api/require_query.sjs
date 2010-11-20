/**
  *
  * require - argument to require is a URL that points to a resource whose
  * acre handler type is mqlread.
  *
  */

var params = acre.environ.params;
var url = params['url']

if ( String(params["status"]) == "undefined" ) {
    status = "200";
}
if (String(params["content_type"]) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}

var result = {}; 

try { 
   console.log("retreiving " + url );
   result['query'] = acre.require(  url );
   console.log( "acre.require returned " + JSON.stringify(result['query']) +"\n");
   result['url'] = url;
   console.log("result is ----------------------- " + result)
   result['mqlread'] = acre.freebase.MqlRead(result['query']['query']).enqueue();
   console.log("mqlread returned " + JSON.stringify(result['result']) );
 } catch (e) {
  result['result'] = "FAIL";
  for ( p in e ) {
     console.log( "exception: " + p +": " + e[p]+"\n" );
     result[p] = e[p];
  }
}

  acre.response.status = status;
  acre.response.headers['content-type'] = content_type;

acre.write( JSON.stringify(result) +"\n" );


