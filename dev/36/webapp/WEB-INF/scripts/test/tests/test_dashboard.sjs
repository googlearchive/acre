// http://tests.test.dev.acre.z/test_dashboard

// convert 'PATH/test/tests' to 'PATH/test/lib'
var TLIB = (acre.current_script.app.id).replace(/\/[^\/]+$/,'/lib');
acre.require(TLIB).enable(this);

function contains(haystack,needle) {
  return haystack.indexOf(needle) >= 0;
}

var APP_PATH='//military1000.willmoffat.user.dev';

module('/acre/test',{
  app_path:APP_PATH,
  file:'acre/test'  
});


test('/acre/test defaults to test discovery in html',function() {
  var body = acre.test.urlfetch().body;
  ok( contains(body,'<title>Test: '+APP_PATH+'</title>'), 'html view');
  ok( contains(body, 'test default app args'),                             'cotains known module');
});


test('/acre/test test discovery in json',{
  args:{output:'json'}
},function() {
  var body = acre.test.urlfetch().body;
  ok( !contains(body,'<title>Test: '+APP_PATH+'</title>'), 'no html');
  var ts = JSON.parse(body);
  same(ts.app_path, "//military1000.willmoffat.user.dev", 'title in json');
});

test('/acre/test cannot execute tests',{
  args:{output:'json',mode:'execute'}
},function() {
  var body = acre.test.urlfetch().body;
  var ts = JSON.parse(body);
  same(ts.app_path, APP_PATH, 'title in json');
  same( typeof ts.total,    'undefined', 'total should not be present in discover mode');
  same( typeof ts.failures, 'undefined', 'failures should not be present in discover mode');
});


acre.test.report();
