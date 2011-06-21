function appfetcher(register_appfetcher, make_appfetch_error, _system_urlfetch) {

    var googlecode_re = /(.*)\.googlecode\.dev/;

    var googlecode_json_resolver = function(host) {
        var m = host.match(googlecode_re);
        if (!m) return false;
        return m[1];
    }

    var googlecode_json_inventory_path = function(app, resource, dir) {
        var res = {
            dirs : {},
            files : {}
        };

        var segs = resource.split("/");
        var host = segs.shift();
        var parts = host.split(".");
        var project = parts.pop();
        var repo = parts.pop();
        var path = parts.reverse().join("/") + (segs.length ? "/" + segs.join("/") : "");

        var dir_url = "http://code.google.com/p/" + project + "/source/dirfeed?p=/" + path;
        var source_url = "http://" + project + ".googlecode.com/" + repo + "/" + path;

        // we need to go fetch it
        if (!dir) {
            try {
                var r = _system_urlfetch(dir_url);
                var o = JSON.parse(r.body);
            } catch (e if e instanceof acre.errors.URLError) {
                acre.syslog.warn(e.message, "googlecode.fetch_error");
                return null;
            } catch(e) {
                acre.syslog.warn(e.message, "googlecode.parse_error");
                return null;
            }

            dir = o[path];
            if (!dir || dir.error) return null;

            app.as_of    = null;   // use revision id?
            app.guid = app.guid || source_url;
            app.project = project + ".googlecode.dev";
            app.ttl = 600000;  // XXX - default app.ttl based on 'trunk' etc. in path?
        }

        var files = dir.filePage.files;
        for (var file in files) {
            var f = files[file];
            var file_data = {
                name: file
            };

            var revision = f[1];
            file_data.content_id = source_url + "/" + file + "?r=" + revision;
            file_data.content_hash = revision;
            res.files[file] = file_data;
        }

        for (var d in dir.subdirs) {
            var subdir = dir.subdirs[d];
            res.dirs[d] = (subdir && subdir.filePage) ? subdir : false;
        }

        return res;
    }

    register_appfetcher("googlecode_json", googlecode_json_resolver, googlecode_json_inventory_path);

    /*
    // disabled because PROPFIND method isn't currently allowed from appengine
    // XXX - should be able to throw an appfetch thunk to trigger webdav (after rewriting host)
    var googlecode_webdav_resolver = function(host) {

        var m = host.match(googlecode_re);
        if (!m) return false;

        var parts = m[1].split(".");
        var project = parts.pop();
        var repo = parts.pop();
        var path = parts.reverse().join("/");

        return "http://" + project + ".googlecode.com/" + repo + "/" + path + "/";
    };

    var googlecode_webdav_inventory_path = function() {};

    register_appfetch_method("googlecode_webDAV", googlecode_webdav_resolver, googlecode_webdav_inventory_path);
*/
};
