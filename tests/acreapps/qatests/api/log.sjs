// This tests doing multiple writes to the log in one acre script.
// The query string is parsed, and each name/value pair is written to the log 
// in a separate acre.log statement.

parse_query_string();

function parse_query_string() {
    var qs = acre.request.query_string;
    var messages = qs.split("&");
    for (var m = 0; m < messages.length; m++) {
        console.log(messages[m]);
    }
}

// return ok so that the test driver knows that evaluation succeeded.
acre.write("ok");
