
/*   acreboot.js - implementation of acre host environment using liveconnect and java */

/**
 * The acre toplevel namespace.
 * This holds the Javascript functions used by acre scripts
 *
 * @name acre
 * @namespace
 */

if (typeof acre == 'undefined') {
    acre = {};
}

(function () {

var startup_time = new Date();

// make a private copy of the objects before
//  they are wiped out from the global namespace.
// accessible reference to it.

var _topscope = this;
var _hostenv = PROTECTED_HOSTENV;
var _request = ACRE_REQUEST;
var _domparser = new DOMParser();
var _ks = new KeyStore();
var _cache = new Cache();
var _file = File;
var _json = new JSON();

// XXX there should be a java function to sanitize the global scope
// with a whitelist instead of this blacklist.  most of the
// global properties aren't enumerable so it's impossible to
// whitelist them here within javascript

delete PROTECTED_HOSTENV;
delete ACRE_REQUEST;
delete KeyStore;
delete Cache;
delete File;
delete JSON;

delete _topscope.Packages;
delete _topscope.java;
delete _topscope.netscape;

// delete E4X entrypoint if present
if (typeof _topscope.XML != 'undefined') {
    delete _topscope.XML;
}

// obtain datastore if present and remove from scope
if (typeof DataStore != 'undefined') {
    var _datastore = new DataStore();
    delete DataStore;
}

// obtain taskqueue if present and remove from scope
if (typeof TaskQueue != 'undefined') {
    var _taskqueue = new TaskQueue();
    delete TaskQueue;
}

// these values are copied here to avoid triggering a deprecation warning when they are accessed later.
var server_host_base = _request.server_host_base;
var freebase_service_url = _request.freebase_service_url;

//----------------------------- globals ---------------------------------------

var _DELIMITER_HOST = _hostenv.ACRE_HOST_DELIMITER_HOST;
var _DELIMITER_PATH = _hostenv.ACRE_HOST_DELIMITER_PATH;

var _DEFAULT_HOSTS_PATH = '/freebase/apps/hosts';
var _DEFAULT_ACRE_HOST_PATH = "/z/acre";

var _DEFAULTS_HOST = _hostenv.DEFAULT_HOST_PATH.substr(2);
var _METADATA_FILE = "METADATA";
var _DEFAULT_FILE = "index";
var _DEFAULT_APP = "helloworld.examples." + _DELIMITER_PATH;

//------------------------------- Utils ---------------------------------------

/*
 * A subset of jQuery utils loaded as 'u':
 *   u.each, u.extend, u.isArray
 * 
 * Plus a few more:
 *   u.escape_re, u.parseUri
 */
var util_scope = {};
_hostenv.load_system_script("util.js", util_scope);
var u = util_scope.exports;


// helpers for common activities in acreboot
function make_scope(start, style) {
    // XXX find a more elegant way to do this

    var copier = object;

    if (style =='deep')
        copier = arguments.callee;

    start = start || _topscope;

    function object(o) {
        function F() {};
        F.prototype = o;
        return new F();
    }

    var scope = object(start);
    for (var a in start) {
        var o = start[a];
        if (o && o instanceof Object && !(o instanceof Function)) {
            scope[a] = copier(o);
        }
    }

    return scope;
}

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
        var acre_host_re = new RegExp("^((.*)\.)?" + u.escape_re(server_host_base) + "$");
        var foreign_host_re = new RegExp("^(.*\.)" + _DELIMITER_HOST + "$");
        
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
    var file_re = new RegExp(u.escape_re(filename) + "(\/.*)?$");
    var in_path = false;
    var path_info = "";
    
    if (file_re.test(path)) {
        in_path = true;
        path_info = path.replace(new RegExp("^" + u.escape_re(filename)),"");
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


// helpers for backward-compatibility with the days of script_ids
// it sure would be nice to get rid of these...
function namespace_to_host(namespace) {
    var host_re = new RegExp(u.escape_re('^' + _DEFAULT_HOSTS_PATH));
    var acre_host_re = new RegExp(u.escape_re('^' + _DEFAULT_ACRE_HOST_PATH));
    
    if (host_re.test(namespace)) {
        namespace = namespace.replace(host_re, "");
        if (acre_host_re.test(namespace)) {
            namespace = namespace.replace(acre_host_re, "").replace(/^\//, "");
        }
    } else {
        namespace = _DELIMITER_PATH + namespace;
    }
    return namespace.split("/").reverse().join(".");
}

function host_to_namespace(host) {
    var path = null;
    
    var host_parts = host.split(".");
    var trailing_host_part = host_parts.pop();
    if (trailing_host_part === _DELIMITER_PATH) {
        path = "/" + host_parts.reverse().join("/");
    } else if (trailing_host_part === '') {
        path = _DEFAULT_HOSTS_PATH + "/" + host_parts.reverse().join("/");
    } else {
        host_parts.push(trailing_host_part);
        path = _DEFAULT_HOSTS_PATH + _DEFAULT_ACRE_HOST_PATH + "/" + host_parts.reverse().join("/");
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


//--------------------------------- syslog --------------------------------------------

var _syslog = function(level, mesg, event_name) {
    if (typeof event_name == 'undefined') event_name = null;
    if (typeof mesg == 'undefined') mesg = "undefined";
    _hostenv.syslog(level, event_name, mesg);
};

var syslog   = function (mesg, event_name) { return _syslog("INFO",mesg,event_name); };
syslog.debug = function (mesg, event_name) { return _syslog("DEBUG",mesg,event_name); };
syslog.info  = function (mesg, event_name) { return _syslog("INFO",mesg,event_name); };
syslog.warn  = function (mesg, event_name) { return _syslog("WARN",mesg,event_name); };
syslog.error = function (mesg, event_name) { return _syslog("ERROR",mesg,event_name); };

acre.syslog = syslog;

//--------------------------------- dev mode ------------------------------------------

/**
 *  this should be enabled for development only!
 */
var _dev = {};

_dev.test_internal = function (ename) {
    return _hostenv.dev_test_internal(ename);
};
_dev.syslog = syslog;

// developer entrypoints are invisible by default
if (_hostenv.ACRE_DEVELOPER_MODE) {
    acre._dev = _dev;
}

// ------------------------------- acre ----------------------------------------

acre.version = new String(_request.version);

/**
 *   begin the http response.
 *
 *   The Content-type header, if specified, is handled specially.
 *   If it is any text/* type, the charset specified in the header will
 *   be used to encode the response.  If no charset= parameter is given,
 *   the response will be encoded as UTF-8, and "; charset=utf-8" is added
 *   to the Content-type header before sending the response.
 *   <br/>
 *   For content types other than text/* the text is always encoded as UTF-8.
 *
 *   @param status is the response status (e.g. 200)
 *   @param headers is a javascript object
 */
acre.start_response = function (status, headers) {

    if (typeof status == 'undefined') {
        status = 200;
    } else if (typeof status == 'string') {
        status = parseInt(status, 10);
    } else if (typeof status == 'number') {
        acre.response.status = status;
    } else {
        throw new Error('acre.start_response: status "' + status.toSource() + '" must be an integer or string');
    }

    if (typeof headers == 'object') {
        // stupid merge - arguments override existing headers
        // some headers are patched in later though...
        u.extend(acre.response.headers, headers);
    }
};

/**
 *   add output to the http response.  multiple arguments will be appended.
 *   @param str string or markup to append
 */
acre.write = function () {
    u.each(arguments, function(i, arg) {
        // XXX - shouldn't have handler-specific code here
        if (typeof arg == 'object' && arg !== null &&
            (typeof arg.toMarkupList === 'function' || typeof arg.toMarkup === 'function')) {
            arg = acre.markup.stringify(arg);
        }

        if (typeof arg != 'string' && !(arg instanceof Binary))
            arg = '' + arg;

        _hostenv.write(arg);        
    });
};

/**
 * exit the current acre request.<br/><br/>
 *
 * this works by throwing an exception,
 * that exception propagates across acre.load* calls.<br/><br/>
 *
 * Currently, user code can catch that exception.
 * we may wish to change this behavior since most people expect
 * to catch errors rather than normal termination.<br/><br/>
 *
 * if an acre script exits before calling <b>acre.start_response()</b>,
 * an error response is generated.
 */
acre.exit = function () {
    throw new _hostenv.AcreExitException();
};


// ------------------------------- acre.host -----------------------------------------

if (_request.server.indexOf("jetty") > -1) {
    var server_type = "acre_server";
} else if (_request.server.indexOf("app engine") > -1) {
    var server_type = "appengine";
} else {
    var server_type = new String(_request.server);
}

acre.host = {
    protocol : _request.server_protocol,
    name : _request.server_host_base,
    dev_name : _request.server_host,
    port : _request.server_port,
    server : server_type
};


//-------------------------------- acre.request -----------------------------------------

acre.request = {
    server_name : _request.request_server_name,
    server_port : _request.request_server_port,
    url : _request.request_url,
    base_url : _request.request_base_url,
    app_url : _request.request_app_url,
    protocol : _request.server_protocol, // XXX: how do we get the request protocol?
    method : _request.request_method,
    headers : _request.headers,
    base_path : _request.request_path_info.replace(new RegExp(u.escape_re(_request.path_info)+"$"), ""),    

    // these can be re-set by acre.route
    body : _request.body,
    path_info : _request.path_info,
    query_string : _request.query_string,
    
    // set in request params
    params: {},
    body_params: {},
    
    start_time : _request.request_start_time,
    cookies : {},
    skip_cache : false
};

// if we get 'cache-control: no-cache' in the request headers (i.e., shift-reload),
// then set a flag that appfetchers can key off of.
// some browsers will by default issue this header for *all* XHRs, however,
// which can make requests very slow. the work-around is that if an 
// x-acre-cache-control header is present, then we do not set the flag
if ('cache-control' in acre.request.headers && !('x-acre-cache-control' in acre.request.headers)) {
    if (/no-cache/.test(acre.request.headers['cache-control'])) {
        acre.request.skip_cache = true;
    }
}

var mwlt_mode = false;

// Close to avoid leaking variables into the scope
(function () {
    var _MWAUTH_HOSTS = _hostenv.ACRE_ALLOW_MWAUTH_HOST_SUFFIX.split(' ');
     var ok = false;
     var host = acre.request.server_name;
     for (var a in _MWAUTH_HOSTS) {
         var h = _MWAUTH_HOSTS[a];
         if (host.match(h+'$')){ // && !(host.match('\.acrenet\.metaweb\.com$'))) {
             ok = true;
             break;
         }
     }
     if (ok)
         mwlt_mode = true;

    for (var name in _request.cookies) {
        if (name == 'metaweb-user-info') {
            var user_cookie = _request.cookies['metaweb-user-info'].value;

            function get_part(key) {
                var cookie_part = new RegExp('\\|('+key+')_(.*?)\\|');
                var match = cookie_part.exec(user_cookie);
                return decodeURIComponent(match[2]);
            }

            acre.request.user_info = {
               guid : get_part('g'),
               id : get_part('p'),
               name : get_part('u')
            };
        } else if (name == 'metaweb-user') {
            if (!ok) {
                syslog.debug("deleting metaweb-user cookie");
                delete _request.cookies['metaweb-user'];
            } else {
                acre.request.cookies[name] = _request.cookies[name].value;
            }
        } else {
            acre.request.cookies[name] = _request.cookies[name].value;
        }
    }

})();

/**
 * reset acre.request.query_string & body
 * 
 * Also parse params into objects for easy look-up:
 *   query_string --> acre.request.params
 *   body --> acre.request.body_params
 */
function set_request_params(query_string, body) {
    acre.request.query_string = query_string || "";
    acre.request.body = body || "";
    
    try {
        acre.request.params = (typeof query_string == 'string') ? acre.form.decode(query_string) : {};
        acre.request.body_params = (typeof body == 'string' && typeof acre.request.headers['content-type'] == 'string' && acre.request.headers['content-type'].match(/^application\/x-www-form-urlencoded/)) ? acre.form.decode(body) : {};
        //acre.environ.params = acre.request.params;           // deprecated
        //acre.environ.body_params = acre.request.body_params; // deprecated
    } catch (e) {
        acre.request.params = {};
        acre.request.body_params = {};
        //acre.environ.params = acre.request.params = {};
        //acre.environ.body_params = acre.request.body_params = {};
        console.warn("Invalid request: parameters were not properly encoded");
    }
}


// ------------------------------- acre.respose -----------------------------------------

function AcreResponse() {
    this.status = 200;
    this.headers = {};
    this.cookies = {};
}

// Variables set by internal private helpers
var AcreResponse_availability = false;
var AcreResponse_max_age = 0;
var AcreResponse_vary = [];
var AcreResponse_vary_cookies = {};

var AcreResponse_validate_header = function(name, value) {
    // according to http://www.w3.org/Protocols/rfc2616/rfc2616-sec2.html#sec2
    var http_token_re = /[-a-zA-Z0-9!#$%&'*+.^_`|~]+/; // ']

    // check that name and value are valid
    if (!http_token_re.test(name)) {
        throw new Error('illegal HTTP header name');
    }

    name = name.toLowerCase();

    if (/[\r\n]/.test(value)) {
        throw new Error('newline is illegal in HTTP header value');
    }
};

// AcreResponse methods are exposed to user scripts as acre.response.*
AcreResponse.prototype.set_header = function (name, value) {
    AcreResponse_validate_header(name, value);
    this.headers[name] = value;
};

AcreResponse.prototype.add_header = function (name, value) {
    AcreResponse_validate_header(name, value);

    // RFC2616 sec 4.2: It MUST be possible to combine the multiple
    //   header fields into one "field-name: field-value" pair, without
    //   changing the semantics of the message, by appending each
    //   subsequent field-value to the first, each separated by a comma.
    if (!(name in this.headers)) {
        this.headers[name] = value;
    } else if (u.isArray(this.headers[name])) {
        this.headers[name].push(value);
    } else {
        this.headers[name] = [this.headers[name], value];
    }
};

AcreResponse.prototype.set_header_default = function (name, value) {
    if (name.toLowerCase() in this.headers) {
        return;
    }
    this.set_header(name, value);
};

AcreResponse.prototype.clear_cookie = function (name, options) {
    if (typeof options == 'undefined') {
        options = {};
    }
    var clear_cookie_options = { domain:1, path:1, secure:1 };
    var newopts = {};
    for (k in clear_cookie_options) {
        if (k in options) {
            newopts[k] = options[k];
        }
    }
    newopts.max_age = 0;
    AcreResponse_vary_cookies[name] = 1;
    this.set_cookie(name, '', newopts);
};

// options is an object with valid properties being  domain, path, secure, max_age, expires
// max_age is preferred to expires, it gives a lifetime in seconds
// max_age=0 causes the cookie to be cleared
// expires is accepted as a string or a javascript Date object
// max_age causes an expires attribute to be generated too for IE's sake.
AcreResponse.prototype.set_cookie = function (name, value, options) {
    var valid_cookie_options = { domain:1, path:1, secure:1, max_age:1, expires:1 };

    if (typeof options == 'undefined') {
        options = {};
    }

    if (typeof options.max_age != 'undefined' && typeof options.max_age != 'number') {
        throw new Error('set_cookie() max_age must be a number');
    }

    // TODO should check value for non-cookie ok strings
    var cookie = { name: name, value: value };

    for (var k in options) {
        if (!(k in valid_cookie_options)) {
            throw new Error('Invalid cookie option "' + k + '"');
        }
        cookie[k] = options[k];
    }

    // the acre java code understands max-age= but not expires=
    // the jetty cookie manager converts max-age to expires in the response.
    if (typeof cookie.max_age == 'undefined') {
        // calculate max-age= from expires= if present
        if (typeof cookie.expires != 'undefined') {
            var d = cookie.expires;
            if (!(d instanceof Date)) {
                d = Date.parse(d);
            }

            // find the time from now until the expires= time
            var delta = d.getTime() - (new Date()).getTime();
            if (delta <= 0) {
                cookie.max_age = 0;
            } else {
                cookie.max_age = Math.ceil(delta / 1000.0);
            }
        }
    } else if (typeof cookie.expires != 'undefined') {
        // complain if both max-age= and expires= are given
        console.warn('Cookie "max_age" attribute overides "expires" attribute');
    }

    AcreResponse_vary_cookies[name] = 1;
    this.cookies[name] = cookie;
};

AcreResponse.prototype.set_cache_policy = function (policy) {
    switch (policy) {
        case 'fresh':
            AcreResponse_max_age = 0;
            AcreResponse_availability = false;
            break;
        case 'fast':
            AcreResponse_max_age = 3600;
            AcreResponse_availability = true;
            break;
    }
};

AcreResponse.prototype.set_policy =
    AcreResponse.prototype.set_cache_policy; // deprecated

// these AcreResponse_* functions are called during _hostenv.finish_response()
var AcreResponse_generate_date = function (d) {
    function padz(n) {
        return n > 10 ? n : '0' + n;
    }

    var MONTH_NAMES = [
        "January", "February", "March",
        "April", "May", "June",
        "July", "August", "September",
        "October", "November", "December"
    ];

    var WEEKDAY_NAMES = [
        "Sunday", "Monday", "Tuesday",
        "Wednesday", "Thursday", "Friday",
        "Saturday"
    ];

    var dayname = WEEKDAY_NAMES[d.getUTCDay()].slice(0,3);
    var day = padz(d.getUTCDate());
    var monthname = MONTH_NAMES[d.getUTCMonth()].slice(0,3);
    var year = d.getUTCFullYear();
    var hour = padz(d.getUTCHours());
    var minutes = padz(d.getUTCMinutes());
    var seconds = padz(d.getUTCSeconds());

    return dayname+', '+day+' '+monthname+' '+year+' '+hour+':'+ minutes +':'+ seconds+' UTC';
};

var AcreResponse_set_expires = function (that) {
    var expires = new Date(acre.request.start_time.getTime()+(AcreResponse_max_age*1000));
    var d = AcreResponse_generate_date(expires);

    that.set_header_default('Expires', d);
};

var AcreResponse_set_last_modified = function (that) {
    var d = AcreResponse_generate_date(acre.request.start_time);
    that.set_header_default('Last-Modified', d);
};

var AcreResponse_set_cache_control = function (that) {
    var cc = '';

    if (AcreResponse_availability == true) {
        cc += 'public';
        cc += ', no-cache="Set-Cookie"';

        cc += ', max-age='+AcreResponse_max_age;
        for (var a in AcreResponse_vary_cookies) {
            cc += ', maxage-vary-cookie="'+AcreResponse_max_age+'|'+a+'"';
        }

    } else {
        cc += 'private, no-cache, max-age=0';
    }

    that.set_header_default('cache-control', cc);
};

var AcreResponse_set_vary = function (that) {
    if (AcreResponse_vary_cookies) {
        var vary = ['Cookie'];
    } else {
        var vary = [];
    }

    for (var a=0; a < AcreResponse_vary.length; a++) {
        vary.push(a);
    }

    if (vary.length > 0) {
        acre.response.set_header_default('Vary', vary.join(', '));
    }
};

var AcreResponse_set_metaweb_vary = function (that) {
    var varied_cookies = [];
    for (var c in AcreResponse_vary_cookies) {
        varied_cookies.push('Cookie['+c+']');
    }

    var vary = varied_cookies;
    for (var a=0; a < AcreResponse_vary.length; a++) {
        vary.push(a);
    }

    if (vary.length > 0) {
        acre.response.set_header_default('x-metaweb-vary', vary.join(', '));
    }
};

acre.response = null;


// --------------------------- acre.errors ---------------------------------

/*
 * Setup the acre.error object in case the request is for an error page
 */
if (_request.error_info) {
    acre.error = _request.error_info;

    // error-specific info is passed as a JSON string - decode it here
    var info_json = acre.error.info_json;
    acre.error.info = _json.parse('['+acre.error.info_json+']')[0];
    delete acre.error.info_json;
}

acre.errors = {};

/**
 *  exception class to allow bailing out early, e.g.
 *   after responding quickly with an error code.
 *  this api is likely to change so this exception
 *  should be thrown by calling acre.exit(), not
 *  by thowing it directly.  it is documented here
 *  because developers might notice this exception
 *  getting caught in their javascript "catch" blocks.
 *  if this occurs, the best thing is probably to
 *  re-throw the exception.
 */
acre.errors.AcreRouteException = function () {};
acre.errors.AcreRouteException.prototype = new Error('acre.route');

acre.errors.AcreExitException = function () {};
acre.errors.AcreExitException.prototype = new Error('acre.exit');
_hostenv.AcreExitException = acre.errors.AcreExitException;

acre.errors.URLError = function (message) {
    this.message = message;
};
acre.errors.URLError.prototype = new Error('acre.errors.URLError');
acre.errors.URLError.prototype.name = 'acre.errors.URLError';
_hostenv.URLError = acre.errors.URLError;

acre.errors.URLTimeoutError = function (message) {
    this.message = message;
};
acre.errors.URLTimeoutError.prototype = new acre.errors.URLError('acre.errors.URLTimeoutError');
acre.errors.URLTimeoutError.prototype.name = 'acre.errors.URLTimeoutError';
_hostenv.URLTimeoutError = acre.errors.URLTimeoutError;

_topscope.AcreExitException = acre.errors.AcreExitException; // deprecated
_topscope.URLError = acre.errors.URLError; // deprecated

_hostenv.Error = Error;


// ------------------------------- acre.environ -----------------------------------
/*
acre.environ = _request; // deprecated
if (acre.request.user_info) {
    acre.environ.user_info = acre.request.user_info; // deprecated
}
*/


// ------------------------------------ JSON ------------------------------

_topscope.JSON = {
    stringify: function(obj, resolver, space) {
        try {
            return _json.stringify(obj, resolver, space);
        } catch (e) {
          var message = e.message.indexOf("JSON.stringify:") == 0
                          ? e.message
                          : e.message.replace(/^[^:]*:\s*/, '');
            throw new Error(message);
        }
    },
    parse: function(str, reviver) {
        try {
            if (typeof reviver !== "undefined" && reviver != null) {
                console.warn("Acre currently ignores 'reviver' in JSON.parse()");
            }

            return _json.parse(str);
        } catch (e) {
            // Everything after the first :, if present
            throw new Error(e.message.replace(/^[^:]*:\s*/, ''));
        }
    }
};


// ------------------------------ xml/html parsers ----------------------------

if (typeof acre.xml == 'undefined') {
    acre.xml = {};
}

if (typeof acre.html == 'undefined') {
    acre.html = {};
}

/**
 *  Parse a string containing XML into a DOM Document object. <br/><br/>
 *
 *  The returned Document object complies to the W3C EcmaScript bindings for
 *  the DOM.
 *
 *  @param xml_str the XML string to be parsed
 */
acre.xml.parse = function(xml_str) {
    return _domparser.parse_string(xml_str, "xml");
};

/**
 *  Parse a string containing XML into a DOM Document object and support namespaces. <br/><br/>
 *
 *  The returned Document object complies to the W3C EcmaScript bindings for
 *  the DOM.
 *
 *  @param xml_str the XML string to be parsed
 */
acre.xml.parseNS = function(xml_str) {
    return _domparser.parse_ns_string(xml_str, "xml");
};

/**
 *  Parse a string containing HTML into a DOM Document object. <br/><br/>
 *
 *  The returned Document object complies to the W3C EcmaScript bindings for
 *  the DOM.
 *
 *  @param html_str the HTML string to be parsed
 */
acre.html.parse = function(html_str) {
    return _domparser.parse_string(html_str, "html");
};


// ------------------------ acre.hash ------------------------------

if (typeof acre.hash == 'undefined') {
    acre.hash = {};
}

acre.hash.hex_sha1 = function (s) {
    return _hostenv.hash("SHA-1", s, true);
};

acre.hash.b64_sha1 = function (s) {
    return _hostenv.hash("SHA-1", s, false);
};

acre.hash.hex_md5 = function (s) {
    return _hostenv.hash("MD5", s, true);
};

acre.hash.b64_md5 = function (s) {
    return _hostenv.hash("MD5", s, false);
};

acre.hash.hex_hmac_sha1 = function (key, data) {
    return _hostenv.hmac("HmacSHA1", key, data, true);
};

acre.hash.b64_hmac_sha1 = function (key, data) {
    return _hostenv.hmac("HmacSHA1", key, data, false);
};

acre.hash.hex_hmac_md5 = function (key, data) {
    return _hostenv.hmac("HmacMD5", key, data, true);
};

acre.hash.b64_hmac_md5 = function (key, data) {
    return _hostenv.hmac("HmacMD5", key, data, false);
};


// ------------------------------------------------------------------------

// used by the keystore and the datastore to partition data based on app_id

_topscope._request_app_guid = null;

// ------------------------ keystore --------------------------------------

if (typeof acre.keystore == 'undefined') {
    acre.keystore = {};
}

acre.keystore.get = function (name) {
    if (_topscope._request_app_guid !== null) {
        return _ks.get_key(name, _topscope._request_app_guid);
    } else {
        return null;
    }
};

acre.keystore.keys = function () {
    if (_topscope._request_app_guid !== null) {
        return _ks.get_keys(_topscope._request_app_guid);
    } else {
        return null;
    }
};

acre.keystore.remove = function (name) {
    if (_topscope._request_app_guid !== null) {
        _ks.delete_key(name, _topscope._request_app_guid);
    }
};

if (_request.trusted) {
    acre.keystore.put = function (name, token, secret) {
        if (_topscope._request_app_guid !== null) {
            return _ks.put_key(name, _topscope._request_app_guid, token, secret);
        } else {
            return null;
        }
    };
}

//------------------------ datastore --------------------------

if (_request.trusted && _datastore) { // the _datastore object won't be available in all environments so we need to check first
    var store_scope = {};
    store_scope.syslog = syslog;
    store_scope.store = _datastore;
    store_scope.acreboot = _topscope;
    _hostenv.load_system_script('datastore.js', store_scope);
    store_scope.augment(acre);
}

//------------------------ taskqueue --------------------------

if (_request.trusted && _taskqueue) { // the _taskqueue object won't be available in all environments so we need to check first
    var queue_scope = {};
    queue_scope.syslog = syslog;
    queue_scope.queue = _taskqueue;
    _hostenv.load_system_script('taskqueue.js', queue_scope);
    queue_scope.augment(acre);
}


// ------------------------------ urlfetch -----------------------------------

/**
 *   allows an acre script to fetch data from an external url.<br/><br/>
 *
 *   this may not be part of the standard api, we will probably want to
 *   restrict which urls are available to prevent abuse.<br/><br/>
 *
 *   note that response.body is a javascript string, which means it
 *   has already been decoded.  there are bugs in this process,
 *   because we don't sniff for <meta http-equiv="content-type"...> here.<br/><br/>
 *
 *   <pre>
 *   returns a response object, e.g.:
 *     {
 *       status: 200,
 *       headers: {
 *          "content-length": "14",
 *          "content-type": "text/plain; charset=UTF-8",
 *       },
 *       content_type: "text/plain",
 *       body: "hocus.\npocus.\n"
 *    }
 *    </pre><br/><br/>
 *
 *  all header names are canonicalized to lowercase
 *
 */

var _system_urlfetch = function(url,method,headers,content,sign) {
    return _urlfetch(true,url,method,headers,content,sign);
};
var _system_async_urlfetch = function(url,method,headers,content,sign) {
    return _urlfetch(true,url,method,headers,content,sign, _hostenv.urlOpenAsync);
};

// acre.urlfetch is disabled in error scripts.  the reason is
//  that error scripts are given a special extension on the
//  original script's time quota.  they can't be allowed
//  to re-enter the server or they would be able to pass on
//  that time quota to another request.
// this could be relaxed to allow users to call services
//  other than acre services.
acre.async = {};
if (!acre.error) {
    acre.urlfetch = function(url,method,headers,content,sign) {
        return _urlfetch(false,url,method,headers,content,sign);
    };
    acre.async.urlfetch = function(url, method, headers, content, sign) {
        return _urlfetch(false,url,method,headers,content,sign,_hostenv.urlOpenAsync);
    };
    acre.async.wait_on_results = function (timeout) {
        _hostenv.async_wait(timeout);
    };
} else {
    acre.urlfetch = function(url,method,headers,content,sign) {
        throw new Error('acre.urlfetch() is restricted in error scripts');
    };
    acre.async.urlfetch = function(url, method, headers, content, sign) {
        throw new Error('acre.async.urlfetch() is restricted in error scripts');
    };
    acre.async.wait_on_results = function () {
        throw new Error('acre.async.wait_on_results() is restricted in error scripts');
    };
}

/*
 * Fetches an HTTP URL.
 *
 * Parameters:
 *
 *  - system: whether or not this is a fetch made by acre directly or by the user script [required]
 *  - url: the URL to fetch [required]
 *  - method: the HTTP method to use to fetch it [optional, defaults to GET]
 *  - headers: the HTTP headers to pass along with the request [optional]
 *  - content: the HTTP payload of the request [optional]
 *  - sign: whether or not sign the request (using oauth) [optional]
 *
 * NOTE: sign can be either a boolean or an object. If a boolean
 * the oauth subsystem will look for the right key based on the domain
 * name of the request being made. If it's an object it must contain the key/secret
 * pair that identifies the application against the oauth provider and
 * must be in the form:
 *
 *     {
 *       "consumerKey" : key,
 *       "consumerSecret" : secret
 *     }
 */
var _urlfetch = function (system, url, options_or_method, headers, content, sign, _urlopener) {
    _urlopener = _urlopener || _hostenv.urlOpen;

    // exception generation would be nice here
    if (typeof url != 'string' || !url.length) {
        throw new acre.errors.URLError("'url' argument (1st) to acre.urlfetch() must be a string");
    }
    var method;
    var response_encoding = null;
    var callback;
    var errback;
    var timeout;
    if (options_or_method && typeof options_or_method === 'object') {
        if (typeof headers !== 'undefined' || typeof content !== 'undefined' || typeof sign !== 'undefined') {
            throw new acre.errors.URLError("'options' argument (2nd) to acre.urlfetch() must not be followed by extra arguments");
        }

        method = options_or_method.method;
        headers = options_or_method.headers;
        content = options_or_method.content;
        sign = options_or_method.sign;
        response_encoding = options_or_method.response_encoding;
        callback = options_or_method.callback || function (res) { };
        errback = options_or_method.errback || function (res) { throw res; };
        timeout = options_or_method.timeout;
    } else if (options_or_method) {
        method = options_or_method;
    }

    if (typeof sign !== 'undefined' && typeof sign !== 'boolean' && typeof sign !== 'object') {
        throw new acre.errors.URLError("'sign' argument (5th) or option to acre.urlfetch() must be a boolean or an object");
    }

    if (typeof method != 'string') method = 'GET';
    if (typeof headers != 'object') headers = {};
    if (typeof content != 'string' && !(content instanceof Binary)) content = '';
    if (typeof response_encoding != 'string') response_encoding = 'utf-8';

    // lowercase all the header names so we don't have to worry about
    // case sensitivity
    for (var hk in headers) {
        var hkl = hk.toLowerCase();
        if (hk == hkl) continue;
        var hkv = headers[hk];
        delete headers[hk];
        headers[hkl] = hkv;
    }

    // set the User-Agent and X-Acre-App headers
    headers['user-agent'] = 'Acre/' + acre.version + ' ' + acre.request.server_name;
    if (acre.current_script)
        headers['x-acre-app'] = (acre.current_script.app &&
                                 acre.current_script.app.id) ? acre.current_script.app.id :  _hostenv.DEFAULT_HOST_PATH;

    // pass through Cache-Control: and Pragma: headers.
    // this is useful when a user clicks shift-reload in the browser.
    // passing the cache disabling headers downstream ensures we
    // don't get a fresh acre page of stale data in that case.
    // in general this is might be bad practice and it should be
    // made more specific to the "browser reload" case.
    if ('cache-control' in acre.request.headers && !('cache-control' in headers)) {
        headers['cache-control'] = acre.request.headers['cache-control'];
    }
    if ('pragma' in acre.request.headers && !('pragma' in headers)) {
        headers['pragma'] = acre.request.headers['pragma'];
    }

    var cookiestr = ("cookie" in headers) ? headers.cookie : '';
    var cookies = ("cookie" in headers) ? [headers.cookie] : [];

    // sign the request, either with metaweb cookies (if available in the request) or with oauth
    // this may add an Authorization: header
    if (sign) {
        if ("metaweb-user" in acre.request.cookies) {
            // if the request headers contained the 'metaweb-user' cookie
            // pass it along and use the information contained in there to
            // simulate a 2-legged oauth

            var user_cookie_parts = acre.request.cookies['metaweb-user'].split('|');
            
            // if the metaweb-user cookie is not already set, copy it over.
            // NOTE: we have to re-urlencode the underscore in the usernames or they won't be able to log in!
            if (cookiestr.indexOf("metaweb-user=") < 0) {
                var encoded_parts = [];
                for each (var part in user_cookie_parts) {
                    if (part.charAt(1) == '_') {
                        encoded_parts.push(part.charAt(0) + "_" + part.substring(2).replace('_',"%5F"));
                    } else {
                        encoded_parts.push(part);
                    }
                }
                cookies.push("metaweb-user=" + encoded_parts.join('|'));
            }

            var token = user_cookie_parts[4];
            var consumer = {
                consumerKey    : user_cookie_parts[3].split('#')[1],
                consumerSecret : token
            };
            
            // XXX sometimes this fails, in that case we want to ignore it since
            // we have an auth method (the metaweb-user cookie);
            try {
                var signed = oauth_sign(url, method, headers, content, consumer, token);
            } catch (e) {
                syslog.warn({'exception':e.message});
                var signed = {};
            }
        } else {
            try {
                // if not, use the regular oauth signature
                if (typeof sign === 'boolean') {
                    // NOTE: the oauth credentials will be inferred from the URL and extracted
                    // automatically from the keystore
                    var signed = oauth_sign(url, method, headers, content);
                } else {
                    var signed = oauth_sign(url, method, headers, content, sign);
                }
            } catch (e if _hostenv.write_user != null) {
                // If there's a write user, we can still proceed
                syslog.debug("Using writeuser instead of signing", "sign.writeuser");
                var signed = {};
            } catch (e if typeof errback !== 'undefined') {
                errback(e);
                return null;
            }
        }

        if (signed.url) url = signed.url;
        if (signed.headers) headers = signed.headers;
        if (signed.content) content = signed.content;
    }

    // this should implement a more general browser-like cookiejar?
    // the unusual part of mwLastWriteTime handling is where we push it back to the browser
    var [ckey, cval] = cookiejar_domain_match(url);
    if (cval !== null) {
        var c = 'mwLastWriteTime='+cval;
        cookies.push(c);
        syslog.debug({generated_mwlt:c}, "urlfetch.attached.generated_mwlt");
    }

    if (cookies.length > 0) {
        headers.cookie = cookies.join('; ');
    }

    var log_to_user = (typeof console.log_urlfetches == 'boolean' && console.log_urlfetches);

    function response_processor(url, res, callback, errback) {
        if (res instanceof Error) {
            if (typeof errback !== 'undefined') {
                errback(res);
                return null;
            }

            return e;
        }

        // this should implement a more general browser-like cookiejar?
        // the unusual part of mwLastWriteTime handling is where we push it back to the browser
        if (typeof res.cookies.mwLastWriteTime != 'undefined') {
            syslog.debug(
                {
                    'update_hostname':res.cookies.mwLastWriteTime.domain,
                    'update_cookie':JSON.stringify(res.cookies.mwLastWriteTime)
                }, 'urlfetch.received.mwlwt');
            _cookie_jar[res.cookies.mwLastWriteTime.domain] =
                res.cookies.mwLastWriteTime.value;
            _cookie_jar_best_match = res.cookies.mwLastWriteTime.domain;
        }

        if (res.status < 199 || res.status > 300) {
            var e = new acre.errors.URLError('urlfetch failed: ' + res.status);
            e.response = res;

            // this should get passed through to the error handling script as acre.error.info
            e.info = res;

            if (typeof errback !== 'undefined') {
                errback(e);
                return null;
            }

            res = e;
        }

        if (typeof callback !== 'undefined') {
            callback(res);
            return null;
        }

        return res;
    }

    // XXX TODO _hostenv.urlOpen should interpret and strip any charset=
    //  in the response content-type - all we see is a javascript string.
    
    var response = {};
    if (_urlopener == _hostenv.urlOpen) {

        response = _hostenv.urlOpen(
          url, method, content, headers, system, log_to_user, response_encoding
        );
        response = response_processor(url, response);

        if (response instanceof acre.errors.URLError)
            throw response;
    } else if (_urlopener == _hostenv.urlOpenAsync) {
        _hostenv.urlOpenAsync(url, method, content, headers, timeout, system, log_to_user, response_encoding,
                              function(url, res) {
                                  response_processor(url, res, callback, errback);
                              });
        response = null;
    }

    return response;
};


//----------------------------- cookie jar ------------------------------

// acre_cookiejar == "host:mwlt:host:mwlt"
//   ie   "sandbox-freebase.com:xxx|xxxxgg_ttt|dddd:freebase.com:123|345|6666|qa"
function parse_cookiejar(cj) {
    if (!cj) return {};
    var parts = cj.split(":");
    if (!!(parts.length % 2)) {
        // Invalid Cookie Jar, fail.
        syslog.warn({jar:cj}, "acreboot.cookie_jar.invalid");
        return {};
    }

    var out = {};
    var key = null;
    for (var a in parts) {
        var part = parts[a];
        if (key == null) {
            key = part;
        } else {
            out[key] = part;
            key = null;
        }
    }

    return out;
}

function serialize_cookiejar(cjar) {
    var out = [];

    for (var a in cjar) {
        out.push(a);
        out.push(cjar[a]);
    }
    return out.join(':');
}

function cookiejar_domain_match(url) {
    var url_parts = u.parseUri(url);
    var hostname = url_parts.host;
    
    for (var a in _cookie_jar) {
        if (a == hostname) {
            return [a, _cookie_jar[a]];
        } else if (a.match(/^\./) && hostname.match(a+'$')) {
            return [a, _cookie_jar[a]];
        }
    }
    return [null, null];
}

if (mwlt_mode === false) {
    var cj_val = ('acre_cookiejar' in acre.request.cookies) ?
        acre.request.cookies.acre_cookiejar : '';

    var _cookie_jar_best_match = null;
    var _cookie_jar = parse_cookiejar(cj_val);
    syslog.debug({'jar':JSON.stringify(_cookie_jar),
                  'raw_value':cj_val}, 'acreboot.cookie_jar');
} else {
    var mwlt_val = ('mwLastWriteTime' in acre.request.cookies) ?
        acre.request.cookies.mwLastWriteTime : null;

    var _cookie_jar_best_match = null;
    var _cookie_jar = {};
    if (mwlt_val !== null) {
        _cookie_jar[_hostenv.ACRE_MWLT_MODE_COOKIE_SCOPE] = mwlt_val;
    }
    syslog.debug({'jar':JSON.stringify(_cookie_jar),
                  'raw_value':mwlt_val}, 'acreboot.cookie_jar.mwlt_mode');
}


// -------------------------------- file handlers -------------------------------------

// the built-in file handlers
// additional handlers are loaded by acremjt.js (.mjt) and freebase.js (.mql)
// apps can also declare custom handlers in manifest files
acre.handlers = {};

acre.handlers.acre_script = {
    'to_js': function(script) {
        return script.get_content().body;
    },
    'to_module': function(compiled_js, script) {
        return compiled_js;
    },
    'to_http_response': function(module, script) {
        // XXX - should collect acre.write output
        return {body:"", headers:{}};
    }
};

acre.handlers.passthrough = {
    'to_js': function(script) {
        return "var module = ("+JSON.stringify(script.get_content())+");";
    },
    'to_module': function(compiled_js, script) {
        return compiled_js.module;
    },
    'to_http_response': function(module, script) {
        return module;
    }
};

// XXX - would be nice if we could actually create JS out of this and cache it
acre.handlers.binary = {
    'to_js': function(script) {
        return null;
    },
    'to_module': function(compiled_js, script) {
        return script.get_content();
    },
    'to_http_response': function(module, script) {
        return module;
    }
};

// used by script.to_module() in proto_require
var _load_handler = function(scope, handler_name, handler_path) {
    var handler;
    
    // default to passthrough handler (safest)
    handler_name = handler_name || "passthrough";

    if (handler_path) {
        handler = scope.acre.require(handler_path).handler();
        scope.acre.handlers[handler_name] = handler;
    } else if (scope.acre.handlers[handler_name]){
        handler = scope.acre.handlers[handler_name];
    } else {
        throw make_appfetch_error("Unsupported handler: " + handler_name, APPFETCH_ERROR_APP);
    }
    
    handler.name = handler_name;
    handler.path = handler_path || handler_name;

    return handler;
};


// ------------------------------------- appfetch methods ------------------------------------

/* 
 * appfetch methods retrieve app metadata for a given host
 *
 *  - called from proto_require()
 *  - each registered appfetch method is called until one succeeds
 *  - successful results are added to cache with key: 
 *      METADATA:{app.guid}:{app.as_of}
 *  - app_data.hosts as pointers to results also cached:
 *      HOST:{app.hosts[i]} with value METADATA:{app.guid}:{app.asof}
 */

 var appfetch_methods = [],
 METADATA_CACHE = {};

/*
*  Helper functions for creating appfetch methods
*/
var APPFETCH_ERROR_UNKNOWN = 1,
    APPFETCH_ERROR_METHOD = 2,
    APPFETCH_ERROR_APP = 3,
    APPFETCH_ERROR_NOT_FOUND = 4,
    APPFETCH_THUNK = 5;

function make_appfetch_error(msg, code, info, parent) {
    msg = msg || 'Unknown Error';
    code = code || APPFETCH_ERROR_UNKNOWN;
    info = info || {};
    parent = parent || null;

    var e = new Error(msg);
    u.extend(e, info);

    e.__code__ = code;
    e.__parent__ = parent;

    return e;
}

function register_appfetch_method(name, resolver, inventory_path, get_content) {

    var appfetcher = function(host, app) {
        // avoid infinite recursion (e.g., symlink to self)
        var MAX_DIRECTORY_DEPTH = 2;
        
        function _add_directory(app, resource, resource_obj, base_path, depth) {
            depth = depth || 0;
            base_path = base_path || "";
            
            var dir = inventory_path(app, resource, resource_obj);

            // app is empty!
            if (!dir && (depth === 0)) {
                syslog.debug({'host': host, 'resource': resource}, "appfetch." + name + ".not_found");
                throw make_appfetch_error("Not Found Error", APPFETCH_ERROR_NOT_FOUND);
            }

            // skip empty subdirs
            if (dir) {
                for (var f in dir.files) {
                    if (/~$/.test(f)) continue;         // skip ~ files (e.g., emacs temp files)
                    var file = dir.files[f];
                    var fn = base_path + file.name;
                    file.name = fn;
                    file.source = name;
                    app.files[fn] = file;
                    
                    // also build up a filename lookup dict
                    // so we can support legacy on-disk apps
                    // that expect stripped extensions
                    function add_filename(lookup_name, name, ext) {
                        app.filenames[lookup_name] = app.filenames[lookup_name] || {};
                        app.filenames[lookup_name][ext] = name;
                    }
                    add_filename(fn, fn, "none");
                    var exts = file.name.split(".");
                    if (exts.length > 1) {
                        var ext = exts.pop();
                        var fn_noext = exts.join(".");
                        add_filename(fn_noext, fn, ext);
                    }
                }
                if (depth < MAX_DIRECTORY_DEPTH) {
                    for (var d in dir.dirs) {
                        if (/^\./.test(d)) continue;     // skip . directories (e.g., '.svn')
                        var subdir = dir.dirs[d];
                        _add_directory(app, resource + "/" + d, subdir, base_path + d + "/", depth + 1);
                    }
                }
            }
        }

        var resource = resolver(host);
        if (!resource) {
            syslog.debug({'host': host}, "appfetch." + name + ".not_found");
            throw make_appfetch_error("Not Found Error", APPFETCH_ERROR_NOT_FOUND);      
        }

        // this will recurse until all files are added or MAX_DIRECTORY_DEPTH reached
        app.source = name;
        app.filenames = {};
        _add_directory(app, resource);

        syslog.debug({'host': host}, "appfetch." + name + ".found");
        return app;  
    };

    // if method throws an appfetch thunk, check the cache before re-calling
    var CacheTrampoline = function(f) {
        return function () {
            try {
                return f.apply(this, arguments);
            } catch (e if e.__code__ == APPFETCH_THUNK) {
                if (!acre.request.skip_cache) {
                    // check cache and optionally call the thunk...
                    var app = e.args[0];
                    var ckey = "METADATA:"+app.guid+":"+app.as_of;
                    if (ckey in METADATA_CACHE) {
                        syslog({'s' : 'inprocess', 'key' : ckey, 'm' : 'trampoline' }, 'appfetch.cache.success');
                        return METADATA_CACHE[ckey];
                    } else {
                        var r2 = _cache.get(ckey);
                        if (r2 !== null) {
                            syslog({'s' : 'memcache', 'key' : ckey, 'm' : 'trampoline' }, 'appfetch.cache.success');
                            return JSON.parse(r2);
                        }
                    }
                }

                var method = get_appfetch_method(e.method);
                if (!method) {
                    throw make_appfetch_error("No appfetch method " + e.method, APPFETCH_ERROR_METHOD);
                }

                return CacheTrampoline(method.fetcher).apply(null, e.args);
            }
        };
    };

    var url_get_content = function() {
        syslog.debug(this.content_id, "url.get.content");
        var fetch = _system_urlfetch(this.content_id);
        fetch.headers['content-type'] = this.media_type;
        return fetch;
    }

    if ((typeof name !== "string") || 
        (typeof resolver !== "function") || 
        (typeof inventory_path !== "function")) {
        throw make_appfetch_error("Invalid arguments to make_appfetch_method", APPFETCH_ERROR_METHOD)
    }

    if (get_appfetch_method(name)) {
        throw make_appfetch_error("Appfetch method '" + name + "' already registered", APPFETCH_ERROR_METHOD)
    }

    appfetch_methods.push({
        'name': name,
        'cachable': true,
        'fetcher': CacheTrampoline(appfetcher),
        'get_content': (get_content || url_get_content)
    });
};

function get_appfetch_method(method_name) {
    for (var a=0; a < appfetch_methods.length; a++) {
        var method = appfetch_methods[a];
        if (method.name == method_name) {
            return method;
        }
    }
};


/*
 *  Helper function for defaulting app metadata 
 *  and applying metadata files
 */
function set_app_metadata(app, md) {
    app = app || {};
    
    // create a clean copy and delete keys that
    // could create security issues or other failures
    var skip_keys = {
        'source': true,
        'host': true,
        'hosts': true,
        'guid': true,
        'as_of': true,
        'path': true,
        'id': true
    };

    // splice remaining metadata onto the app
    // try not to damage source metadata
    if (md) {
        for (var key in md) {
            if (!skip_keys[key]) {
                app[key] = u.isPlainObject(md[key]) ? 
                            u.extend(true, app[key] || {}, md[key]) : 
                            md[key];
            }
        }        
    }

    // initialize values used by acre
    if (app.host) {
        app.hosts = app.hosts || [app.host];
        app.guid = app.guid || app.host;
        app.as_of = app.as_of || null; 
        app.path = app.path || compose_req_path(app.host);
        app.id = app.id || host_to_namespace(app.host);
    }
    app.versions = app.versions || [];
    app.mounts = app.mounts || {};
    app.files = app.files || {};
    
    return app;
};


/*
 *  Cache appfetcher
 *
 *  Special appfetch method that checks cache 
 *  for previously fetched apps (any method)
 *
 */
var appfetch_cache = function(host) {
    if (host in METADATA_CACHE) {
        syslog.info({'host': host, 's': 'inprocess', 'm': 'appfetch_cache'}, 'appfetch.cache.success');
        return METADATA_CACHE[host];
    }

    if (acre.request.skip_cache) {
        syslog.info({'host': host, 'key': "HOST:"+host}, 'appfetch.cache.skip');
        throw make_appfetch_error("Not Found Error", APPFETCH_ERROR_NOT_FOUND);
    }

    var ckey = _cache.get("HOST:"+host);
    if (ckey == null) {
        syslog.info({'host': host, 'key': "HOST:"+host}, 'appfetch.cache.host.not_found');
        throw make_appfetch_error("Not Found Error", APPFETCH_ERROR_NOT_FOUND);
    }

    var res = _cache.get(ckey);
    if (res === null) {
        syslog.info({'host': host, 'key': ckey}, 'appfetch.cache.metadata.not_found');
        throw make_appfetch_error("Not Found Error", APPFETCH_ERROR_NOT_FOUND);
    }

    syslog.info({'key': ckey, 's': 'memcache', 'm': 'appfetch_cache'}, 'appfetch.cache.success');

    return JSON.parse(res);  
};

var cache_get_content = function() {
    var method = get_appfetch_method(this.source);
    if (!method) {
        throw make_appfetch_error("No appfetch method " + this.source, APPFETCH_ERROR_METHOD);
    }

    return method.get_content.apply(this);
}

appfetch_methods.push({
    'name': 'cache',
    'cachable': false,
    'fetcher': appfetch_cache,
    'get_content': cache_get_content
});


/*
 *  Disk appfetcher
 *
 *  Built-in method that loads apps from disk
 */
var disk_resolver = function(host) {
    return _hostenv.STATIC_SCRIPT_PATH + host_to_namespace(host);
};

var disk_inventory_path = function(app, disk_path) {
    var res = {
        dirs : {},
        files : {}
    };

    app.ttl = 0     // don't cache disk apps for now

    var files = _file.files(disk_path);
    if (!files) return null;

    u.each(files, function(i, file) {
        var f = new _file(disk_path+"/"+file, false);
        var file_data = {
            name: file
        };

        if (f.dir) {
            // false means we don't know what's in the directory
            // so will have to recursively fetch
            res.dirs[file] = false;
        } else if (file_data.name !== '') {
            file_data.content_id = disk_path+'/'+file;
            file_data.content_hash = disk_path+"/"+file+f.mtime;
            res.files[file] = file_data;
        }
        delete f;        
    });
    
    return res;
}

var disk_get_content = function() {
    syslog.debug(this.content_id, "disk.get.content");
    //open the file in binary mode if there is a media_type and it starts with application/ or image/
    var f = new _file(this.content_id, this.media_type != undefined && (this.media_type.indexOf('image/') == 0  
                                                                        || this.media_type ==  'application/octet-stream'
                                                                        || this.media_type == 'multipart/form-data'));
    var res = {
        'status':200,
        'headers':{
            'content-type':this.media_type
        },
        'body':f.body
    };
    delete f;
    return res;
}

register_appfetch_method("disk", disk_resolver, disk_inventory_path, disk_get_content);


/*
 *  Load custom appfetch methods
 */

// XXX - how can we make this dynamic?
var custom_methods = [
    "googlecode.js", 
    "webdav.js"
    /* freebase graph method registered in freebase.js */
];

for (var i=0; i < custom_methods.length; i++) {
    var method_scope = {};
    _hostenv.load_system_script(custom_methods[i], method_scope);
    method_scope.appfetcher(register_appfetch_method, make_appfetch_error, _system_urlfetch);
}


//-------------------------------- console - part 1 --------------------------------------

var console_scope = {};
console_scope.userlog = function(level,arr) { return _hostenv.userlog(level,arr); };
_hostenv.load_system_script('console.js', console_scope);
console_scope.augment_topscope(_topscope);
console_scope.augment_acre(acre);


// ------------------------------ deprecation ------------------------------------------

var deprecate_scope = {};
deprecate_scope.syslog = syslog;
_hostenv.load_system_script('acre_deprecate.js', deprecate_scope);
var deprecate = deprecate_scope.deprecate;


// --------------------------------- mjt ------------------------------------------

// NOTE: mjt needs the 'console' object defined at init to work properly
acre._load_system_script = function (script) {
    return _hostenv.load_system_script(script, _topscope);
};

// needed by acremjt.js to load scripts
_hostenv.load_system_script('acrexhr.js', _topscope);
_hostenv.load_system_script('acremjt.js', _topscope);

// remove the script loader from the environment
delete acre._load_system_script;

// Initialize the mjt handler
acre.handlers.mjt = mjt.acre.handler();
delete mjt.acre.handler;

// Initialize some mjt variables
mjt.debug = 1;

// expose a function for deprecating
mjt.deprecate = function () {
}

// prepare acre.form.*
acre.form = {
    quote : mjt.formquote,
    encode : mjt.formencode,
    decode : mjt.formdecode,
    build_url : mjt.form_url
};

acre.formquote =  acre.form.quote; // deprecated
acre.formencode = acre.form.encode; // deprecated
acre.formdecode = acre.form.decode; // deprecated
acre.form_url =  acre.form.build_url; // deprecated

// add html encoding to the html object
acre.html.encode = mjt.htmlencode;
acre.htmlencode = mjt.htmlencode; // deprecated

// prepare acre.markup.*
acre.markup = {};
acre.markup.bless = mjt.bless;
acre.markup.stringify = mjt.flatten_markup;
acre.markup.define_browser_var = function(obj,name) {
    return acre.markup.bless('<script type="text/javascript">var ' + name + ' = ' + JSON.stringify(obj).replace(/\//g,'\\/') + ';</script>');
};

acre.markup.MarkupList = mjt.MarkupList;

// keep an internal copy of the global used by acremjt.js
var _mjt = mjt;

_mjt.deprecate = deprecate_scope.deprecation_wrapper;

acre.template = {};

// name is provided for user debugging
// source is the source text.
acre.template.load_from_string = function (source, name) {
    var script_name = 'eval/' + name.replace(/[^a-zA-Z0-9_]/g, '_');

    // the compiler creates a TemplatePackage but doesn't evaluate it.
    // here we create a package, generate the js, and then serialize it
    var srcpkg = _mjt.acre.compile_string(source, name);
    var js_text = 'var pkgdef = (' + srcpkg.toJS() + '); pkgdef';

    // create a runtime TemplatePackage from the generated and serialized package
    var tobj = eval(js_text);
    var pkg = (new _mjt.TemplatePackage()).init_from_js(tobj.pkgdef).toplevel();
    var pkgtop = pkg._main.prototype.tpackage.tcall;

    return pkgtop;
};

// provide a string of template markup and compile it to JS
// useful for sending compiled templates over the wire
acre.template.string_to_js = function (string, name) {
    return _mjt.acre.compile_string(string, name).toJS();
};

// LATER
// hide the global 'mjt' symbol
//delete mjt;


// ----------------------------- acre.freebase -----------------------------------------

var mjt_freebase_whitelist = {
    "date_from_iso" : true,
    "date_to_iso" : true,
    "mqlkey_quote" : true,
    "mqlkey_unquote" : true
}

acre.freebase = {};
var _system_freebase = {};

for (var k in _mjt.freebase) {
    if (k in mjt_freebase_whitelist) {
        acre.freebase[k] = _mjt.freebase[k];
        _system_freebase[k] = _mjt.freebase[k];
    }
}

var freebase_scope = {};
freebase_scope.syslog = syslog;
_hostenv.load_system_script('freebase.js', freebase_scope);

// decorate acreboot objects with just what we need... a lot
freebase_scope.augment(acre.freebase, acre.urlfetch, acre.async.urlfetch, _request.freebase_service_url, _request.freebase_site_host, mwlt_mode);
freebase_scope.augment(_system_freebase, _system_urlfetch, _system_async_urlfetch, _request.freebase_service_url, _request.freebase_site_host, mwlt_mode);
freebase_scope.appfetcher(register_appfetch_method, make_appfetch_error);
acre.handlers.mqlquery = freebase_scope.handler();

// for backwards compatibility, these mjt.Task classes
// are enqueue()d immediately in the acre environment only.
var mjt_freebase_synctasks = {
    MqlRead: 'mqlread',
    MqlReadMultiple: 'mqlread_multiple',
    MqlWrite: 'mqlwrite',
    TransGet: 'get_blob',
    Touch: 'touch',
    Upload: 'upload'
};

for (var k in mjt_freebase_synctasks) {
    (function (k) {
        var mapped_name = mjt_freebase_synctasks[k];
        acre.freebase[k] = function () {
            var res = acre.freebase[mapped_name].apply(this, arguments);
            res.enqueue = function () { return res; };
            return res;
        };
    })(k);
}

// cleanup
delete freebase_scope;


//--------------------------------- oauth -----------------------------------

var oauth_scope = {};
oauth_scope.Hash = acre.hash;
oauth_scope.syslog = syslog;
oauth_scope.system_urlfetch = _system_urlfetch;
_hostenv.load_system_script('oauth.js',      oauth_scope);
_hostenv.load_system_script('acre_oauth.js', oauth_scope);
oauth_scope.augment(acre);

// fish this function out because _urlfetch needs it
var oauth_sign = oauth_scope.OAuth.sign;

// cleanup
delete oauth_scope;


//-------------------------------- console - part 2 ----------------------------

// tell the console to ignore all the top level objects by default
// NOTE: this needs to be at the very end as to list all the possible objects
for (var name in _topscope) {
    console_scope.skip(_topscope[name]);
}


// ---------------------------- proto_require ---------------------------------

var proto_require = function(req_path, override_metadata, resolve_only) {
    syslog(req_path, "proto_require.path");
    
    // NOTE: get_file and normalize_path both rely 
    // on app_data already having been defined
    
    /*
     * utility for resolving filenames to files
     * using the filenames lookup hash in app_data
     * 
     * we look for a match in several ways:
     *  1. foo.ext --> foo.ext
     *  2. foo.ext --> foo
     *  3. foo --> foo.ext 
     *
     * with preferred values of ext for #3 (.sjs, .mjt).
     */ 
    function get_file(fn) {
        var filename, filenames;
        
        // Early-on acre didn't support extensions, so it would resolve 
        // requests for filenames with extensions to the filename w/out an 
        // extension... now we get to support that forever!  :-P
        var fn_noext = fn.replace(/\.[^\/\.]*$/,"");
        if (app_data.filenames[fn]) {
            filenames = app_data.filenames[fn];
        } else if (app_data.filenames[fn_noext]) {
            filenames = app_data.filenames[fn_noext];
        } else {
            return null;
        }

        // Reverse direction now... look for files with an extra
        // extension from when on-disk apps stripped extensions

        // is there a "preferred" extension?
        u.each(["none", "sjs", "mjt"], function(i, ext) {
            if (filenames[ext]) {
                filename = filenames[ext];
                return false;
            }
        });

        // otherwise grab first
        if (!filename) {
          for (var ext in filenames) {
              filename = filenames[ext];
              break;
          }          
        }

        return filename;
    };
    
    /*
     * utility for converting all paths relative to an app
     * into fully-qualified paths (for acre.require, etc.)
     */
    function normalize_path(path, version, new_only, app_only) {
        path = path || "";
        if (typeof path !== 'string') throw new Error("Path must be a string");
        var parts = path.split('//');
        
        if (parts.length >= 2) {
            
            // Mode 1: new require syntax                
            return path;
            
        } else if (/^(freebase:)?\//.test(path)) {
            if (new_only) throw new Error("Freebase ID syntax is not supported for this method.  Use URL syntax.");
            
            // Mode 2: old require syntax
            var namespace = path.replace(/^freebase:/,"").split('/');
            var script = namespace.pop();
            if (version) namespace.push(version);
            namespace = namespace.join('/');
            path = compose_req_path(namespace_to_host(namespace), script);
            return path;
            
        } else {
            if (app_only) throw new Error("Only apps are supported by this method");
            
            // Mode 3: relative require

            // check whether there's a matching mount
            if (app && app.mounts) {
                var path_segs = path.split("/");
                while (path_segs.length) {
                    var mpath = path_segs.join("/");
                    if (mpath in app.mounts) {
                        return app.mounts[mpath] + path.replace(mpath, "");
                    }
                    path_segs.pop();
                }
            }

            // otherwise just push current host back on
            return compose_req_path(host, path);
        }
    }
    
    // parse path
    var [host, path] = decompose_req_path(req_path);

    // retrieve app metadata using appfetchers
    var method, app_data;
    u.each(appfetch_methods, function(i, m) {
        try {
            method = m;
            var app_defaults = (method.name === 'cache') ? {} : 
                set_app_metadata({host: host}, _default_metadata);
            app_data = method.fetcher(host, app_defaults);
            return false;
        } catch (e if e.__code__ == APPFETCH_ERROR_NOT_FOUND) {
            app_data = null;
            return true;
        }        
    });

    if (app_data === null) {
        // cache complete misses in the request cache
        METADATA_CACHE[host] = null;
        return null;
    }

    // splice in metadata file before caching app
    var md_filename = get_file(_METADATA_FILE);
    if (md_filename && method.cachable) {
        var md_file = Script(app_data, md_filename).to_module();
        try {
          var md = md_file[_METADATA_FILE] || JSON.parse(md_file.body);
        } catch (e) {
          throw new Error("Metadata file in //" + host + " is not valid. "  + e);
        }
        set_app_metadata(app_data, md);
    }

    // now cache the app metadata
    var ckey = "METADATA:"+app_data.guid+":"+app_data.as_of;
    var ttl = (typeof app_data.ttl === "number") ? app_data.ttl : 0;

    if (method.cachable && (ttl !== 0)) {
        // cache the metadata in the long-term cache, the metadata is
        // cached permanently (or until overriden).
        _cache.put(ckey, JSON.stringify(app_data));
        
        // we want to build an index of ids to the metadata block
        // which we do with HOST keys in the metadata cache. These
        // only last for ten minutes, since they are considered a
        // front-line caching mechanism, and thus require a
        // shift+refresh to refresh.
        u.each(app_data.hosts, function(i, host) {
            if (ttl < 0) {
              _cache.put("HOST:"+host, ckey);
            } else {
              _cache.put("HOST:"+host, ckey, ttl);
            }
            syslog.info({key:"HOST:"+host, value: ckey, ttl: ttl }, 'appfetch.cache.write.host');
        });
    }

    // Always put it in the request-level cache. Using the
    // request-level cache should be marginally faster than using
    // whirlycott, for getting the same metadata in a single request
    // cycle. Metadata is directly linked to the link keys (in this
    // case, there should only be one link key)
    u.each(app_data.hosts, function(i, host) {
        METADATA_CACHE[host] = app_data;
    });

    // If there are overrides, create a clean copy and apply
    // them now, after caching, so they only affect this scope
    // XXX - not always creating a clean copy leaves things open
    // to direct manipulation by scripts, but it's too expensive
    var app = app_data;
    if (override_metadata) {
        app = u.extend(true, {}, app_data);
        set_app_metadata(app, override_metadata);
    }

    // Note that we wait till after we've cached the app_data before
    // trying to find the specific file we're interested in.
    var filename, path_info;
    if (path) {
        var path_segs = path.split("/");
        
        while (path_segs.length) {
            var fn = path_segs.join("/");
            path_info = file_in_path(fn, path)[0];
            
            if (app.mounts[fn] && (path_info.length > 1)) {
                var mount_path = normalize_path(app.mounts[fn] + path_info);
                return proto_require(mount_path, null, resolve_only);
            }
            
            var fn_noext = fn.replace(/\.[^\/\.]*$/,"");
            filename = get_file(fn) || get_file(fn_noext);
            
            if(filename) break;
            path_segs.pop();
        }
        
        if (!filename) return null;
    } else {
        // Provide the app metadata if proto_require is called
        // without a path.  Used by acre.get_metadata().
        return app;
    }


    // return just found path for acre.resolve()
    if (resolve_only) {
        return "//" + app.host + "/" + filename;
    }

    
    // we've found our script, now we need to:
    // set up its scope and run it
     
    /*
     * augment the script's scope with context-sensitive APIs
     *
     * - all path-based acre APIs (require, include, route, etc.)
     *   because of relative references
     */
    function scope_augmentation(script, aug_scope) {
        aug_scope.acre.current_script = script;
        
        /*
         * _request_scope augmentation:
         *   This is stuff we only do for 
         *   the top-level requested script:
         */
        if (aug_scope == _request_scope && script.name.indexOf("not_found.") !== 0) {
            aug_scope.acre.request.script = script;

            if (app.error_page) {
                _hostenv.error_handler_path = normalize_path(app.error_page);
            }

            // XXX - freebase appfetch method-specific hacks
            if (app.freebase && app.freebase.write_user) {
                _hostenv.write_user = app.freebase.write_user;
            }

            if (app.freebase &&
                app.freebase.service_url &&
                /^http(s?):\/\//.test(app.freebase.service_url)) {
                acre.freebase.set_service_url(app.freebase.service_url);    
            }

            // Decorate deprecated APIs with warning messages, and setup deprecated values
            var script_id = req_path_to_script_id(script.path);
            var [namespace, script_name] = split_script_id(script_id);

            aug_scope.acre.request_context = { // deprecated
                script_name : script_name,
                script_id : script_id,
                script_namespace : namespace,
                script_version : (script.app.versions.length > 0 ? script.app.versions[0] : null)
            };

            /*
            aug_scope.acre.environ.path_info = aug_scope.acre.request.path_info; // deprecated

            aug_scope.acre.context = aug_scope.acre.request_context; // deprecated
            aug_scope.acre.environ.script_name = script.name; // deprecated
            aug_scope.acre.environ.script_id = host_to_namespace(script.app.host) + '/' + script.name; // deprecated
            aug_scope.acre.environ.script_namespace = host_to_namespace(script.app.host); // deprecated
            */
            
            deprecate(aug_scope);
        }

        aug_scope.acre.get_metadata = function(path) {
            // ensure we only have the host part
            var [host] = decompose_req_path(normalize_path(path, null, true, false));
            return proto_require(compose_req_path(host));
        };

        aug_scope.acre.mount = function(path, local_path) {
            app.mounts[local_path] = normalize_path(path);
        };

        aug_scope.acre.resolve = function(path) {
            return proto_require(normalize_path(path), null, true);
        };

        aug_scope.acre.route = function(path, body, skip_routes) {
            path = normalize_path(path, null, true);
            var [h, p, qs] = decompose_req_path(path);

            var route_e = new acre.errors.AcreRouteException;
            route_e.route_to = path;
            route_e.body = body || "";
            route_e.skip_routes = (skip_routes ? true : (app.host == h));
            throw route_e;
        };

        aug_scope.acre.response.set_error_page = function(path) {
            path = normalize_path(path, null, true);
            _hostenv.error_handler_path = path;
        };


        /*
         * helper for the following functions (require, include, get_source)
         *
         * all take a path as the primary arugment, but
         * optionally can take a metadata object in the second 
         * position to be spliced on to the context of the app.
         *
         * ... or, for backward-compatibility, the metadata slot
         *  can be a version string (path must be a freebase ID) 
         */
        function get_sobj(path, metadata) {
            var override_metadata,
                version;
            
            if (u.isPlainObject(metadata)) {
                override_metadata = metadata;
            } else {
                version = metadata;
            }
            
            if (!path) {
                throw new Error("No URL provided");
            }    
              
            path = normalize_path(path, version);
            var sobj = proto_require(path, override_metadata);
        
            if (sobj === null) {
                throw new Error('Could not fetch data from ' + path);
            }

            if (compose_req_path(sobj.app.host, sobj.name) === script.path) {
                throw new Error("A script can not require itself");                
            }

            return sobj;
        }

        aug_scope.acre.require = function(path, metadata) {
            var scope = (this !== aug_scope.acre) ? this : undefined;

            var sobj = get_sobj(path, metadata);
            
            return sobj.to_module(scope);
        };
    
        // XXX to_http_response() is largely unimplemented
        aug_scope.acre.include = function(path, metadata) {
            var scope = (this !== aug_scope.acre) ? this : undefined;

            var sobj = get_sobj(path, metadata);

            return sobj.to_http_response(scope).body;
        };

        aug_scope.acre.get_source = function(path, metadata) {
            var sobj = get_sobj(path, metadata);

            return sobj.get_content().body;
        };

        return aug_scope;
    }


    // Acre's internal representation of a script 
    // used to create modules (acre.require) or
    // geenrate output (http request, acre.include)
    function Script(app, name, path_info) {
        
        // look whether there's relevant backfill metadata in 
        // the 'extensions' dictionary in the app metadata.
        // match from longest to shortest (i.e., .mf.css before .css)
        var exts = name.split(".");
        exts.shift();
        while (exts.length) {
          var ext = exts.join(".");
          var ext_data = {};
          if (ext && app.extensions && app.extensions[ext]) {
              ext_data = app.extensions[ext];
              break;
          }
          exts.shift();
        }

        // Create a good looking copy of script metadata 
        // this will be used in acre.current_script, etc.
        var script_data = u.extend({}, ext_data, app.files[name]);
        script_data.path_info = path_info;
        script_data.path = compose_req_path(app.host, name);
        script_data.id = host_to_namespace(app.host) + "/" + name;
        // so.source_url ?

        // only copy some of the app metadata
        script_data.app = {
          source: app.source,
          path: compose_req_path(app.host),
          host: app.host,
          hosts: app.hosts,
          guid: app.guid,
          as_of: app.as_of,
          id: app.id,
          mounts: app.mounts,
          version: (app.versions.length > 0 ? app.versions[0] : null),
          versions: app.versions,
          base_url : acre.host.protocol + "://" + 
              (app.host.match(/\.$/) ? app.host.replace(/\.$/, "") : (app.host + "." + acre.host.name)) +
              (acre.host.port !== 80 ? (":" + acre.host.port) : "")              
        };

        // private variable for storing the handler we'll use to 
        // process the script. the exact handler will depend on the 
        // scope the script is loaded into, however, so we don't
        // actually load it until to_module
        var _handler;

        // copy script_data into a new object that we can decorate 
        // with methods for internal and handler use
        var script = u.extend({}, script_data);

        script.get_content = get_appfetch_method(script.source).get_content;

        script.to_module = function(scope) {
            // build up the script's scope
            scope = scope || make_scope();
            this.scope = scope = scope_augmentation(script_data, scope);

            // now that the scope's all set up, we can finally load our handler
            var handler_path = (app.handlers && app.handlers[this.handler]) ? 
                                normalize_path(app.handlers[this.handler]) : 
                                undefined;
            _handler = _load_handler(scope, this.handler, handler_path);

            // let's make sure we don't end up with the cached compiled_js 
            // from a different file version or different handler
            var class_name = this.path;
            var hash =  this.content_hash + "." + _handler.path;
            this.linemap = null;

            // get compiled javascript, either directly from the class cache or 
            // by generating raw javascript and compiling (and caching the result)
            var compiled_js = _hostenv.load_script_from_cache(class_name, hash, 
                                                              scope, false);
            if (compiled_js == null) {
                var jsstr = _handler.to_js(this);
                if (jsstr) {
                    compiled_js = _hostenv.load_script_from_string(jsstr, class_name, hash, 
                                                                   scope, this.linemap, false);
                }
            }

            // have the handler run our compiled js
            return _handler.to_module(compiled_js, this);
        };

        script.to_http_response = function(scope) {
            // if we're running at the top-level, reset path_info
            if (scope === _request_scope) {
                acre.request.path_info = this.path_info;
            }

            var module = this.to_module(scope);
            return _handler.to_http_response(module, this);
        };

        return script;
    }


    return Script(app, filename, path_info);
};


//----------------------------------- Main ---------------------------------

/*
 * this is the main function where we:
 *  1. figure out which script to run
 *  2. run it
 *  3. repeat (if acre.route is called)
 */
var handle_request = function (request_path, req_body, skip_routes) {
    // reset the response
    acre.response = new AcreResponse();
    
    // we might need the original path for situations 
    // like "/acre/" URLs, so let's set it aside
    var source_path = request_path;

    var [req_host, req_pathinfo, req_query_string] = decompose_req_path(request_path);

    // Now that we know what the path we're running, 
    // set up rest of acre.request
    // path_info will get set once we know which part
    // of the path is file vs. path_info (in proto_require)
    acre.request.body = req_body;
    set_request_params(req_query_string, req_body);
    
    // Fill in missing values
    if (!req_host) req_host = _DEFAULT_APP;
    if (!req_pathinfo) req_pathinfo = _DEFAULT_FILE;
    
    request_path = compose_req_path(req_host, req_pathinfo);

    // support /acre/ special case -- these are OTS routing rules 
    // that allow certain global scripts to run within the context of any app
    // e.g., keystore, auth, test, etc.
    if (_request.request_url.split('/')[3] == 'acre') {
        var [h, p] = decompose_req_path('http://' + _request.request_server_name.toLowerCase() + _request.request_path_info);
        //var source_app = proto_require(compose_req_path(req_host));
        var source_app = proto_require(compose_req_path(h));
        if (source_app !== null) {
            source_path = compose_req_path(req_host, req_pathinfo);
            _topscope._request_app_guid = source_app.guid;
        }
    }

    // Set up the list of paths we're going to try before failing altogether, 
    // (routes, not_found, default scripts, etc.)
    function fallbacks_for(host, path) {
        var FALLTHROUGH_SCRIPTS = {
            'robots.txt':true,
            'favicon.ico':true,
            'error':true
        };
        
        var fallbacks = [];
        
        if (skip_routes !== true) {
            fallbacks.push(compose_req_path(host,  'routes' + '/' + path));
        }

        fallbacks.push(compose_req_path(host, path));

        for (var sname in  FALLTHROUGH_SCRIPTS) {
            if (file_in_path(sname, path)[1]) {
                fallbacks.push(compose_req_path(_DEFAULTS_HOST, path));
            }
        }

        fallbacks = fallbacks.concat(
            [
                compose_req_path(host, 'not_found'),
                compose_req_path(_DEFAULTS_HOST, 'not_found')
            ]
        );

        return fallbacks;
    };
    var fallbacks = fallbacks_for(req_host, req_pathinfo);

    // Work our way down the list until we find one that works:
    var script = null;
    u.each(fallbacks, function(i, fpath) {
        try {            
            script = proto_require(fpath);
        } catch (e if e.__code__ == APPFETCH_ERROR_METHOD) {
            acre.response.status = 503;
            acre.write("Service Temporarily Unavailable\n");
            acre.exit();
        }
        
        if (script !== null) {
            return false;
        }        
    });

    // this is a catastrophic lookup failure
    if (script == null) {
        acre.response.set_header('content-type', 'text/plain');
        acre.response.status = 404;
        acre.write('No valid acre script found at ' + request_path + ' (or defaults)\n');
        acre.exit();
    }

    // This information is needed by the error page
    _hostenv.script_name = script.name;
    _hostenv.script_path = script.path;
    _hostenv.script_host_path = compose_req_path(script.app.host);
    if ('error' in acre && 'script_path' in acre.error) {
        source_path = acre.error.script_path;       
    }
    
    // This information is needed to run the not_found page
    // it will actually get overriden with a proper
    // version once scope_augmentation is run
    acre.request.script = {
        'app': {
            'id': host_to_namespace(req_host),
            'path': compose_req_path(req_host)
        },
        'name': req_pathinfo,
        'path': request_path
    };

    // before the script is actually run, we want to set the app guid aside
    // if we didn't already do so
    // app_guid is primarily used for accessing the keystore and the datastore
    if (_topscope._request_app_guid === null) {
        _topscope._request_app_guid = script.app.guid;
    }
    
    // View Source link
    acre.response.set_header('x-acre-source-url',
                            _request.freebase_site_host + 
                            '/appeditor#!path=' + source_path);

    // execute the script
    try {
        _request_scope = make_scope();
        var res = script.to_http_response(_request_scope);

        if (res !== null) {
            // fill out the acre.response object.
            // this will be processed by HostEnv when
            // the finish_response callback is invoked
            acre.response.status = res.status || acre.response.status;
            for (var k in res.headers) {
                var v = res.headers[k];
                acre.response.set_header(k.toLowerCase(), v);
            }

            acre.write(res.body);
        }
    } catch (e if e instanceof acre.errors.AcreRouteException) {
        handle_request(e.route_to, e.body, e.skip_routes);
    }
};


/*
 * this is a callback that gets invoked after the script has finished.
 * ideally we could use try...catch to catch AcreException only and
 * run this, but rhino destroys the stack traces of all the other
 * exceptions then.
 * so the try...catch is in java, and the java code calls back in here
 * to finish the response.
 * note that this shouldn't be a security issue: this code is not called with
 * any special privileges, we aren't trying to enforce security requirements
 * on the headers.  so if an app trashes the js scope, that's its problem.
 */
_hostenv.finish_response = function () {
    // post process headers so everything is lower case, this sucks
    // but we need it so we can easily modify header values

    var hdrs = {};
    u.each(acre.response.headers, function(k, v) {
        if (u.isArray(v)) {
            v = v.join('; ');
        }
        hdrs[k.toLowerCase()] = v;
    });
    acre.response.headers = hdrs;

    // add additional headers to the response
    if (!('content-type' in acre.response.headers)) {
        acre.response.headers['content-type'] = "text/plain; charset=utf-8";
    }

    // We don't want users to set these, I guess.
    delete acre.response.headers['connection'];
    delete acre.response.headers['server'];

    // for the special case of mwLastWriteTime, we propagate mwLastWriteTime from
    // the acre cookie jar up to the browser
    if (_cookie_jar_best_match !== null) {
        if (mwlt_mode === false) {
            acre.response.set_cookie('acre_cookiejar', serialize_cookiejar(_cookie_jar),
                                     {
                                         path:'/',
                                         max_age: 86400
                                     });
        } else {
            if (_cookie_jar_best_match in _cookie_jar) {
                acre.response.set_cookie('mwLastWriteTime', _cookie_jar[_cookie_jar_best_match],
                                         {
                                             'domain':_cookie_jar_best_match,
                                             'path':'/',
                                             max_age: 86400
                                         });

            } else {
                syslog.warn({'key':_cookie_jar_best_match, 'jar':_cookie_jar},
                            'cookie_jar.key.missing');
            }
        }
    }

    AcreResponse_set_cache_control(acre.response);
    AcreResponse_set_vary(acre.response);
    AcreResponse_set_metaweb_vary(acre.response);
    AcreResponse_set_last_modified(acre.response);
    AcreResponse_set_expires(acre.response);

    _hostenv.start_response(parseInt(acre.response.status, 10),
                            acre.response.headers, acre.response.cookies);

    // after this function returns, the body will be sent
};


// --------------------------------- let's roll -------------------------------

// get app metadata defaults
// doing this here so it's once per request rather than for every require
// XXX - there's probably a less hacky way to do this, but it gets the job done
acre.response = {};
var _default_metadata = set_app_metadata({}, proto_require(compose_req_path(_DEFAULTS_HOST)));
delete _default_metadata.files;

// We're going to initialize this in handle_request
// but we need it to be global for comparison later
var _request_scope;

var _request_path;

// If it's an internal redirect (error page), get _request_path from handler_script_path:
if (typeof _request.handler_script_path == 'string' && _request.handler_script_path != '') {
    _request_path = _request.handler_script_path;
    delete _request.handler_script_path;

// Otherwise, get it from the request
// we don't use _request.request_url because it's set pre-OTS rules,
// however the following values *are* reset by OTS
} else {
    _request_path = 'http://' + _request.server_name.toLowerCase() + _request.path_info + '?' + _request.query_string; 
}

handle_request(_request_path, _request.request_body, _request.skip_routes);
})();
