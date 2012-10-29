


(function () {
var tests;

//////////////////////////////////////////////////////////////////////

//
//  tests of the basic mjt.Task mechanism, including timeouts
//

tests = new tsetse.TestSet('task_core');

// create a new task
var TTask = mjt.define_task();


tests.def('readysoon', function () {
    TTask()
        .onready('ok', this)
        .onerror('fail', this)
        .ready({});
});

tests.def('readynow', function () {
    TTask()
        .ready({})
        .onready('ok', this)
        .onerror('fail', this);
});

tests.def('errorsoon', function () {
    TTask()
        .onready('fail', this)
        .onerror('ok', this)
        .error('/some/test/error', 'task testing fake error');
});

tests.def('errornow', function () {
    TTask()
        .error('/some/test/error', 'task testing fake error')
        .onready('fail', this)
        .onerror('ok', this);
});

tests.def('readynever', function () {
    // note missing request() or enqueue()
    TTask()
        .set_timeout(2000)
        .onready('fail', this)
        .onerror('ok', this);
});

//////////////////////////////////////////////////////////////////////

tests.def('prereq_readysoon', function () {
    var t = TTask();
    t.request = function() {
        // don't automatically go ready for this test
    };
    TTask()
        .require(t)
        .enqueue()
        .onready('ok', this)
        .onerror('fail', this);
    t.ready({});
});

tests.def('prereq_readynow', function () {
    var t = TTask()
        .ready({});
    TTask()
        .require(t)
        .enqueue()
        .onready('ok', this)
        .onerror('fail', this);
});

tests.def('prereq_errorsoon', function () {
    var t = TTask();
    t.request = function() {
        // don't automatically go ready on enqueue for this test
    };
    TTask()
        .require(t)
        .enqueue()
        .onready('fail', this)
        .onerror('ok', this);
    t.error('/some/test/error', 'task testing fake error');
});

tests.def('prereq_errornow', function () {
    var t = TTask()
        .error('/some/test/error', 'task testing fake error');
    TTask()
        .require(t)
        .enqueue()
        .onready('fail', this)
        .onerror('ok', this);
});

tests.def('prereq_readynever', function () {
    var t = TTask()
        .set_timeout(2000)
    t.request = function() {
        // don't automatically go ready on enqueue for this test
    };
    TTask()
        .require(t)
        .enqueue()
        .onready('fail', this)
        .onerror('ok', this);
});

//////////////////////////////////////////////////////////////////////

tests.def('delay', function () {
    var t0 = new Date();
    mjt.Delay(3000)
        .enqueue()
        .onready('ok', this)
        .onerror('fail', this);
});

// mjt.NoPendingTasks() is tested in an isolated HTML file.

//////////////////////////////////////////////////////////////////////


//
//  tests of the MqlRead task
//
tests = new tsetse.TestSet('mqlread');

//  basic tests of the JsonP task, (using a freebase url for testing)
tests.notdef('jsonp', function () {
    var url = 'http://www.freebase.com/api/service/mqlread?query='
        + encodeURIComponent('{}');
    var task = mjt.JsonP();
    task.url = url + '&callback=' + task.generate_callback(url);
    task.set_timeout()
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});


//
//  this breaks stuff below that would otherwise work 
//  it seems to block all subsequent requests until it fails,
//  at which point the others time out too.
//
//  but the basic readynever test works fine.  ???
//


tests.notdef('jsonp_timeout',
          function () {
    var url = 'http://10.0.0.123/provoke/a?timeout=hope_so';
    var task = mjt.JsonP();
    task.url = url + '&callback=' + task.generate_callback(url);
    task.set_timeout()
        .onready('fail', this)
        .onerror('ok', this)
        .enqueue();
});

//////////////////////////////////////////////////////////////////////

tests.def('simple', function () {
    mjt.freebase.MqlRead([{id:null,name:null,limit:1}])
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

tests.def('badquery', function () {
    mjt.freebase.MqlRead({})
        .onready('fail', this)
        .onerror('ok', this)
        .enqueue();
});

tests.def('mqlreadmulti', function () {
    var multi = mjt.freebase.MqlReadMultiple()
        .mqlread('q1', mjt.freebase.MqlRead({id:'/type/type',name:null}))
        .mqlread('q2', mjt.freebase.MqlRead({id:'/type/property',name:null}))
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

//
//  test MqlRead next() paging
//
tests.def('readnext', function () {
    function start(test) {
        var t = mjt.freebase.MqlRead([{id:null,name:null,type:'/type/type',limit:1}]);

        t.onready(check_t1, test, t)
            .onerror('fail', test)
            .enqueue();
    }

    function check_t1(test, task, rs) {
        if (rs.length != 1) {
            test.fail();
            return;
        }
        var t2 = task.next(1);
        t2.onready(check_t2, test, t2)
            .onerror('fail', test)
            .enqueue();
    }

    function check_t2(test, task, rs) {
        if (rs.length != 1)
            test.fail();
        else
            test.ok();
    }
    start(this);
});

//
//  test mjt.Pager paging
//
tests.def('paging', function () {
    var chunk_size = 4;
    var slice_size = 6;

    var q = mjt.freebase.MqlRead([{id:null,name:null,type:'/type/property',schema:'/type/type',limit:chunk_size}]);

    var pager = new mjt.Pager(q);

    var test = this;
    function next_slice(start) {
        var slice = pager.slicetask(start, slice_size);
        slice
            // .onready(next_chunk, start + slice_size)
            .onready('ok', test)
            .onerror('fail', test);
    }
    next_slice(0);
    //mjt.log('PAGESLICE', this);
});


//////////////////////////////////////////////////////////////////////

//
// disabled, needs updating for having a single freebase service object
// 

tests = new tsetse.TestSet('freebase_post');

tests.notdef('mqlwrite', function () {
    mjt.freebase.MqlWrite({id:null,create:'unconditional'})
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

tests.notdef('mqlwrite_bad', function () {
    mjt.freebase.MqlWrite({id:null,create:'but of course'})
        .onready('fail', this)
        .onerror('ok', this)
        .enqueue();
});

tests.notdef('flushcache', function () {
    mjt.freebase.FlushCache()
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});


/////////////////////////////////////////////////////////////////////

tests = new tsetse.TestSet('iframe');

//
//  test async iframe task
//

tests.def('iframe_good', function () {
    mjt.AsyncIframe('./data/blank.html')
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

/////////////////////////////////////////////////////////////////////

tests = new tsetse.TestSet('misc');

//
//  test yahoo api task
//

tests.def('transget', function () {
    mjt.freebase.TransGet('/guid/9202a8c04000641f80000000011adb8a')
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

//
//  test yahoo api task
//

tests.def('yahoo_imagesearch', function () {
    mjt.yahooapi.ImageSearch('kathakali')
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

//////////////////////////////////////////////////////////////////////

tests = new tsetse.TestSet('mqlschema');

//
//  test mql schema loading
//

tests.def('schema_get', function () {
    mjt.freebase.schema_cache.get('/type/type')
        .onready('ok', this)
        .onerror('fail', this);
});

tests.def('schema_bad_get', function () {
    mjt.freebase.schema_cache.get('/type/animal_that_just_broke_the_vase')
        .onready('fail', this)
        .onerror('ok', this);
});

//
//  doesn't work yet - fetches ok but doesn't create the necessary schemas
//
tests.notdef('schema_core', function () {
    var q = mjt.freebase.schema_cache.getcore();
    q.onerror('fail', this)
        .onready(function check(test) {
            test.assert(mjt.freebase.schema_cache.lookup('/type/object').props);
            test.assert(mjt.freebase.schema_cache.lookup('/type/value').props);
            test.ok();
        }, this);
});

//////////////////////////////////////////////////////////////////////

tests = new tsetse.TestSet('mqlquery');

//
//  test mql query manipulation tools
//

tests.def('implicit_type', function () {
    var q = mjt.freebase.MqlQuery({id:'/type/type',name:null});
    var test = this;
    q.onerror('fail', this)
        .onready(function (something) {
            test.assert(q.qobject.type == '/type/object');
            test.assert(q.qobject.props.name.vtype == '/type/text');
            test.ok();
        })
        .enqueue();
});

tests.def('explicit_property_id', function () {
    var q = mjt.freebase.MqlQuery({id:'/type/type','/type/type/domain':{}})
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

tests.def('explicit_type', function () {
    var q = mjt.freebase.MqlQuery({id:'/type/type',type:'/type/type',name:null,domain:{}})
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

tests.def('directive', function () {
    var q = mjt.freebase.MqlQuery({id:'/type/type',name:null,optional:false})
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();
});

tests.def('emptyq', function () {
    var q = mjt.freebase.MqlQuery({})
        .onready('ok', this)
        .onerror('fail', this)
        .enqueue();

});

//////////////////////////////////////////////////////////////////////


})();
