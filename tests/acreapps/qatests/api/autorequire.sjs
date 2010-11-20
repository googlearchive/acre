require_id = acre.environ.params['require_id'];

try {
  result = {}
 result = acre.require( require_id );
} catch(e) {
  for ( p in e ) {
    result[p] = e[p];
  }
}

acre.write( JSON.stringify( result ) );


