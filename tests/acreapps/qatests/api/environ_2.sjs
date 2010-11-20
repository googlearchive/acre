rq = {}
try {
   rq = acre.require("jsQuery");

   var tests = {
    get_query_string : function() {
      rq.assertEquals(acre.environ.query_string, acre.environ.query_string, "foo=bar" );
    }
  };
  rq.run_nose_tests(tests);

} catch (e) {
  acre.write( JSON.stringify(e) );
}


