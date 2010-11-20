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

parse_args();

r = { "description": "acre.exit in a loaded script should stop that script's evaluation, but not the loading script's evaluation" };

a = ""
b = ""
data = "";
  
try {
  data = acre.require("freebase:/freebase/apps/qatests/api/exit_require_a" );
} catch (e) {
  if ( e != "Error: acre.exit" ) {
    r['result'] = 'FAIL';
    r['comment'] = 'unexpected exception thrown: ' + e ;
    for ( p in e ) {
      r[p] = e[p];
    }
    acre.write( JSON.stringify(r) );
    acre.exit();
} else {
  r['result'] = 'PASS';
}
    
}

acre.write( JSON.stringify(r) );





