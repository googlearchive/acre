acre.require('/test/lib').enable(this);

function per_url_tests() {
    var res = acre.test.urlfetch();
    var json_res = JSON.parse(res.body);

    acre.test.api_results(json_res);
    ok(('acre_cookiejar' in res.cookies), "acre_cookiejar cookie present");
    ok(/engines\.tests\.test\.dev/.test(res.cookies.acre_cookiejar.domain),
       "acre_cookiejar has server_host domain");
    var cparts = res.cookies.acre_cookiejar.value.split(':');
    ok((cparts.length == 2), "acre_cookiejar has only one cookie");
    var MWLT_RE = /(\d*)\|(\d*_)?92([0-9a-f]*)\|(.*)/;
    var cmatch = MWLT_RE.exec(cparts[1]);
    ok(cmatch !== null,
       "Cookie in cookie jar looks like an mwLastWriteTime cookie");
    ok(cmatch[4] == this.pod, "Pod matches in mwLastWriteTime cookie");
}

function test_service_url(surl) {
    var args = {'service':'touch'};
    if (typeof surl !== 'undefined') {
        args.service_url = surl;
    } else {
        surl = acre.freebase.service_url;
    }

    var pod;
    for (var a in POD_ALIST) {
        if (POD_ALIST[a][1].test(surl)) {
            pod = POD_ALIST[a][0];
            break;
        }
    }

    test('Touch and Cookiejar tests for '+surl, {args:args, 'pod':pod}, per_url_tests);
}

var POD_ALIST  = [
    ['qa', /qa.\metaweb\.com/],
    ['sandbox', /sandbox\-freebase\.com/],
    ['p01', /freebase.com/]
];


acre.test.engine('Basic cookiejar and acre.freebase.touch() tests', 'freebase');

test_service_url();
test_service_url('http://sandbox-freebase.com');

acre.test.report();