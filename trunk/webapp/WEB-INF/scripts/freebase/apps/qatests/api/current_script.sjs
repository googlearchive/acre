try {
  acre.write( JSON.stringify( acre.current_script ) );
} catch (e) {
  acre.write( JSON.stringify( e ) );
}
