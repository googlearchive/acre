acre.require('/test/lib').enable(this);

var qa_app = "//metadata.qatests.apps.freebase.dev";

test('metadata file loading',function() {
    var md = acre.get_metadata(qa_app);

    ok(md.ttl === 1, "ttl wasn't set");

    ok(md.mounts.metadata, "mount missing");

    ok(md.handlers.custom, "custom handler missing");
    ok(md.extensions.cst, "cst extension missing");
    ok(md.extensions.html, "lost html extension");
    var file = md.files["not_custom.html"];
    ok(file.handler === 'custom', "handler wasn't set");
});

test('test mount points',function() {
    var metadata_file = acre.require(qa_app + '/metadata/mount_file');
    ok(metadata_file.body == 'success', "couldn't find mount_file at metadata mount point");

    acre.mount(qa_app, "inline");
    var inline_file = acre.require('inline/mount_file');
    ok(inline_file.body == 'success', "couldn't find mount_file at inline mount point");
});

test('custom handler triggering',function() {
    var ext_file = acre.require('//metadata.qatests.apps.freebase.dev/custom');
    ok(ext_file.body == 'success', "extension-triggered handler didn't work");

    var md_file = acre.require('//metadata.qatests.apps.freebase.dev/not_custom');
    console.log(acre.get_metadata('//metadata.qatests.apps.freebase.dev'))
    ok(md_file.body == 'success', "metadata-triggered handler didn't work");
});

acre.test.report();