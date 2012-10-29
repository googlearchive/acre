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

var r = { 'description': 'script calls exit in a try block' };

try {
  acre.exit();  
  r['result'] = 'FAIL';
  r['comment'] = 'statements were evaluated after the script was supposed to exit';
} catch (e) {
  if ((e.message == "acre.exit") && (e.name == "Error")) {
    r['result'] = 'PASS';
  } else {
    r['result'] = 'FAIL';
    r['comment'] = 'unexpected exception thrown: ' + e ;
  }
  for (p in e) {
    r[p] = e[p];
  }
  acre.write(JSON.stringify(r));
  acre.exit();
}

r['result'] = 'FAIL';
r['comment'] = 'statements were evaluated after the try block were executed';
acre.write(JSON.stringify(r));
