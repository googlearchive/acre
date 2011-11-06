var opts = {};

if ("unsafe" in acre.request.params) {
    opts.method = "POST";
};

if ("bless" in acre.request.params) {
    opts.bless = true;
}

try {
    var results = acre.urlfetch(acre.request.base_url + "pathinfo.sjs/success", opts);
    acre.write("success");
} catch (e if e instanceof acre.errors.URLError) {
    if (e.message.indexOf("subrequest") != -1) {
        acre.write("subrequest error");
    } else {
        acre.write("other error");
    }
}
