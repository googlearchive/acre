var show_suite,report_modules; // TODO: hang these off QUnit?
(function() {

show_suite = function(test_suite) {
  //TODO: only run specified test if ?test=tname
  var is_json_output = acre.request.params.output && acre.request.params.output.indexOf('json') == 0;

  //jsonp wrapper
  if (acre.request.params.callback && is_json_output) {
    acre.write(acre.request.params.callback + '(');
  }

  // actual output
  if (acre.request.params.output==='jsonsummary') {
    acre.write(JSON.stringify( {failures:test_suite.failures, total:test_suite.total} ));
  } else if (acre.request.params.output==='json') {
    acre.write(JSON.stringify(test_suite,null,2));
  } else if (acre.request.params.output==='flatjson') {
    acre.write(JSON.stringify(flatten_test_suite(test_suite),null,2));
  } else {
    // output==='html'
    var templates = acre.require('report');
    acre.response.set_header('Content-Type','text/html');
    acre.write(templates.show_suite(test_suite));
  }

  //jsonp wrapper
  if (acre.request.params.callback && is_json_output) {
    acre.write(');');
  }

};

report_modules = function (modules) {
  // HACK: assume the single-file case, so construct a test-suite object
  var test_suite = {
    app_path: get_app_path(),
    testprops:[],
    testfiles:[{
      file:    acre.request.script.name, //HACK: this is broken for http://routing.site.freebase.dev.acre.z:8115/test_app_routes?output=json&mode=discover&acre.console=1
      run_url: make_dev_url(get_app_path()) + '/' + acre.request.script.name,
      modules: modules
    }
    ]
  };
  show_suite(test_suite);
};

function flatten_test_suite(test_suite) {
  // the default shape of the test output is inscrutable
  var testfile = test_suite.testfiles[0];
  var tests = [];
  var total = 0;
  var failures = 0;
  var skips = 0;
  for (mi in testfile.modules) {
    var m = testfile.modules[mi];
    var mname = m.name + ".";
    if (mname == "DEFAULT.") {
       mname = "";
    };
    //thing += mname;
    for (ti in m.tests) {
      var t = m.tests[ti];
      var tname = mname + t.name;
      var runtime = t.runtime;
      var result = "pass";
      total += 1;
      for (li in t.log) {
        if (t.log[li].result == "Skipping test: ") {
          result = "skip " + t.log[li].message;
          skips += 1;
        };
        if (t.log[li].result==false || t.log[li].result==null) {
          result = "fail";
          failures += 1;
        };
      };
      var tobj = {
        "name":tname,
        "runtime":runtime,
        "testEnvironment": t.testEnvironment,
        "result": result,
        "log": t.log
      };
      tests.push(tobj);
    };
  };

  var clean_suite = {
    "app_path": test_suite.app_path,
    "tid" : test_suite.tid,
    "testprops" : test_suite.testprops,
    "file" : testfile.file,
    "total" : total,
    "failures" : failures,
    "skips" : skips,
    "run_url" : testfile.run_url,
    "tests" : tests
  };
  
  
  return clean_suite
};

var testfinder = (function() {
  var dependencies, // list of libs from manifest
  testfiles;        // list of test files objects

  // Look for MANIFEST containing var MF = {test:{files:['test_file1','test_file2']}}; 
  function search_deps_in_manifest(app_path) {
    var manifestid=app_path+'/MANIFEST';
    var mf;
    try {
      mf = acre.require(manifestid).MF;
    } catch(e) { return; }
    for (var label in mf.apps) {
      var dep_app_path = mf.apps[label];
      if (!(dep_app_path in dependencies)) {
        dependencies[dep_app_path] = false; // add to set, mark unvisted
      }
    }
  }

  function search_for_test_files(app_path) {
    var metadata = acre.get_metadata(app_path);
    if (!metadata) { return; }
    for (var filekey in metadata.files) {
      var file = metadata.files[filekey];
      if (file.name.indexOf('test_')===0) {
        var path = app_path + '/' + file.name;
        testfiles[path] = true; // add to set
      } 
    }
  }

  function search(app_path,recurse) {
    dependencies[app_path] = true; // mark app as visited
    search_for_test_files(app_path);
    if (recurse) {
      search_deps_in_manifest(app_path);
      for (var dep_app_path in dependencies) {
        if (!dependencies[dep_app_path]) {
          search(dep_app_path,recurse);
        }
      }
    }   
  }
  
  function get(app_path,recurse) {
      dependencies={
        // app_path: has_been_visited
      };
      testfiles={
        // testfilepath: true
      };
      search(app_path,recurse);
      var result = [];
      for (var testfilepath in testfiles) {
        result.push( make_file_obj(testfilepath) );
      }
      return result;
  }
  return {
    get:get
  };
})();

function make_dev_url(app_path) {
    var protocol = acre.request.protocol;
    var port = acre.request.server_port;
    port = ((protocol == 'http' && port != 80) || (protocol == 'https' && port != 443)) ? ":" + port : '';
    return protocol + ":" + app_path + '.' + acre.host.name + port;
}

function make_file_obj(fileid) {
  var s = fileid.split('/');
  var filename = s.pop();
  var app_path = s.join('/');
  return { name:filename, fileid:fileid, run_url:make_dev_url(app_path)+'/'+filename};
}


function get_test_suite(app_path,testscripts) {
  var test_suite = {
    app_path:app_path,
    testprops:[],
    testfiles:[]
  };
  var testprops = {};

  acre.request.params.mode = 'discover'; //HACK: is this clean?
  
  testscripts.forEach(function(file) {
    var acre_testfile = acre.require(file.fileid); //HACK: version?
    var modules = acre_testfile.acre.test.get_modules();
    var testfile = {
      file:    file.name,
      run_url: file.run_url,
      modules: modules
    };
    test_suite.testfiles.push(testfile);
  });
  //TODO: for (var propname in testprops) { test_suite.testprops.push(propname); }
  //console.warn('test_suite =',test_suite);

  return test_suite;
}

function get_app_path() {
  //TODO: what's the acre way to get the app_path?
  return '//' + (acre.request.server_name).replace('.'+acre.host.name,'');  
}

if (acre.current_script === acre.request.script) {
  var app_path = get_app_path();
  
  var testscripts = testfinder.get(app_path, acre.request.params.recurse);
  if (testscripts.length) {
    console.log('test: tests = '+testscripts.map(function(file){return file.name;}).join(', '));
  } else {
    console.warn('test: no tests found in '+app_path);
  }
  if (acre.request.params.mode==='listfiles') {
    // just output the list of test files (fast), don't discover the individual tests (slow)
    var run_urls = testscripts.map(function(file) {
      return file.run_url;
    });
    acre.write(JSON.stringify(run_urls,null,2));
  } else {
    show_suite(get_test_suite(app_path,testscripts));
  }
}

})();
