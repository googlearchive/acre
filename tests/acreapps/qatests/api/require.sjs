/**
  *
  * require
  *
  */


var params = acre.environ.params;
var url = params['url']
var eval_string = params['eval_string']

var result = { "description": "trying to load " + url };

if ( String(params["status"]) == "undefined" ) {
    status = "200";
}

if (String(params["content_type"]) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}


var result; 

try { 
   result = acre.require(  url );
   console.log( "acre.require returned " + result+"\n");
   if (eval_string)
     result['eval_result'] = eval(eval_string);
} catch (e) {
  result['result'] = "FAIL";
  for ( p in e ) {
     console.log( "exception: " + p +": " + e[p]+"\n" );
     result[p] = e[p];
  }
}

acre.response.status = status;
acre.response.headers['content_type'] = content_type;

acre.write( JSON.stringify(result) +"\n" );



