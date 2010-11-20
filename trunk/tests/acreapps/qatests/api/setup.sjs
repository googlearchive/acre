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

function write_object( myscope, myobject, myname ) {
    console.log( "properties of object " + myname );
    for ( p in myobject ) {
        acre.write( p +": " + myobject[p] + "\n" );
       if (typeof myobject[p] == "object" ) {
           acre.write( myobject );
           myscope.write_object( myobject[p], p );
        }
    }
}

function log_object( myscope, myobject, myname) {
    console.log( "properties of object " + myname );
    for ( p in myobject ) {
        console.log( p +": " + myobject[p] + "\n" );
       if (typeof myobject[p] == "object" ) {
           myscope.log_object( myobject[p], p );
        }
    }
}

parse_args();


