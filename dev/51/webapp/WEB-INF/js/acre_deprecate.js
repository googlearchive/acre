// ---------------------------- deprecation machinery --------------------------
var _topscope;

// XXX deal with reuse amongst the go_go_gadget tools.
function go_go_gadget_getter(path) {
    if (path == '') return _topscope;
    var pparts = path.split('.');
    var obj = _topscope;
    while (pparts.length > 0) {
        // /(.*)\[["'](.*)["']\]/ (YYY["XXX"] capture [YYY, XXX])
        var n = pparts.shift();
        if (n.indexOf('[') != -1) {
            var sparts = n.match(/(.*)\[[\"\'](.*)[\"\']\]/);
            if (sparts.length == 3) {
                obj = obj[sparts[1]];
                obj = obj[sparts[2]];
            } else {
                return null;
            }
        } else {
            obj = obj[n];
        }
    }
    if (obj == _topscope) {
        return null;
    }

    return obj;
}

function go_go_gadget_setter(path, val) {
    var pparts = path.split('.');
    var obj = _topscope;
    while (pparts.length > 1) {
        var n = pparts.shift();
        if (n.indexOf('[') != -1) {
            var sparts = n.match(/(.*)\[[\"\'](.*)[\"\']\]/);
            if (sparts.length == 3) {
                obj = obj[sparts[1]];
                obj = obj[sparts[2]];
            } else {
                return;
            }
        } else {
            obj = obj[n];
        }

    }

    if (obj == _topscope && pparts.length == 0) return;
    var n = pparts.shift();
    if (n.indexOf('[') != -1) {
        var sparts = n.match(/(.*)\[[\"\'](.*)[\"\']\]/);
        if (sparts.length == 3) {
            obj = obj[sparts[1]];
            obj[sparts[2]] = val;
        } else {
            return;
        }
    } else {
        obj[n] = val;
    }
}


function deprecate(topscope) {
    _topscope = topscope;
    for (var name in deprecation_map) {

        var obj = go_go_gadget_getter(name);
        scan_for_deprecation(obj,deprecation_map[name]);
    }
}

function scan_for_deprecation(obj,map) {
    if (!obj) return;

    for (var name in map) {
        if (name in obj) {
            if (obj.__lookupGetter__(name)) continue;
            var res = map[name];
            if (typeof res == 'string') {
                var newname = res;
            } else if (res != null) {
                var newname = res[0];
                var msg = res[1];
            } else {
                var newname = null;
            }
            deprecation_wrapper(obj,name,newname,msg);
        }
    }
}

function deprecation_wrapper(obj,name,newname,info) {

    if (name in obj) {
        var i = obj[name];

        if (!obj.__lookupGetter__(name)) {
            // Note that console/logviewer_lib.js depends on the string 'Deprecation Warning:' to implement ACRE-1518
            var msg = "Deprecation Warning: '" + name + "' is deprecated and will be removed in the future.";
            if (newname) msg += " Please use '" + newname + "' instead.";
            if (info) msg += " " + info;

            var warn_deprecation = function() {
                if (!console.hide_deprecated) {
                    console.warn(msg);
                    acre.syslog.warn(msg);
                }
            };

            if (typeof i == 'function') {
                obj[name] = function() {
                    warn_deprecation();
                    return i.apply(this, arguments);
                };
            } else {
                var ivar = obj[name];

                var getter = function() {
                    warn_deprecation();
                    if (newname != null) {
                        if (newname.length && newname[0] == '.')
                            return obj[newname.substr(1)];
                        return go_go_gadget_getter(newname);
                    }

                    return ivar;
                };

                var setter = function(val) {
                    warn_deprecation();
                    if (newname != null) {
                        if (newname.length && newname[0] == '.')
                            obj[newname.substr(1)] = val;
                        else
                            go_go_gadget_setter(newname, val);
                    } else {
                        // Here we close over an internalized copy of the given
                        // non-existant value, so that we can update it and
                        // keep up the state
                        ivar = val;
                    }
                };

                obj.__defineGetter__(name,getter);
                obj.__defineSetter__(name,setter);
            };
        }
    }
}

var deprecation_map = {
    "acre.environ" : {
        "version"              : "acre.version",
        "default_namespace"    : null,
        "freebase_service_url" : "acre.freebase.service_url",
        "freebase_site_host"   : "acre.freebase.site_host",
        "body_params"          : "acre.request.body_params",
        "params"               : "acre.request.params",
        "path_info"            : "acre.request.path_info",
        "query_string"         : "acre.request.query_string",
        "request_base_url"     : "acre.request.base_url",
        "request_body"         : "acre.request.body",
        "request_method"       : "acre.request.method",
        "request_path_info"    : "acre.request.path_info",
        "request_server_name"  : "acre.request.server_name",
        "request_server_port"  : "acre.request.server_port",
        "request_start_time"   : "acre.request.start_time",
        "request_url"          : "acre.request.url",
        "script_id"            : "acre.current_script.id",
        "script_name"          : "acre.current_script.name",
        "script_namespace"     : "acre.current_script.app.id",
        "server_name"          : null,
        "server_host"          : "acre.host.dev_name",
        "server_host_base"     : "acre.host.name",
        "server_port"          : "acre.host.port",
        "server_protocol"      : "acre.host.protocol",
        "content_type"         : "acre.request.headers['content-type']",
        "content_length"       : "acre.request.headers['content-length']"
    },
    "acre.context" : {
        "script_id"        : "acre.current_script.id",
        "script_name"      : "acre.current_script.name",
        "script_namespace" : "acre.current_script.app.id",
        "script_version"   : "acre.current_script.app.version",
        "content_id"       : "acre.current_script.content_id",
        "handler"          : "acre.current_script.handler",
        "media_type"       : "acre.current_script.media_type"
    },
    //"acre.request" : {
    //    "base_url"         : "acre.request.app_url"
    //},
    "acre.request_context" : {
        "script_id"        : "acre.request.script.id",
        "script_name"      : "acre.request.script.name",
        "script_namespace" : "acre.request.script.app.id",
        "script_version"   : "acre.request.script.app.version",
        "content_id"       : "acre.request.script.content_id",
        "handler"          : "acre.request.script.handler",
        "media_type"       : "acre.request.script.media_type"
    },
    "acre.log" : {
        "log"   : "console.log",
        "debug" : "console.debug",
        "info"  : "console.info",
        "warn"  : "console.warn",
        "error" : "console.error"
    },
    "acre.response" : {
        "content_type" : "acre.response.headers['content-type']"
    },
    "acre.freebase" : {
        "MqlRead" : "acre.freebase.mqlread",
        "MqlReadMultiple" : "acre.freebase.mqlread_multiple",
        "MqlWrite": "acre.freebase.mqlwrite",
        "TransGet" : "acre.freebase.get_blob",
        "Touch" : "acre.freebase.touch",
        "Upload" : "acre.freebase.upload"
    },
    "acre" : {
        "formquote"  : "acre.form.quote",
        "formencode" : "acre.form.encode",
        "formdecode" : "acre.form.decode",
        "form_url"   : "acre.form.build_url",
        "htmlencode" : "acre.html.encode",
        "start_response" : [ null, "In order to set values to the HTTP response, use the 'acre.response' object instead during your script and remove this call, Acre will take care of the rest." ]
    },
    "" : {
        "AcreExitException" : "acre.errors.AcreExitException",
        "URLException" : "acre.errors.URLError",
        "FreebaseError" : "acre.freebase.Error",
        // XXX workaround for ACRE-1787
        //"mjt": null,
        "escape":"acre.form.encode",
        "unescape":"acre.form.decode"
    }
};
