var exports = {
    parseUri: parseUri,
    extend: extend,
    each: each,
    isArray: isArray,
    isPlainObject: isPlainObject,
    isFunction: isFunction,
    escape_re: escape_re,
    get_random: get_random,
    get_csrf_secret: get_csrf_secret,
    compose_req_path: compose_req_path,
    decompose_req_path: decompose_req_path,
    file_in_path: file_in_path,
    get_extension_metadata: get_extension_metadata,
    namespace_to_host: namespace_to_host,
    host_to_namespace: host_to_namespace,
    split_script_id: split_script_id,
    req_path_to_script_id: req_path_to_script_id,
};


/**
*   adapted from parseUri 1.2.1
*   http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
**/
function parseUri(str) {
    var o = {
        key: ["source","protocol","authority","userInfo","user","password","host",
              "port","relative","path","directory","file","query","anchor"],
        parser: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
    };
    var m = o.parser.exec(str);
    var uri = {};
    var i = 14;
    while (i--) uri[o.key[i]] = m[i] || "";
    return uri;
}


/** 
*   adaptation of some of the jQuery utils
*   http://jquery.com
**/
var hasOwn = Object.prototype.hasOwnProperty,
    class2type = {};

"Boolean Number String Function Array Date RegExp Object".split(" ").forEach(function(name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function type(o) {
    return o == null ? String(o) : class2type[toString.call(o)] || "object";
};

function isFunction(o) {
    return type(o) === "function";
}

function isArray(o) {
    return type(o) === "array";
}

function isPlainObject(o) {
    if (!o || type(o) !== "object") return false;
    var key;
    for (key in o) {}
    return key === undefined || hasOwn.call(o, key);
};

function extend() {
    var options, name, src, copy, copyIsArray, clone,
        class2type = {},
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    if (typeof target === "boolean") {
        deep = target;
        target = arguments[1] || {};
        i = 2;
    }

    if (typeof target !== "object" && !isFunction(target)) {
        target = {};
    }
    var ar = false;
    for ( ; i < length; i++ ) {
        if ( (options = arguments[i]) != null ) {
            var node_stack = [];
            node_stack.push([target, options]);
            while (node_stack.length > 0) {
                var node = node_stack.pop(),
                    node_src = node[0],
                    node_copy = node[1];
                for (name in node_copy) {
                    src = node_src[name];
                    copy = node_copy[name];
                    if (node_src === copy) continue;
                    if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && isArray(src) ? src : [];
                        } else {
                            clone = src && isPlainObject(src) ? src : {};
                        }
                        node_src[name] = clone;
                        node_stack.push([clone, copy]);
                    } else if (copy !== undefined) {
                        node_src[name] = copy;
                    }
                }
            }
        }
    }

    return target;
};

function each(object, callback) {
    var name, i = 0,
        length = object.length,
        isObj = length === undefined || isFunction(object);

    if (isObj) {
        for (name in object) {
            if (callback.call(object[name], name, object[name]) === false) {
                break;
            }
        }
    } else {
        for (var value = object[0];
            i < length && callback.call(value, i, value) !== false; 
            value = object[++i]) {}
    }

    return object;
}


function escape_re(s) {
  var specials = /[.*+?|()\[\]{}\\]/g;
  return s.replace(specials, '\\$&');
}

// random number generator used in CSRF protection
function get_random() {
    return Math.floor(Math.random()*10e15).toString();
};

function get_csrf_secret(that) {
    if (!_request.csrf_secret) {
        var key = _keystore.get("csrf");
        if (key && key[1]) {
            _request.csrf_secret = key[1];
        } else {
            _request.csrf_secret = get_random();
            _keystore.put("csrf", null, _request.csrf_secret);
        }
    }
    return _request.csrf_secret;
};


/** 
*   helpers for common activities in acreboot
**/
function compose_req_path(host, path, query_string) {
    var req_path = '//' + host;

    if (path) {
        req_path += '/' + path;
    }

    if (query_string) {
        req_path += '?' + query_string;
    }
    
    return req_path;
};

function decompose_req_path(req_path) {
    var path_re = /^([^\/]*:)?(?:\/\/([^\/\?]*))?(?:\/?([^\?]*))?(?:\?(.*))?$/;
    var [orig_req_path, protocol, host, path, query_string] = req_path.match(path_re);

    if (!host) throw new Error("Path: " + orig_req_path + " is not fully-qualified");

    // if it's a full URL we need to turn host into new require-style host
    if (protocol) {
        // remove port
        host = host.replace(/\:\d*$/,"");

        // normalize host relative to current acre host
        var acre_host_re = new RegExp("^((.*)\.)?" + escape_re(_request.server_host_base) + "$");
        var foreign_host_re = new RegExp("^(.*\.)" + _request.DELIMITER_HOST + "$");

        var m = host.match(acre_host_re);
        if (m) {
            if (m[2]) {
                var h = m[2].match(foreign_host_re);
                if (h) {
                    // foreign host:
                    //  e.g., http://trunk.svn.dev.acre-fmdb.googlecode.com.host.acre.z --> //trunk.svn.dev.acre-fmdb.googlecode.com.
                    host = h[1];
                } else {
                    // registered short host:
                    //  e.g., http://fmdb.acre.z --> //fmdb
                    host = m[2];
                }
            } else {
                // host is ACRE_HOST_BASE:
                //  e.g., http://acre.z
                host = null;
            }
        } else {
            // registered absolute host:
            //  e.g., http://tippify.com --> //tippify.com.
            host = host + ".";
        }
    }
    
    return [host, path, query_string];
}

function file_in_path(filename, path) {
    var file_re = new RegExp(escape_re(filename) + "(\/.*)?$");
    var in_path = false;
    var path_info = "";

    if (file_re.test(path)) {
        in_path = true;
        path_info = path.replace(new RegExp("^" + escape_re(filename)),"");
        // XXX - add leading slash for backward-compatibility
        if (path_info === "") path_info = "/";
    } else {
        // XXX - add leading slash for backward-compatibility
        path_info = "/" + path;
    }

    // XXX - strip trailing slash for backward-compatibility
    if (path_info.length > 1 && path_info.substr(-1) === "/") {
        path_info = path_info.substr(0, path_info.length-1);
    }

    return [path_info, in_path];
}

function get_extension_metadata(name, extensions) {
    // match from longest to shortest (i.e., .mf.css before .css)
    var exts = name.split(".");
    exts.shift();
    while (exts.length) {
      var ext = exts.join(".");
      var ext_data = {};
      if (ext && extensions && extensions[ext]) {
          ext_data = extensions[ext];
          break;
      }
      exts.shift();
    }

    return ext_data;
};


// helpers for backward-compatibility with the days of script_ids
// it sure would be nice to get rid of these...
function namespace_to_host(namespace) {
    var host_re = new RegExp(escape_re('^' + _request.DEFAULT_HOSTS_PATH));
    var acre_host_re = new RegExp(escape_re('^' + _request.DEFAULT_ACRE_HOST_PATH));

    if (host_re.test(namespace)) {
        namespace = namespace.replace(host_re, "");
        if (acre_host_re.test(namespace)) {
            namespace = namespace.replace(acre_host_re, "").replace(/^\//, "");
        }
    } else {
        namespace = _request.DELIMITER_PATH + namespace;
    }
    return namespace.split("/").reverse().join(".");
}

function host_to_namespace(host) {
    var path = null;

    var host_parts = host.split(".");
    var trailing_host_part = host_parts.pop();
    if (trailing_host_part === _request.DELIMITER_PATH) {
        path = "/" + host_parts.reverse().join("/");
    } else if (trailing_host_part === '') {
        path = _request.DEFAULT_HOSTS_PATH + "/" + host_parts.reverse().join("/");
    } else {
        host_parts.push(trailing_host_part);
        path = _request.DEFAULT_HOSTS_PATH + _request.DEFAULT_ACRE_HOST_PATH + "/" + host_parts.reverse().join("/");
    }

    return path;
}

function split_script_id(script_id) {
    var namespace = script_id.split('/');
    var f = namespace.pop();
    namespace = namespace.join('/');
    return [namespace, f];
}

function req_path_to_script_id(req_path) {
    var [host, script] = decompose_req_path(req_path);
    script = script.split("/").pop();
    return host_to_namespace(host) + "/" + script;
}
