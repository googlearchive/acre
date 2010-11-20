
function parse_args() {
  params = acre.environ.params;
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
  
  acre.response.status = status;
  acre.response.headers = headers;

}        

function write_object( o, name ) {
    console.log( "properties of object " + name );
    for ( p in o ) {
        acre.write( p +": " + o[p] + "\n" );
       if (typeof o[p] == "object" ) {
           acre.write( o );
           write_object( o[p], p );
        }
    }
}

function log_object( o, name ) {
    console.log( "properties of object " + name );
    for ( p in o ) {
        console.log( p +": " + o[p] + "\n" );
       if (typeof o[p] == "object" ) {
           log_object( o[p], p );
        }
    }
}

parse_args();


r = { "description": "call acre.exit() with function arguments" };

try {
  acre.exit( 1, true, "hello" );
  r['result' ] = 'FAIL';
  r['comment'] = 'statements after acre.exit() were evaluated';
} catch (e) {
   console.log( "Caught exception " + e );
   if ( e == "Error: acre.exit" ) {
    r['result'] = 'PASS';
    r['comment'] = 'caught expected exception';
  } else {
    r['result'] = 'FAIL';
    r['comment'] = 'unexpected exception thrown: ' + e ;
  }
  for ( p in e ) {
    r[p] = e[p];
  }
  acre.write( JSON.stringify(r) );
  acre.exit();
}

r['result'] = 'FAIL';
r['comment'] = 'statements were evaluated after the try block were executed';
acre.write(JSON.stringify(r));


