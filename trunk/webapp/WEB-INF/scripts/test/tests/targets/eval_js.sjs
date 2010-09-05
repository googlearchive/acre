
try {
  acre.write( JSON.stringify(acre.request.body_params));
  js = acre.request.body_params['js'];
  acre.write( "js: " + js );
  eval ( js );
  // acre.write( JSON.stringify(js) );
} catch( e ) {
    acre.write( "Caught exception: " + e );
    for ( p in e ) {
      acre.write( p +": " + e[p] );
    }
}
