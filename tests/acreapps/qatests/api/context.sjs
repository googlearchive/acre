

try {
  acre.write( JSON.stringify( acre.context ) );
} catch (e) {
   acre.write( JSON.stringify( e ) );
}

acre.exit();

