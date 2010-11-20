// This returns the acre.environ object as a json formatted string.

var params = parse_query_string();

function parse_query_string () {
    var params = {};
    var qs  = acre.environ.query_string;
    _params = qs.split( "&" );
    for (var p=0;  p < _params.length; p++ ) {
        var arr = (_params[p]).split("=");
        params[arr[0]] = unescape(arr[1]).replace("+", " ","g");   
        console.log( "got param " + arr[0] + " value: " + arr[1] );
    }
    for (p in params) {
       console.log( "got param: " + p +": value: " + params[p]  +"\n");
    }
    return params;
}

status = params["status"];
content_type = params["content_type"];

if ( String(status) == "undefined" ) {
    status = "200";
}

if ( String(content_type) == "undefined" ) {
    content_type = "text/plain; charset=utf-8";
}


acre.response.status = status;
acre.response.headers['content-type'] = "text/html"
acre.write( JSON.stringify(acre.environ) +"\n" );

// return ok so that the test driver knows that evaluation succeeded.
//acre.write( "ok")

