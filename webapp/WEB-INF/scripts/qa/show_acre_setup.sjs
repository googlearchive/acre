function parse_args() {
  var params = acre.request.params;
  var status = params["status"] || "200";
  var query = params["q"];
  var envelope = params["envelope"];
  var headers = params["headers"] || { "content-type": "text/plain; charset=utf-8" };

  if (envelope) {
    envelope = JSON.parse(envelope);
  }

  if (query) {
    query = JSON.parse(query);
  }
  
  acre.response.status = status;
  acre.response.headers = headers;
}        

function write_object(myscope, myobject, myname) {
  console.log("properties of object " + myname);
  for (p in myobject) {
    acre.write(p + ": " + myobject[p] + "\n");
    if (typeof myobject[p] == "object") {
      acre.write(myobject);
      myscope.write_object(myobject[p], p);
    }
  }
}

function log_object(myscope, myobject, myname) {
  console.log("properties of object " + myname);
  for (p in myobject) {
    console.log(p + ": " + myobject[p] + "\n");
    if (typeof myobject[p] == "object") {
      myscope.log_object(myobject[p], p);
    }
  }
}

parse_args();


