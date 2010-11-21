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

var r = { 'description': 'script calls exit - not in a try block' };

r['comment'] = "";
r['result'] = 'PASS';
acre.write(JSON.stringify(r));
acre.exit();  

r['result'] = 'FAIL';
r['comment'] = 'statements were evaluated after the script was supposed to exit';

acre.write(JSON.stringify(r));
