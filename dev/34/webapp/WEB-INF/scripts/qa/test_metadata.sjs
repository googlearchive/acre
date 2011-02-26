acre.require('/test/lib').enable(this);

var qa_app = "//metadata.qatests.apps.freebase.dev";

test('metadata file loading',function() {
    var md = acre.get_metadata(qa_app);

    ok(md.ttl === 1, "ttl was set");

    ok(md.mounts.metadata, "mount present");

    ok(md.handlers.custom, "custom handler present");
    ok(md.extensions.cst, "cst extension present");
    ok(md.extensions.html, "html extension present");
    var file = md.files["not_custom.html"];
    ok(file.handler === 'custom', "custom handler was set");
});

test('mount points',function() {
    var metadata_file = acre.require(qa_app + '/metadata/mount_file');
    ok(metadata_file.body == 'success', "found mount_file at metadata mount point");

    acre.mount(qa_app, "inline");
    var inline_file = acre.require('inline/mount_file');
    ok(inline_file.body == 'success', "found mount_file at inline mount point");
});

test('custom handler triggering',function() {
    var ext_file = acre.require('//metadata.qatests.apps.freebase.dev/custom');
    ok(ext_file.body == 'success', "handler triggered by extension");

    var md_file = acre.require('//metadata.qatests.apps.freebase.dev/not_custom');
    ok(md_file.body == 'success', "handler triggered by metadata");
});

test('require with metadata',function() {
    var md = {
        "extensions" : {
            "cst" : {
                "handler" : "passthrough"
            }
        },
        "files" : {
            "not_custom.html": {
                "handler": "passthrough"
            },
            "not_custom2.html": {
                "handler": "custom"
            }
        }
    };
    var file1 = acre.require('//metadata.qatests.apps.freebase.dev/custom.cst', md);
    ok(file1.body == 'fail', "metadata argument overrode extension map");

    var file2 = acre.require('//metadata.qatests.apps.freebase.dev/not_custom2.html', md);
    ok(file2.body == 'success', "metadata argument overrode default handler");

    var file3 = acre.require('//metadata.qatests.apps.freebase.dev/not_custom.html', md);
    ok(file3.body == 'fail', "metadata argument overrode in-app metadata");

});

acre.test.report();