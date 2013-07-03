try {
  var jsQuery = acre.require("jsQuery");

  var tests = {
    get_query_string : function() {
      jsQuery.assertEquals(acre.request.query_string, acre.request.query_string, "foo=bar");
    }
  };
  
  jsQuery.run_nose_tests(tests);

} catch (e) {
  acre.write(JSON.stringify(e));
}
