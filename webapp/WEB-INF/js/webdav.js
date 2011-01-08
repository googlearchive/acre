function split_script_id(script_id) {
    var namespace = script_id.split('/');
    var f = namespace.pop();
    namespace = namespace.join('/');
    return [namespace, f];
}

function appfetcher(register_appfetcher, make_appfetch_error, _system_urlfetch) {

    var webdav_resolver = function(host) {    
        var parts = host.split(".dev.");

        if (parts.length < 2) {
            return false;
        }

        return 'http://' + parts[1].replace(/\.$/,"") + "/" + parts[0].split(".").reverse().join("/");
    }

    var webdav_inventory_path = function(app, url) {
        // The namespaces we care about for WebDAV & SVN
        var NS = {
            "D" : "DAV:",
            "SVN" : "http://subversion.tigris.org/xmlns/dav/"
        };

        // a rudimentary (hacky) XML path parser
        function getNodeVal(node, path) {
            var segs = path.split("/");
            var [namespace, prop] = segs.shift().split(":");

            var els = node.getElementsByTagNameNS(NS[namespace], prop);
            if (els.length) {
                node = els[0];
            } else {
                return [null, null];
            }

            if (segs.length) {
                return getNodeVal(node, segs.join("/"));
            } else {
                var child = node.firstChild;
                var val = child ? child.nodeValue : null;
                return [node, val];
            }
        };

        var res = {
            dirs : {},
            files : {}
        };

        // fetch the directory listing
        try {
            var r = _system_urlfetch(url, {
                method : "PROPFIND",
                headers : {
                    "Depth" : '1',
                    "Content-Type" : "text/xml; charset=UTF-8"
                }
            });        
        } catch (e) {
            if (e.response && (e.response.status === 301 || e.response.status === 302)) {
                return webdav_inventory_path(e.response.headers.location);
            } else {
                console.error(e.message, "webdav.fetch_error");
                return null;
            }
        }        

        var xml = acre.xml.parseNS(r.body);
        var doc = getNodeVal(xml, "D:multistatus")[0];
        if (!doc) return null;

        var files = doc.getElementsByTagNameNS(NS.D, "response");

        // in WebDAV, the first result is the directory itself
        var dir         = files[0];
        var prop        = getNodeVal(dir, "D:propstat/D:prop")[0];
        app.as_of       = app.as_of || 
                          getNodeVal(prop, "D:version-name")[1] || 
                          getNodeVal(prop, "D:getlastmodified")[1];
        var repo_uuid   = getNodeVal(prop, "SVN:repository-uid")[1];
        var repo_path   = getNodeVal(prop, "SVN:baseline-relative-path")[1];
        app.app_guid    = app.app_guid ||
                          ((repo_uuid && repo_path) ? repo_uuid + ":" + repo_path : url);

        // now parse the contents of the directory
        for(var i=1; i< files.length; i++) {
            var f = files[i];
            var href = getNodeVal(f, "D:href")[1];
            var file = split_script_id(href.replace(/\/$/, ''))[1];
            var prop = getNodeVal(f, "D:propstat/D:prop")[0];

            // check whether it's a subdirectory
            if (getNodeVal(prop, "D:resourcetype/D:collection")[0]) {
                // false means we don't know what's in the directory
                // so will have to recursively fetch
                res.dirs[file] = false;
                continue;
            }

            // build up file metadata
            var fn = file.split('.');
            var ext = fn.pop();
            var file_data = {
                name: fn.join('.'),
                ext: ext
            };

            var revision = getNodeVal(prop, "D:version-name")[1];
            file_data.content_id = url + '/'+file + "?r=" + revision;
            file_data.content_hash = getNodeVal(prop, "SVN:md5-checksum")[1] || 
                                     revision ||  
                                     getNodeVal(prop, "D:getlastmodified")[1];

            res.files[file] = file_data;
        }
        return res;
    }

    register_appfetcher("webDAV", webdav_resolver, webdav_inventory_path);
};