function parse_args() {
  var params = acre.request.params;
  var status = params["status"] || "200";
  var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };
  var query = params["q"];
  var envelope = params["envelope"];

  if (envelope) {
     envelope = JSON.parse(envelope);
  }

  if (query) {
    query = JSON.parse(query);
  }
  
  acre.response.status = status;
  acre.response.headers = headers;
}        

parse_args();

var r = { "description": "acre.exit in a loaded script should stop that script's evaluation, but not the loading script's evaluation" };

var a = ""
var b = ""
var data = "";
  
try {
  data = acre.require("/freebase/apps/qatests/api/exit_require_a");
} catch (e) {
  if ( e != "Error: acre.exit" ) {
    r['result'] = 'FAIL';
    r['comment'] = 'unexpected exception thrown: ' + e ;
    for (p in e) {
      r[p] = e[p];
    }
    acre.write(JSON.stringify(r));
    acre.exit();
  } else {
    r['result'] = 'PASS';
  }  
}

acre.write(JSON.stringify(r));
