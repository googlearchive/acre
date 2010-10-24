
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

var _DEFAULT_HOST_NS = '/freebase/apps/hosts';

var freebase_service_url = _request.freebase_service_url;
var freebase_site_host = _request.freebase_site_host;

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
 * return a fully qualified development URL of the given app
 */
acre.make_dev_url = function (appid,version) {
    var protocol = acre.request.protocol;
    var port = acre.request.server_port;
    version = (typeof version != 'undefined') ? version + '.' : '';
    port = ((protocol == 'http' && port != 80) || (protocol == 'https' && port != 443)) ? ":" + port : '';
    var app = appid.split('/').reverse().join('.');
    return protocol + "://" + version + app + acre.host.dev_name + port;
};

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
        for (var k in headers) {
            var v = headers[k];
            acre.response.headers[k] = v;
        }
    }
};

/**
 *   add output to the http response.  multiple arguments will be appended.
 *   @param str string or markup to append
 */
acre.write = function () {
    for (var i = 0; i < arguments.length; i++ ) {
        var arg = arguments[i];
        if (typeof arg == 'object' && arg !== null &&
            (typeof arg.toMarkupList === 'function' || typeof arg.toMarkup === 'function')) {
            arg = acre.markup.stringify(arg);
        }
        if (typeof arg != 'string' && !(arg instanceof Binary))
            arg = '' + arg;
        _hostenv.write(arg);
    }
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

acre.host = {
    protocol : _request.server_protocol,
    name : _request.server_host_base,
    dev_name : _request.server_host,
    port : _request.server_port
};

function escape_re(s) {
  var specials = /[.*+?|()\[\]{}\\]/g;
  return s.replace(specials, '\\$&');
}

//-------------------------------- acre.request -----------------------------------------

acre.request = {
    server_name : _request.request_server_name,
    server_port : _request.request_server_port,
    url : _request.request_url,
    base_url : _request.request_base_url,
    app_url : _request.request_app_url,
    protocol : _request.server_protocol, // XXX: how do we get the request protocol?
    method : _request.request_method,
    base_path : _request.request_path_info.replace(new RegExp(escape_re(_request.path_info)+"$"), ""),
    path_info : _request.path_info,
    query_string : _request.query_string,
    headers : _request.headers,
    body : _request.request_body,
    start_time : _request.request_start_time,
    cookies : {}
};

// Close to avoid leaking variables into the scope
var mwlt_mode = false;

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


// ------------------------------- acre.environ -----------------------------------------

acre.environ = _request; // deprecated
if (acre.request.user_info) {
    acre.environ.user_info = acre.request.user_info; // deprecated
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

AcreResponse.prototype.set_header = function (name, value) {
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

    // RFC2616 sec 4.2: It MUST be possible to combine the multiple
    //   header fields into one "field-name: field-value" pair, without
    //   changing the semantics of the message, by appending each
    //   subsequent field-value to the first, each separated by a comma.
    if (!(name in this.headers)) {
        this.headers[name] = value;
    } else if (this.headers[name] instanceof Array) {
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


// XXX who calls this?
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

var AcreResponse_generate_date = function (d) {
    function padz(n) {
        return n > 10 ? n : '0'+n;
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

    var dayname = WEEKDAY_NAMES[d.getDay()].slice(0,3);
    var day = padz(d.getDate());
    var monthname = MONTH_NAMES[d.getMonth()].slice(0,3);
    var year = 1900+d.getYear();
    var hour = padz(d.getHours());
    var minutes = padz(d.getMinutes());
    var seconds = padz(d.getSeconds());

    return dayname +', '+ day +' ' + monthname + ' ' + year + ' ' + hour +
        ':'+ minutes +':'+ seconds +' GMT';
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

acre.response = new AcreResponse();

// ----------------------------------- MQL key escaping ---------------------------------

var _mqlkey_start = 'A-Za-z0-9';
var _mqlkey_char = 'A-Za-z0-9_-';

var _MQLKEY_VALID = new RegExp('^[' + _mqlkey_start + '][' + _mqlkey_char + ']*$');
var _MQLKEY_CHAR_MUSTQUOTE = new RegExp('([^' + _mqlkey_char + '])', 'g');

var mqlkey_escape = function (s) {
    if (_MQLKEY_VALID.exec(s)) {  // fastpath
        return s;
    }

    var convert = function(a, b) {
        var hex = b.charCodeAt(0).toString(16).toUpperCase();
        if (hex.length == 2) {
            hex = '00' + hex;
        }
        return '$' + hex;
    };

    var x = s.replace(_MQLKEY_CHAR_MUSTQUOTE, convert);

    if (x.charAt(0) == '-' || x.charAt(0) == '_') {
        x = convert(x,x.charAt(0)) + x.substr(1);
    }

    return x;
};

var mqlkey_unescape = function (x) {
    x = x.replace(/\$([0-9A-Fa-f]{4})/g, function (a,b) {
        return String.fromCharCode(parseInt(b, 16));
    });
    return x;
}

// -------------------------------------------- errors ------------------------------------

/*
 * Setup the acre.error object in case the request is for an error page
 */
if (_request.error_info) {
    acre.error = _request.error_info;
    acre.error.script = {
        "name" : _request.error_info.script_name,
        "id"   : _request.error_info.script_id,
        "app"  : _request.error_info.script_app
    };
    delete acre.error.script_name;
    delete acre.error.script_id;
    delete acre.error.script_app;

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

// ------------------------ keystore --------------------------------------

if (typeof acre.keystore == 'undefined') {
    acre.keystore = {};
}

var _request_app_guid = null;

acre.keystore.get = function (name) {
    if (_request_app_guid !== null) {
        return _ks.get_key(name, _request_app_guid);
     } else {
        return null;
    }
};

acre.keystore.keys = function () {
    if (_request_app_guid !== null) {
        return _ks.get_keys(_request_app_guid);
    } else {
        return null;
    }
};

acre.keystore.remove = function (name) {
    if (_request_app_guid !== null) {
        _ks.delete_key(name, _request_app_guid);
    }
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
        return _urlfetch(false,url,method,headers,content,sign,
                         _hostenv.urlOpenAsync);
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
    acre.async.run = function () {
        throw new Error('acre.async.run() is restricted in error scripts');
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
var _urlfetch = function (system, url, options_or_method, headers,
                          content, sign, _urlopener) {
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
                                 acre.current_script.app.id) ? acre.current_script.app.id : '/freebase/apps';

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

            if (cookiestr.indexOf("metaweb-user=") < 0) {
                cookies.push("metaweb-user=" + acre.request.cookies["metaweb-user"]);
            }

            var user_cookie_parts = acre.request.cookies['metaweb-user'].split('|');
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
//    public Scriptable urlOpen(String urlStr, String method,
//                              Object content, Scriptable headers,
//                              boolean system, boolean log_to_user,
//                              Object response_encoding) {

        response = _hostenv.urlOpen(url, method, content, headers, system,
                                  log_to_user, response_encoding);
        response = response_processor(url, response);

        if (response instanceof acre.errors.URLError)
            throw response;
    } else if (_urlopener == _hostenv.urlOpenAsync) {
        _hostenv.urlOpenAsync(url, method, content, headers, timeout,
                              function(url, res) {
                                  response_processor(url, res, callback, errback);
                              });
        response = null;
    }

    return response;
};

function cookiejar_domain_match(url) {
    function parseUri(str) {
        /*
         * This function was adapted from parseUri 1.2.1
         * http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
         */
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

    var url_parts = parseUri(url);
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

// ------------------------------------------ template utils ------------------------------------

//
acre.template = {};

// name is provided for user debugging
// source is the source text.
acre.template.load_from_string = function (source, name) {
    var script_name = 'eval/' + name.replace(/[^a-zA-Z0-9_]/g, '_');

    /* use this later instead of eval()
    // for security we cannot allow user code to specify the hash
    var hash = acre.hash.hex_sha1(source);

    var pkg = _acre_template_from_string(source, null, script_name, hash, true);
    return pkg;
    */

    // the compiler creates a TemplatePackage but doesn't evaluate it.
    // here we create a package, generate the js, and then serialize it
    var srcpkg = _mjt.acre.compile_string(source, name);
    var js_text = 'var pkgdef = (' + srcpkg.toJS() + '); pkgdef';

    // create a runtime TemplatePackage from the generated and serialized package
    var tobj = eval(js_text);
    var pkg = (new _mjt.TemplatePackage()).init_from_js(tobj);

    // replace with:
    // return pkg.toString()
    var defs = pkg.toplevel();
    var pkgtop = defs._main.prototype.tpackage.tcall;


    return pkgtop;
};

// provide a string of template markup and compile it to JS
// useful for sending compiled templates over the wire
acre.template.string_to_js = function (string, name) {
    return _mjt.acre.compile_string(string, name).toJS();
};


// ------------------------------------------ uber fetch ------------------------------------

var UBERFETCH_ERROR_NOT_FOUND = 1,
    UBERFETCH_ERROR_MQLREAD = 2,
    UBERFETCH_ERROR_ASOF_PARSE = 3,
    UBERFETCH_ERROR_PERMISSIONS = 4,
    UBERFETCH_ERROR_UNKNOWN = 5;

function make_uberfetch_error(msg, code, extend, parent) {
    msg = msg || 'Unknown Error';
    code = code || UBERFETCH_ERROR_UNKNOWN;
    extend = extend || {};
    parent = parent || null;

    var e = new Error(msg);

    for (var a in extend) {
        e[a] = extend[a];
    }

    e.__code__ = code;
    e.__parent__ = parent;

    return e;
}

var METADATA_CACHE = {};

var uberfetch_cache = function(namespace) {
    syslog.info({'id':namespace}, 'uberfetch.cache.lookup');
    if (namespace in METADATA_CACHE) return METADATA_CACHE[namespace];

    var ckey = _cache.get("LINK:"+namespace);
    if (ckey == null) {
        syslog.info({id:namespace, key:"LINK:"+namespace},
                    'uberfetch.cache.link_key.not_found');
        throw make_uberfetch_error("Not Found Error", UBERFETCH_ERROR_NOT_FOUND);
    }

    var res = _cache.get(ckey);
    if (res === null) {
        syslog.info({id:namespace, key:ckey}, 'uberfetch.cache.metadata.not_found');
        throw make_uberfetch_error("Not Found Error", UBERFETCH_ERROR_NOT_FOUND);
    }

    syslog.info({result: res, key: ckey}, 'uberfetch.cache.lookup.success');

    return JSON.parse(res);
};

var uberfetch_file = function(namespace, result) {
    syslog.info({'id':namespace}, 'uberfetch.file.lookup');
    function _extension_to_metadata(fn) {
        var handler_map = {'sjs':'acre_script', 'mql':'mqlquery', 'mjt':'mjt',
                           'gif':'binary',    'jpg':'binary', 'png':'binary',
                           'crl':'binary'};
        var media_map   = {'css':'text/css', 'js':'application/x-javascript',
                           'html':'text/html', 'gif':'image/gif',
                           'jpg':'image/jpeg', 'png':'image/png',
                           'crl':'application/x-pkcs7-crl'};

        fn = fn.split('.');
        var ext = fn.pop();
        var media_type  = media_map[ext]   || 'text/plain';
        var handler     = handler_map[ext] || 'passthrough';

        return {name:fn.join('.'),
                handler:handler, media_type:media_type};
    }

    result = result || {};

    var path = _hostenv.STATIC_SCRIPT_PATH+namespace;
    var files = _file.files(path);

    if (!files || files.length == 0) {
        syslog.debug({'fake_id':namespace}, "uberfetch.file.not_found");
        throw make_uberfetch_error("Not Found Error", UBERFETCH_ERROR_NOT_FOUND);
    }

    result.app_id = namespace;
    result.app_guid = namespace; // XXX is this going to make a mess?
    result.as_of = null; // XXX return the max mtime?
    result.service_metadata = result.service_metadata ||
        {
            'write_user':null,
            'service_url':null
        };

    result.links = result.links || [namespace];
    result.versions = result.versions || [];
    result.files = result.files || {};

    var has_files = false;
    for (var a in files) {
        var file = files[a];
        var f = new _file(path+"/"+file, false);
        if (/~$/.test(file)) continue;

        if (file == '.metadata') {
            // try and fill in metadata values here
            var dot_metadata = JSON.parse(f.body);
            result.app_id = dot_metadata.id || result.app_id;
            result.app_guid = dot_metadata.guid || result.app_guid;
            if (dot_metadata.write_user) {
                result.service_metadata.write_user = dot_metadata.write_user.substr(6);
            }
            result.service_metadata.service_url =
                dot_metadata.service_url || result.service_metadata.service_url;

            continue;
        }

        var file_data = _extension_to_metadata(file);
        file_data.content_id = path+'/'+file;
        file_data.content_hash = path+"/"+file+f.mtime;
        if (file_data.name === '') continue;
        has_files = true;
        result.files[file_data.name] = file_data;
        delete f;
    }

    if (!has_files) {
        syslog.debug({'fake_id':namespace}, "uberfetch.file.not_found");
        throw make_uberfetch_error("Not Found Error", UBERFETCH_ERROR_NOT_FOUND);
    }

    return result;
};

var uberfetch_graph  = function(namespace, guid, as_of, result) {
    /* Returns:
     *
     * {
     *   "app_id":null,
     *   "app_guid":null,  // metadata index 1
     *   "as_of":null, // metadata index 2
     *   "service_metadata":
     *     {
     *      "write_user":null,
     *      "service_url":null
     *     },
     *   "links":[""], // alternative ids
     *   "versions":[],
     *   "files":{
     *     name:{
     *       "name":null,
     *       "handler":null,
     *       "content_id":null,
     *       "media_type":null
     *     }
     *   }
     * }
     *
     * added to cache with key: METADATA:{o.guid}:{o.asof}
     * {o.links} looped over and added to cache as
     *  LINK:{o.links[i]} with value METADATA:{o.guid}:{o.asof}
     *
     */
    as_of = as_of || null;
    result = result || {};

    syslog.info({'id':namespace}, 'uberfetch.graph.lookup');

    var q = {
        "/freebase/apps/acre_app_version/acre_app" : {
            "/type/namespace/keys" : [{
                "namespace" : {
                    "id" : namespace
                },
                "value" : null
            }],
            "id" : null,
            "guid": null,
            "optional" : true
        },
        "/freebase/apps/acre_app_version/service_url": null,
        "/freebase/apps/acre_app_version/as_of_time" : null,
        "/type/domain/owners" : {
            "id" : null,
            "limit" : 1,
            "member" : {
                "/freebase/apps/acre_write_user/apps" : {
                    "id" : namespace
                },
                "id" : null
            },
            "optional" : true
        },
        "/type/namespace/keys" : [
            {
                "limit":501,
                "namespace" : {
                    "permission":null,
                    "/common/document/content" : {
                        "id" : null,
                        "guid" : null,
                        "media_type":null,
                        "optional" : true
                    },
                    "/freebase/apps/acre_doc/handler" : {
                        "handler_key" : null,
                        "optional" : true
                    },
                    "doc:type" : "/freebase/apps/acre_doc",
                    "guid" : null,
                    "id" : null,
                    "name" : null,
                    "optional" : true
                },
                "optional" : true,
                "value" : null
            }
        ],
        "name":null,
        "permission":null,
        "guid" : null,
        "id" : namespace
    };

    // XXX should we be doing the logging here, or move it up too?

    // if we have an as_of time, add it to the envelope
    try {
        var envelope = (as_of !== null) ?
            { 'as_of_time' : /(.*)Z/.exec(as_of)[1] } : null;
    } catch (e) {
        // Unable to parse
        syslog.error(e, "uberfetch.graph.asof.parse.error");
        throw make_uberfetch_error("as_of_time parse error",
                                   UBERFETCH_ERROR_ASOF_PARSE, e);
    }


    try {
        var res = _system_freebase.mqlread(q, envelope).result;
    } catch (e) {
        syslog.error(e, "uberfetch.graph.mqlread.error");
        throw make_uberfetch_error("Mqlread Error",
                                   UBERFETCH_ERROR_MQLREAD, e);
    }

    if (res == null) {
        syslog.debug({'fake_id':namespace}, "uberfetch.graph.not_found");
        throw make_uberfetch_error("Not Found Error",
                                   UBERFETCH_ERROR_NOT_FOUND);
    }

    if ('permission' in res && res['permission'] === '/boot/all_permission') {
        console.error("Script has /boot/all_permission as permission node and " +
                      "thus cannot be run");
        throw make_uberfetch_error("Boot permission used",
                                   UBERFETCH_ERROR_PERMISSIONS);
    }

    var app_version_t = res["/freebase/apps/acre_app_version/acre_app"];
    if (app_version_t !== null) {
	    // Handle the case that we've hit a version node
        var target_ns = app_version_t['id'];
        var target_guid = app_version_t['guid'];
        var target_asof = res['/freebase/apps/acre_app_version/as_of_time'];
        var target_versions = app_version_t['/type/namespace/keys'];

        /*
         * We want to add links nodes to the result for the namespace for which
         * the uberfetch request was initiated, as well as ids in the form of:
         *  {real_app_namespace}/{versions[i]}
         *
         * this should cover the case of release and version number for the
         * link table.
         *
         * This would also be the correct place to detect if we're in an uberfetch
         * loop (version node pointed at a version node) by testing for the
         * presence of result.links.
         */
        result.versions = result.versions || [];
        for (var a=0; a < target_versions.length; a++) {
            var version = target_versions[a].value;
            result.versions.push(version);

            var fqid = target_ns+'/'+version;
            if (fqid !== namespace)
                result.links.push(fqid);
        }

        var servurl = res['/freebase/apps/acre_app_version/service_url'];
        if (servurl !== null) {
            result.service_metadata = result.service_metadata || {};
            result.service_metadata.service_url = servurl;
        }

        // XXX we'd rather just return target_guid, target_asof
        return [uberfetch_graph, target_ns, target_guid, target_asof, result];
    }

    // Explictly build out the metadata here, filling in any blanks, in case
    // we didn't hit a version node up front.
    result.app_id = res.id;
    result.app_guid = res.guid;
    result.as_of = as_of;

    result.service_metadata = result.service_metadata || {};
    result.service_metadata.write_user = (res['/type/domain/owners'] != null ?
                                          res['/type/domain/owners'].member.id.substr(6) :
                                          null);
    result.service_metadata.service_url =
        result.service_metadata.service_url || freebase_service_url;

    result.versions = result.versions || [];
	result.links = result.links || [namespace];

    result.files = result.files || {};

    for (var a=0; a < res['/type/namespace/keys'].length; a++) {
        var f = res['/type/namespace/keys'][a];

        if (f.namespace !== null) {
            var file_data = f.namespace;
            var file_result = {};
            if (file_data.permission !== res['permission']) {
                console.warn("bad permission metadata for "+ namespace +
                             "/" + f.value +", skipping...");
                continue;
            }

            if (file_data['/common/document/content'] != null) {
                file_result.name = mqlkey_unescape(f.value);
                var handler = file_data['/freebase/apps/acre_doc/handler'];
                file_result.handler = (handler && 'handler_key' in handler ?
                                       handler.handler_key : 'passthrough');
                file_result.media_type =
                    file_data['/common/document/content'].media_type.substr(12);
                file_result.content_id = file_data['/common/document/content'].id;
                file_result.content_hash =
                    file_data['/common/document/content'].guid.substr(1);
                result.files[mqlkey_unescape(f.value)] = file_result;
            } else {
                syslog.warn({"filename":f.value}, "uberfetch.not_a_file");
            }
        }
    }

    return result;
};


var proto_require = function(namespace, script, skip_cache) {
    var script_noext;
    if (script) {
        script_noext = script.split('.')[0];
    }

    function CacheTrampoline(f) {
        return function () {
            var res = f.apply(this, arguments);

            if (res && res instanceof Array) {
                if (!skip_cache) {
                    // check cache and optionally call the thunk...
                    var ckey = "METADATA:"+res[2]+":"+res[3];
                    if (ckey in METADATA_CACHE) {
                        return METADATA_CACHE[ckey];
                    } else {
                        var r2 = _cache.get(ckey);
                        if (r2 !== null) return JSON.parse(r2);
                    }
                }

                return res[0].apply(null, res.slice(1));
            } else {
                return res;
            }
        };
    }

    function file_get_content () {
        return {
            'status':200,
            'headers':{
                'content-type':this.data.media_type
            },
            'body':new _file(this.data.content_id,
                             (this.data.handler === 'binary')).body
        };
    }

    function graph_get_content() {
        if (this.data.handler === 'binary') {
            return _system_freebase.get_blob(this.data.content_id, 'raw');
        } else {
            return _system_freebase.get_blob(this.data.content_id, 'unsafe');
        }
    }

    function cache_get_content() {
        for (var a=0; a < methods.length; a++) {
            var method = methods[a];
            if (method.source == this.__source__) {
                return method.get_content.apply(this);
            }
        }

        throw make_uberfetch_error("Unknown method type");
    }

    // XXX the cache source is probably cachable, but for now treat it
    //     as if it were not
    var methods = [
        {
            'source':'cache',
            'cachable':false,
            'fetcher':uberfetch_cache,
            'get_content':cache_get_content
        },
        {
            'source':'file',
            'cachable':true,
            'fetcher':uberfetch_file,
            'get_content':file_get_content
        },
        {
            'source':'graph',
            'cachable':true,
            'fetcher':CacheTrampoline(uberfetch_graph),
            'get_content':graph_get_content
        }
    ];

    var data = null;
    var method = {};
    for (var a=0; a < methods.length; a++) {
        method = methods[a];
        try {
            // for now use cachable as a way to tell if a method supports
            // using the cache or not
            if (skip_cache && method.cachable === false) continue;
            data = method.fetcher(namespace);
            if (method.cachable)
                data.__source__ = method.source;
            break;
         } catch (e if e.__code__ == UBERFETCH_ERROR_NOT_FOUND) {
             data = null;
             continue;
         }
    }

    if (data === null) {
        // XXX fail! exception?
        return null;
    }

    // now cache the data
    var ckey = "METADATA:"+data.app_guid+":"+data.as_of;
    if (method.cachable && data.versions.length > 0) {
        // cache the metadata in the long-term cache, the metadata is
        // cached permaneltly (or until overriden).
        _cache.put(ckey, JSON.stringify(data));
        
        // we want to build an index of ids to the metadata block
        // which we do with LINK keys in the metadata cache. These
        // only last for ten minutes, since they are considered a
        // front-line caching mechanism, and thus require a
        // shift+refresh to refresh.
        for (var l=0; l < data.links.length; l++) {
            var link = data.links[l];
            syslog.info({key:"LINK:"+link, value: ckey }, 'uberfetch.cache.write.link');
            _cache.put("LINK:"+link, ckey, 60000);
        }
    }


    // Always put it in the request-level cache. Using the
    // request-level cache should be marginally faster than using
    // whirlycott, for getting the same metadata in a single request
    // cycle. Metadata is directly linked to the link keys (in this
    // case, there should only be one link key)
    for (var l=0; l < data.links.length; l++) {
        var link = data.links[l];
        METADATA_CACHE[link] = data;
    }

    // Note that we wait till after we've cached the data before
    // failing to find the specific file we're interested in.
    var s;
    if (script) {
        if (script in data.files) {
            s = script;
        } else if (script_noext in data.files) {
            s = script_noext;
        } else {
            return null;
        }
    } else {
        // Provide the app metadata if proto_require is called
        // without a script name.
        return data;
    }

    function FileData(data, name) {
        return {
            '__source__':data.__source__,
            'name':name,
            'data':data.files[name],
            'get_content':method.get_content,
            'app':data
        };
    }

    function scope_augmentation(aug_scope) {
        function decompose_path(path, version, new_only, app_only) {
            var parts = path.split('//');
            if (parts.length >= 2) {

                // Mode 1: new require syntax
                var file = '';
                var path_part = '';
                var query_string = '';
                
                parts.shift();
                start_part = parts.join("//");

                // extract querystring, if present
                var qparts = start_part.split("?");
                path = qparts[0];
                if (qparts.length > 1) {
                    query_string = qparts[1];
                }

                // figure out versioned app id and the remaining parts
                var app_ver_id = '';

                var req_part = path.split("/");
                var app_ver_id_part = req_part.shift();

                // reverse-parse full http URLs into the short syntax
                if (/^http(s)?:$/.test(parts[0])) {
                    var acre_host_base = "." + _request.server_host_base +
                                        (_request.server_port !== 80 ? (":" + _request.server_port) : "");
                    var acre_host_re = new RegExp(escape_re(acre_host_base + "$"));

                    app_ver_id_part = acre_host_re.test(app_ver_id_part) ?
                                        app_ver_id_part.replace(acre_host_re, "") :
                                        app_ver_id_part + ".";
                }

                var app_ver_id_parts = app_ver_id_part.split('.');

                if (app_ver_id_parts[app_ver_id_parts.length-1] == 'dev') {
                    app_ver_id = '/' +
                        app_ver_id_parts.slice(0, app_ver_id_parts.length-1)
                        .reverse().join('/');
                } else if (app_ver_id_parts[app_ver_id_parts.length-1] == '') {
                    app_ver_id_parts.pop();
                    app_ver_id_parts.reverse().unshift(_DEFAULT_HOST_NS);
                    app_ver_id = app_ver_id_parts.join('/');
                } else {
                    // this is the case where we got an app key without a domain or .dev - e.g. //foobar
                    // do not use ACRE_HOST_BASE - use a domain such as acre.z that is known to be in the graph
                    app_ver_id_parts = app_ver_id_parts.reverse();

                    var host_base_parts = "acre.z".split('.');
                    for (var a=0; a < host_base_parts.length; a++) {
                        app_ver_id_parts.unshift(host_base_parts[a]);
                    }

                    app_ver_id_parts.unshift(_DEFAULT_HOST_NS);
                    app_ver_id = app_ver_id_parts.join('/');
										console.log("app ver id parts", app_ver_id_parts);
                }

                file = req_part.shift();
                path_part = '/'+req_part.join('/').split('?')[0];

                return [app_ver_id, file, path_part, query_string];
            } else if (/^(freebase:)?\//.test(path)) {
                if (new_only) throw new Error("Freebase ID syntax is not supported for this method.  Use URL syntax.");
                // Mode 2: old require syntax
                var namespace = path.replace(/^freebase:/,"").split('/');
                var script = namespace.pop();
                if (version) namespace.push(version);
                namespace = namespace.join('/');
                return [namespace, script];
            } else {
                if (app_only) throw new Error("Only apps are supported by this method");
                // Mode 3: relative require

                // extract querystring, if present
                var qparts = path.split("?");
                path = qparts[0];
                if (qparts.length > 1) {
                    var query_string = qparts[1];
                }

                // split off file from path_info
                var req_part = path.split("/");
                var file = req_part.shift();
                var path_part = '/'+req_part.join('/');

                // XXX this supports changing the relative version
                // not sure that's desireable
                // XXX it'd be nice if we could pass guid/asof in instead,
                //     which requires we break up the resolution phase somewhat
                var apppath = data.app_id +
                    ((version || data.versions.length > 0) ? '/'+
                     (version || data.versions[0]) :'');

                return [apppath, file, path_part, query_string];
            }
        }

        // XXX this depends on scope_augmentation being run after we figure out s
        aug_scope.acre.current_script = assembleScriptObj(data, data.files[s]);
        if (aug_scope == _topscope && data.files[s].name != 'not_found') {
            aug_scope.acre.request.script = aug_scope.acre.current_script;

            if (data.service_metadata.write_user !== null) {
                _hostenv.write_user = data.service_metadata.write_user;
            }
            if (data.service_metadata.service_url &&
                /http(s?):\/\//.test(data.service_metadata.service_url))
                acre.freebase.set_service_url(data.service_metadata.service_url);

            deprecate(aug_scope);
        }

        aug_scope.acre.route = function (path) {
            var [app, script, path_info, qs] = decompose_path(path, null, true);

            if (path_info == '') path_info = '/';
            var apppath = data.app_id +
                ((data.versions.length > 0) ? '/'+
                 (data.versions[0]) :'');

            var exit_e = new _hostenv.AcreExitException();
            exit_e.route_to = app+'/'+script;
            exit_e.skip_routes = (apppath == app);
            exit_e.path_info = path_info;
            exit_e.query_string = qs;
            throw exit_e;
        };

        // XXX what sort of path formats should we support?
        aug_scope.acre.get_metadata = function(path) {
            var app;
            if (!path) {
                app = data.app_id + ((data.versions.length > 0) ? '/' + data.versions[0] : '');
            } else {
                [app] = decompose_path(path, null, true, true);
            }

            return proto_require(app, null, skip_cache);
        };

        function get_sobj(path, version) {
            if (!path) {
                throw new Error("No URL provided");
            }

            var [app, script] = decompose_path(path, version);

            if (!script)
                throw new Error("Must specify a file to require");

            var sobj = proto_require(app, script, skip_cache);

            // XXX I'd rather use app+script here, but the tests depend
            // on path
            if (sobj === null) {
                throw new Error('Could not fetch data from ' + path);
            }

            if (sobj.app.app_id+'/'+sobj.name == aug_scope.acre.current_script.id)
                throw new Error("A script can not require itself");

            return sobj;
        }

        aug_scope.acre.get_source = function(path, version) {
            var sobj = get_sobj(path, version);
            if (sobj === null) {
                // throw error here
            }
            return sobj.get_content().body;
        };

        // XXX to_http_response() is largely unimplemented
        aug_scope.acre.include = function(path, version) {
            var scope = (this !== aug_scope.acre) ? this : scope;

            var sobj = get_sobj(path, version);

            return sobj.to_http_response(scope).body;
        };

        aug_scope.acre.require = function(path, version) {
            var scope = (this !== aug_scope.acre) ? this : scope;

            var sobj = get_sobj(path, version);

            return sobj.to_module(scope);
        };

        return aug_scope;
    }

    function run_augmentation(script) {
        // XXX find a more elegent way to do this
        function make_scope(start, style) {
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

        function deep_make_scope (start) {
            return make_scope(start, 'deep');
        };

        function MqlQueryWrapper(name, q) {
            function copy_h(o) {
                var ret;

                if (o && o instanceof Array) {
                    ret = [];
                    for (var i = 0; i < o.length; i++) {
                        ret.push(copy_h(o[i]));
                    }
                } else if (o && o instanceof Object) {
                    ret = {};
                    for (var a in o) {
                        ret[a] = copy_h(o[a]);
                    }
                } else {
                    ret = o;
                }

                return ret;
            }

            var that = {};

            that.name = name;
            that.query = copy_h(q);

            that.extend = function(obj) {
                var copy = copy_h(that.query);
                return MqlQueryWrapper(
                    that.name,
                    acre.freebase.extend_query(copy, obj)
                );
            };

            that.read = function(envelope, opts) {
                return acre.freebase.mqlread(that.query, envelope, opts);
            };

            that.write = function(envelope, opts) {
                return acre.freebase.mqlwrite(that.query, envelope, opts);
            };

            return that;
        }

        script.to_module = function (scope) {
            var res = null;

            // We do this, so that .apply()d scopes will be able
            // to access the top-level things. This is kind of a
            // mess, but does the job. It's a simplification of
            // the behavior of make_scope().
            if (scope && scope !== _topscope) {
                scope.__proto__ = _topscope;
                scope.acre = {};
                scope.acre.__proto__ = _topscope.acre;
            }

            var compiler_env = {
                'scope':scope_augmentation(scope || make_scope()),
                'swizzle':false,
                'class_name':script.app.app_id + '/' + script.name,
                'content_hash':script.data.content_hash
            };

            switch (script.data.handler) {
            case 'mqlquery':
                res = _hostenv.load_script_from_cache(compiler_env.class_name,
                                                      compiler_env.content_hash,
                                                      {},
                                                      false
                                                     );
                if (res == null) {
                    res = {
                        name: script.name,
                        query: JSON.parse(script.get_content().body)
                    };
                    var jsstr = "var module = ("+JSON.stringify(res)+");";
                    res = _hostenv.load_script_from_string(jsstr,
                                                           compiler_env.class_name,
                                                           compiler_env.content_hash,
                                                           {},
                                                           null,
                                                           compiler_env.swizzle);
                }
                res = MqlQueryWrapper(res.module.name, res.module.query);
                break;
            case 'binary':
                res = script.get_content();
                break;
            case 'passthrough':
                res = _hostenv.load_script_from_cache(compiler_env.class_name,
                                                      compiler_env.content_hash,
                                                      {},
                                                      false
                                                     );

                if (res == null) {
                    res = script.get_content();

                    var jsstr = "var module = ("+JSON.stringify(res)+");";
                    res = _hostenv.load_script_from_string(jsstr,
                                                           compiler_env.class_name,
                                                           compiler_env.content_hash,
                                                           {},
                                                           null,
                                                           compiler_env.swizzle);
                }
                res = res.module;

                break;
            case 'acre_script':
                res = _hostenv.load_script_from_cache(compiler_env.class_name,
                                                      compiler_env.content_hash,
                                                      compiler_env.scope,
                                                      compiler_env.swizzle);

                if (res === null) {
                    res = _hostenv.load_script_from_string(script.get_content().body,
                                                           compiler_env.class_name,
                                                           compiler_env.content_hash,
                                                           compiler_env.scope,
                                                           null,
                                                           compiler_env.swizzle);
                }
                break;
            case 'mjt':
                var module;
                module = _hostenv.load_script_from_cache(compiler_env.class_name,
                                                         compiler_env.content_hash,
                                                         compiler_env.scope,
                                                         compiler_env.swizzle);

                if (module === null) {

                    var cpkg = _mjt.acre.compile_string(script.get_content().body,
                                                        compiler_env.class_name);
                    var js_text = 'var pkgdef = (' + cpkg.toJS() +');';
                    module =
                        _hostenv.load_script_from_string(js_text,
                                                         compiler_env.class_name,
                                                         compiler_env.content_hash,
                                                         compiler_env.scope,
                                                         cpkg.debug_locs,
                                                         compiler_env.swizzle);
                }

                res = (new _mjt.TemplatePackage())
                    .init_from_js(module.pkgdef).toplevel();
                break;
            default:
                throw make_uberfetch_error("Unsupported Handler Type");
            }

            return res;
        };

        script.to_http_response = function (scope, params)  {
            var module = script.to_module(scope);
            var res = {'body':'', 'status':200, 'headers':{}};

            params = params || acre.request.params;
            switch (script.data.handler) {
            case 'mqlquery':
                var callback = params.callback || null;
                delete params.callback;
                var q = acre.freebase.extend_query(module.query,
                                                   params);
                if (callback !== null) {
                    res.headers['content_type'] = 'text/javascript';
                    res.body += callback+'(';
                } else {
                    res.headers['content_type'] = 'text/plain';
                }

                try {
                    var mqlres = _system_freebase.mqlread(q);
                    res.body += JSON.stringify(mqlres.result, null, 2);
                } catch (e) {
                    res.body += JSON.stringify(e.response, null, 2);
                }

                if (callback !== null)
                    res.body += ')';

                break;
            case 'binary':
            case 'passthrough':
                res = module;
                break;
            case 'acre_script':
                // Actually do nothing for now, in the future we probably
                // want to collect the results
                res = null;
                break;
            case 'mjt':
                var pkg = module._main.prototype.tpackage;
                var pkgtop = pkg.tcall;
                res.headers['content-type'] = pkgtop.doc_content_type || 'text/html';
                res.body = pkgtop;
                break;
            default:
                throw make_uberfetch_error("Unsupported Handler Type");
            }

            return res;
        };

        return script;
    }

    return run_augmentation(FileData(data, s));
};

// ---------------------------------------- finish_response ------------------------------

// this is a callback that gets invoked after the script has finished.
// ideally we could use try...catch to catch AcreException only and
// run this, but rhino destroys the stack traces of all the other
// exceptions then.
// so the try...catch is in java, and the java code calls back in here
// to finish the response.
// note that this shouldn't be a security issue: this code is not called with
// any special privileges, we aren't trying to enforce security requirements
// on the headers.  so if an app trashes the js scope, that's its problem.
//

_hostenv.finish_response = function () {
    // post process headers so everything is lower case, this sucks
    // but we need it so we can easily modify header values

    var hdrs = {};
    for (var k in acre.response.headers) {
        var v = acre.response.headers[k];
        if (v instanceof Array)
            v = v.join('; ');
        hdrs[k.toLowerCase()] = v;
    };
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

// LATER
// hide the global 'mjt' symbol
//delete mjt;

//----------------------------- request parameters --------------------------------

/**
 * the query_string, decoded into a Javascript object using form url encoding.
 * set to {} if no query string was present or parseable.
 */
try {
    acre.request.params = (typeof acre.request.query_string == 'string') ? acre.form.decode(acre.request.query_string) : {};
    acre.request.body_params = (typeof acre.request.body == 'string' && typeof acre.request.headers['content-type'] == 'string' && acre.request.headers['content-type'].match(/^application\/x-www-form-urlencoded/)) ? acre.form.decode(acre.request.body) : {};
    acre.environ.params = acre.request.params;           // deprecated
    acre.environ.body_params = acre.request.body_params; // deprecated
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
} catch (e) {
    acre.environ.params = acre.request.params = {};
    acre.environ.body_params = acre.request.body_params = {};

    var _cookie_jar_best_match = null;
    var _cookie_jar = {};

    console.warn("Invalid request: parameters were not properly encoded");
}

// ----------------------------- acre.freebase -----------------------------------------

var mjt_freebase_whitelist = {
    "date_from_iso" : true,
    "date_to_iso" : true,
    "mqlkey_quote" : true,
    "mqlkey_unquote" : true
}

acre.freebase = {};

for (var k in _mjt.freebase) {
    if (k in mjt_freebase_whitelist) {
        acre.freebase[k] = _mjt.freebase[k];
    }
}

var _system_freebase = {};

var freebase_scope = {};
freebase_scope.syslog = syslog;
_hostenv.load_system_script('freebase.js', freebase_scope);
freebase_scope.augment(acre.freebase, acre.urlfetch, acre.async.urlfetch, freebase_service_url, freebase_site_host, mwlt_mode);
freebase_scope.augment(_system_freebase, _system_urlfetch, _system_async_urlfetch, freebase_service_url, freebase_site_host, mwlt_mode);

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

//--------------------------------- oauth ------------------------------------------

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

// We do not delete console_scope so that we can add more 'acre' objects to skip list

//--------------------------------- parse_url --------------------------------------

var URLPARSE_FOUND = 0;
var URLPARSE_MAYBE_HOST = 1;

/*
 * parse a url  (NOTE also fetches metadata!)
 *
 *   sname is the server name   (defaults to _request.server_name)
 *   pinfo is the path          (defaults to _request.path_info)
 *
 * returns an object containing the parsed url components, as well
 *  as the metadata fetched from the graph.
 */
function parse_url(sname, pinfo) {
    sname = sname || _request.server_name;
    sname = sname.toLowerCase();
    pinfo = pinfo || _request.path_info;
    var m = sname.match('((.*)\.)?' + _request.server_host + '$');
    var m2 = sname.match('((.*)\.)?' + _hostenv.ACRE_HOST_BASE + '$');
    var res = null;

    /*
     * We face two possible cases:
     *   1. Hostname matches the predetermined acre server_host
     *   2. Hostname fails to match but may be a short name
     * In either case we return a triple [conceptual_id, path_info, state]
     * The rest is handled by a call to uberfetch
     */
    if (m || sname == _hostenv.ACRE_HOST_BASE) {
        var url_namespace = (m !== null) ? m[2] : null;
        var script_namespace;
        if (!url_namespace) {
            // XXX we're rendering the default here...
            script_namespace = '/freebase/apps/home/release';
        } else {
            script_namespace = '/' + url_namespace.split('.').reverse().join('/');
        }

        var script_name = pinfo.substring(1).split("/")[0];
        if (script_name == '') script_name = 'index';


        var script_id = script_namespace + '/' + script_name;
        var path_info = pinfo.substring(script_name.length+1);
        if (path_info === '') path_info = '/';

        res = [script_id, path_info, URLPARSE_FOUND];
    } else if (m2) {
        var script_namespace = _DEFAULT_HOST_NS + '/z/acre/' + m2[2].split('.').reverse().join('/');

        var script_name = pinfo.substring(1).split("/")[0];
        if (script_name == '') script_name = 'index';

        var script_id = script_namespace + '/' + script_name;

        var path_info = pinfo.substring(script_name.length+1);
        if (path_info === '') path_info = '/';

        res = [script_id, path_info, URLPARSE_MAYBE_HOST];
    } else {
        var script_namespace = _DEFAULT_HOST_NS + '/' + sname.split('.').reverse().join('/');

        var script_name = pinfo.substring(1).split("/")[0];
        if (script_name == '') script_name = 'index';

        var script_id = script_namespace + '/' + script_name;

        var path_info = pinfo.substring(script_name.length+1);
        if (path_info === '') path_info = '/';

        res = [script_id, path_info, URLPARSE_MAYBE_HOST];
    }

    return res;
}

//--------------------------------------- boot ------------------------------------

/*
 * Create a good looking script context object based on
 * the flat metadata used inside uberfetch
 */
var assembleScriptObj = function(app, metadata) {
    var f = metadata;
    var app_path = app.app_id.substr(1).split('/').reverse().join('.');
    if (app.versions.length > 0) {
        app_path = app.versions[0]+'.'  + app_path;
    }
    app_path += '.dev';
    app_path = '//'+app_path;

    return {
        id : app.app_id + '/' + f.name,
        path: app_path + '/' + f.name,
        name : f.name,
        content_id : f.content_id,
        handler : f.handler,
        media_type : f.media_type,
        app : {
            id : app.app_id,
            path : app_path,
            guid : app.app_guid,
            version :(app.versions.length > 0 ? app.versions[0] : null),
            versions : app.versions,
            base_url : acre.host.protocol + "://" +
                (app.versions.length > 0 ? (app.versions[0] + ".") : "") +
                app.app_id.split('/').reverse().join('.') +
                acre.host.dev_name +
                (acre.host.port !== 80 ? (":" + acre.host.port) : "")
        }
    };
};

function split_ns(id) {
    var namespace = id.split('/');
    var f = namespace.pop();
    namespace = namespace.join('/');
    return [namespace, f];
}

/*
 * look up a document in the blob store and load it as an acre script.
 */
var boot_acrelet = function () {
    var freebase_source_url = '';
    function make_freebase_source_url(namespace, script_name) {
        return _request.freebase_site_host +
            '/appeditor#!path=//' + namespace.split("/").reverse().join(".") + 'dev/' + script_name;
    }

    var url_result = [];

    // override handler script if indicated (for internal redirects)
    var _handler_script_id = null;
    if (typeof _request.handler_script_id == 'string' &&
        _request.handler_script_id != '') {
        url_result[0] = _handler_script_id = _request.handler_script_id;
        url_result[1] = _request.path_info;
        url_result[2] = URLPARSE_FOUND;
        /// XXX fulhack to support the correct source url in the error page
        if ('error' in acre && 'script' in acre.error &&
            'id' in acre.error.script) {
            var [ens, esn] = split_ns(acre.error.script.id);
            freebase_source_url = make_freebase_source_url(ens, esn);
        }
    } else {
        url_result = parse_url();
    }
    delete _request.handler_script_id;

    var [namespace, script_name] = split_ns(url_result[0]);

    // XXX there is a chicken and the egg problem here, we need to touch
    // before fetching metadata, but we don't want to touch if we're
    // getting a local-file since we don't need to. Personally, I find
    // consistency is better than a slight speed up for shift-reload on
    // local files...

    var skip_cache = false;
    // if we get 'cache-control: no-cache' in the request headers
    // (normally triggered by a shift-reload in the browser)
    // we need to touch and get a new mwLastWriteTime value to really clear
    // the caches
    // if an x-acre-cache-control header is present, then do not bust the cache
    // The reason for this change is that many browsers will by default issue
    // a no-cache cache-control header for XHR post requests which will make 
    // them very slow for no reason on acre
    // In order to bypass this problem, we introduced a new header that instructs
    // acre to not bust its uberfetch cache for these requests
    if ('cache-control' in acre.request.headers && !('x-acre-cache-control' in acre.request.headers)) {
        if (/no-cache/.test(acre.request.headers['cache-control'])) {
            // get a new _mwLastWriteTime for the client so future
            // requests will also be fresh.
            _system_freebase.touch();
            skip_cache = true;
        }
    }

    // We can't use AcreScript here because it requires a script name, which we
    // can't really determine; There may be a work around? It sucks to have to
    // split out this instance of metadata resolution
    if (_request.request_url.split('/')[3] == 'acre') {
        var req_url_res = parse_url(_request.request_server_name,
                                    _request.request_path_info);
        var [reqns, reqsn] = split_ns(req_url_res[0]);

        var out = proto_require(reqns, null, skip_cache);
        if (out !== null) {
          if (reqsn in out.files) {
            acre.request.requested_script = {
              'app':{
                'id':out.app_id
              },
              'name':out.files[reqsn].name,
              'version':out.app_version,
              'id':out.app_id+'/'+out.files[reqsn].name
            };
            freebase_source_url = make_freebase_source_url(out.app_id, out.files[reqsn].name);
          }
          _request_app_guid = out.app_guid;
        }
    }

    var FALLTHROUGH_SCRIPTS = {
        'robots.txt':true,
        'favicon.ico':true,
        'error':true
    };

    function fallbacks_for(ns, sname) {
        sname = sname || null;

        var fallbacks = [];
        if (_request.skip_routes !== true)
            fallbacks.push(ns+'/routes');

        fallbacks.push(url_result[0]);

        if (sname in FALLTHROUGH_SCRIPTS) {
            fallbacks.push(
                    _hostenv.DEFAULT_NAMESPACE + '/' + sname
            );
        }

        fallbacks = fallbacks.concat(
            [
                ns + '/not_found',
                _hostenv.DEFAULT_NAMESPACE + '/not_found'
            ]
        );

        return fallbacks;
    };

    var fallbacks = fallbacks_for(namespace, script_name);

    var data = null;
    for (var a=0; a < fallbacks.length; a++) {
        var [ns, sn] = split_ns(fallbacks[a]);
        try {
            data = proto_require(ns, sn, skip_cache);
        } catch (e if e.__code__ == UBERFETCH_ERROR_MQLREAD) {
            acre.response.status = 503;
            acre.write("Service Temporarily Unavailable\n");
            acre.exit();
        }

        if (data !== null) {
            // XXX fulhack to reset the path_info when running routes
            if (sn == 'routes') {
                var [_, rsn] = split_ns(url_result[0]);
                url_result[1] = '/'+(rsn !== 'index' ? rsn : '') +
                    (url_result[1] != "/" ? url_result[1] : '');
            }
            break;
        }
    }

    if (data == null) {
        // this is a catastrophic lookup failure
        acre.response.set_header('content-type', 'text/plain');
        acre.response.status = 404;
        acre.write('No valid acre script found at ' + url_result[0] + ' (or defaults)\n');
        acre.exit();
    }

    acre.request.path_info = url_result[1];

    _hostenv.script_namespace = data.app.app_id;
    _hostenv.script_id = data.app.app_id +'/' + data.name;
    _hostenv.script_name = data.name;

    // We need this information to generate things like the appeditor url, and
    // to run the not_found page, it will actually get overriden with a proper
    // version if scope_augmentation is running in _topscope
    acre.request.script = {
        'app': {
            'id':namespace
        },
        'name':script_name
    };

    // before the script is actually run, we want to set the app_guid aside
    // if we didn't already do so
    if (_request_app_guid === null) {
        _request_app_guid = data.app.app_guid;
    }

    // View Source link:
    if (freebase_source_url == '') {
        var link_ns = ((acre.request.script.app.id != namespace) ?
                       namespace : acre.request.script.app.id);
        var link_sname = ((acre.request.script.name != script_name) ?
                          script_name : acre.request.script.name);

        freebase_source_url = make_freebase_source_url(link_ns, link_sname);
    }

    // Every acre http response also has this link
    acre.response.set_header('x-acre-source-url', freebase_source_url);

    // Decorate deprecated APIs with warning messages, and setup deprecated values
    // XXX may want to move this into the _topscope block in scope_augmentation?
    // it would give more accurate information, and deprecate() has to be there
    // any way.
    (function () {
         acre.request_context = { // deprecated
             script_name : script_name,
             script_id : url_result[0],
             script_namespace : namespace,
             script_version : (data.app.versions.length > 0 ?
                               data.app.versions[0] : null)
         };

         acre.environ.path_info = url_result[1]; // deprecated

         acre.context = acre.request_context; // deprecated
         acre.environ.script_name = data.name; // deprecated
         acre.environ.script_id = data.app.app_id + '/' + data.name; // deprecated
         acre.environ.script_namespace = data.app.app_id; // deprecated
    })();

    var res = data.to_http_response(_topscope);
    if (res !== null) {
        acre.response.status = res.status;
        for (var k in res.headers) {
            var v = res.headers[k];
            acre.response.set_header(k.toLowerCase(), v);
        }

        acre.write(res.body);
    }

};

// ------------------------------- let's roll ------------------------

boot_acrelet();

})();
