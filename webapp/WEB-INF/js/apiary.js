var _system_freebase;
var URL_SIZE_LIMIT = 2047;

var APIARY_KEY = null;
/**
 * Attach the functions defined in this script to the given API object
 * to make them available to the user scope
 */
function augment(freebase, urlfetch, async_urlfetch, request) {
    // tuck this away so we can use it in handler and appfetcher creation

    // XXX - relies on augment being called for system *after* user...
    // *and* before register_handler or register_appfetcher
    _system_freebase = freebase;
    
    freebase.service_url = request.freebase_service_url;
    freebase.site_host = request.freebase_site_host;

    freebase.apiary_url = request.apiary_service_url;   // XXX - for transition only... will remove later
    APIARY_KEY = request.apiary_key;
  
    // XXX FreebaseError is getting built twice because this is called for
    // user and system

    // Create the exception that we'll throw if freebase returned an error
    freebase.Error = function (message) {
        this.message = message;
    };

    freebase.Error.prototype = new Error();
    freebase.Error.prototype.name = 'acre.freebase.Error';

    freebase.set_service_url = function set_service_url(url) {
        try {
            var site = url.split('/')[2];
            var site_parts = site.split('.');
            var freebase_domain = site_parts.slice(site_parts.length - 2,
            site_parts.length).join('.');

            var provider = {
                domain                 : freebase_domain,
                request_token_URL      : "https://" + site + "/api/oauth/request_token",
                access_token_URL       : "https://" + site + "/api/oauth/access_token",
                user_authorization_URL : "https://" + site + "/signin/app"
            };

            freebase.service_url = url;
            acre.oauth.providers.freebase = provider;
        } catch (e) {
            throw new acre.errors.URLError("invalid url for set_service_url: "+url);
        }
    };


    /**
     *  Separate out fetch options from api options;
     *  Also make sure we're not munging the original options object we were passed.
     */
    function decant_options(options) {
        var reserved = {
            callback          : true,
            errback           : true
        };

        if (options) {
            if (!(typeof options == 'object' && !(options instanceof Array))) throw new Error('Options must be an object');
        } else {
            options = {};
        }

        var api_opts = {};
        var fetch_opts = {};

        for (var k in options) {
            if (reserved[k]) {
                fetch_opts[k] = options[k];
            } else if (/^http_/.test(k)) {
                fetch_opts[k.replace(/^http_/,"")] = options[k];
            } else {
                api_opts[k] = options[k];
            }
        }
        return [api_opts, fetch_opts];
    }

    /**
     * perform url-encoding of a complex js object by JSON-stringifying the
     * the values of the first level that are js objects
     */
    function form_encode(obj) {
        for (var k in obj) {
            if (typeof obj[k] == 'object') {
                obj[k] = JSON.stringify(obj[k]);
            }
        }
        return acre.form.encode(obj);
    }

    /**
     * lookup the per app freebase apiary api key in the datastore and return it if present. 
     * throw an exception if not found
     */
    function get_app_freebase_api_key() {
        try { 
          return acre.keystore.get('freebase_api')[0];
        } catch (e) { 
          throw new Error('Failed to get Freebase API Key from keystore for this app, try /acre/keystore_console on this host to see available keys.');
        }
    }

    //per app client-side (/image) api key
    function get_app_freebase_image_api_key() {
        try { 
          return acre.keystore.get('freebase_image_api')[0];
        } catch (e) { 
          syslog.warn({}, "freebase_api_key.exposed", "You have not set up a freebase_image_api key in your keystore - using your freebase_api key instead - warning this might be exposed to users");
          return get_app_freebase_api_key();
        }
    }

    function compose_get_or_post(url, opts) {
        if (typeof opts !== "object") {
            opts = {};
        }

        if (typeof opts.content === 'undefined') {
            opts.content = "";
        }

        //we were either passed the key in the request (acre itself probably)
        //or we get the per app key from the keystore
        var api_key = opts.key || get_app_freebase_api_key();

        if ((!opts.method || opts.method === "GET") && url.length + opts.content.length < URL_SIZE_LIMIT) {
            opts.method = "GET";
            url += "?key=" + api_key + "&" + opts.content;
            delete opts.content;
        } else {
          opts.method = "POST";
          opts.bless = true;  // because this helper only used for safe requests (mqlread, search)
          opts.content += "&key=" + api_key;
        }
        console.log(opts.method + url);
        return [url, opts];
    }

    /**
     * Perform an HTTP request and parse the returned JSON object
     */
    function fetch(url, opts) {
        opts = opts || {};
        var callback = opts['callback'] ? opts['callback'] : null;
        var errback = opts['errback'] ? opts['errback'] : null;

        if (opts.method === "POST") {
            if (!opts.headers) opts.headers = {};
            //if (typeof opts.headers['Content-Type'] == 'undefined') {
                //opts.headers['Content-Type'] = "application/x-www-form-urlencoded";
                //opts.headers['Content-Type'] = "application/json";
            //}
            opts.headers['X-HTTP-Method-Override'] = 'GET';
            opts.headers['X-Requested-With'] = '1';
        }

        if (callback || errback) {
            // run asynchronously
            if (callback) {
                opts.callback = function(res) {
                    try {
                        var result = check_results(res, opts.check_results);
                        callback(result);
                    } catch (e if errback) {
                        errback(e);
                    }
                };
            }
            return async_urlfetch(url, opts);
        } else {
            // run synchronously
            try {
              var result = urlfetch(url, opts);
              return check_results(result, opts.check_results);              
            } catch(e if e.response) {
              return check_results(e.response, opts.check_results);
            }
        }
    }


    /**
     * Make sure that the JSON result generated by the freebase API is not erroneous
     */
    function check_results(result, mode) {
        switch (mode) {
            case "raw" :
                break;
            case "text-json":
                result.body = JSON.parse(result.body).result;
                break;
            case "json" :
            case "JSON" :
                result = JSON.parse(result.body);
                break;
            case "freebase" :
            default:
                response = result;
                result = JSON.parse(result.body);

                if (result.error) {
                    var error = result.error
                    var exception = new freebase.Error(error.message);
                    exception.code = error.code;
                    exception.errors = error.errors;
                    exception.response = result;
                    throw exception;
                }
        }

        return result;
    }

    /**
     * Prepare the content payload of the POST request
     */
    function prepareContent(query, envelope, params) {
        if (!query) throw new Error("You must provide a query");
        if (!envelope) envelope = {};
        if (!params) params = {};
        acre.freebase.extend_query(params, envelope);
        params.html_escape = "false";
        params.query = query;
        return form_encode(params);
    }

    function legacy_prepareContent(query, envelope, params) {
        if (!query) throw new Error("You must provide a query");
        if (!envelope) envelope = {};
        envelope.query = query;
        envelope.escape = false;
        if (!params) params = {};
        params.query = envelope;
        return form_encode(params);
    }



    /**
     * Prepare the content payload of the POST request with multiple queries
     */
    function prepareMultipleContent(queries, envelopes, params) {
        if (!queries) throw new Error("You must provide an object with queries");
        if (!envelopes) envelopes = {};
        if (!params) params = {};
        for (var query in queries) {
            var envelope = (query in envelopes) ? envelopes[query] : {};
            envelope.query = queries[query];
            envelope.escape = false;
            queries[query] = envelope;
        }
        params.queries = queries;
        return form_encode(params);
    }

    /**
     * Perform the mqlread (composer
     */
    function mqlread(q,e,o,composer) {
        var [api_opts, fetch_opts] = decant_options(o);
        var url = freebase.apiary_url + "/mqlread";
        fetch_opts.content = composer(q,e,api_opts);

        //TODO: move apiVersion to config
        //TODO: move this functionality to prepareContent
        //fetch_opts.rpc_method_name = "mql.read";
        //rpc_opts = { 'method' : 'mql.read', 'apiVersion' : 'v1-sandbox', 'params' : {'query' : JSON.stringify(q)  } };
        //acre.freebase.extend_query(rpc_opts['params'], e);
        //acre.freebase.extend_query(rpc_opts['params'], o);

        return fetch.apply(this, compose_get_or_post(url, fetch_opts));
    }

    function legacy_mqlread(q,e,o,composer) {
        var [api_opts, fetch_opts] = decant_options(o);
        var url = freebase.service_url + "/api/service/mqlread";
        fetch_opts.content = composer(q,e,api_opts);
        return fetch.apply(this, compose_get_or_post(url, fetch_opts));
    }
  
    /**
     * Get info about topics using the Topic API
     */
    function topic(id,options) {
        var base_url = freebase.service_url + "/experimental/topic/";
        var mode = options.mode || 'standard';
        delete options.mode;
        switch (mode) {
            case "basic" :
            case "standard" :
            case "extended" :
                base_url += mode;
                break;
            default:
                throw new Error("Invalid mode; must be 'basic' or 'standard'");
        }
        options.id = (id instanceof Array) ? id.join(',') : id;
        var [api_opts, fetch_opts] = decant_options(options);
        var url = acre.form.build_url(base_url, api_opts);
        fetch_opts.check_results = "json";
        return fetch(url, fetch_opts);
    };


    // -----------------------acre.freebase APIs -----------------------------------

    /**
     * Expose fetch API for use with the Web Services library
     */
    freebase.fetch = fetch;

    /**
     * Call the 'touch' api to reset the caches
     */
    freebase.touch = function(options) {
        var [api_opts, fetch_opts] = decant_options(options);
        //acre.response.vary_cookies['mwLastWriteTime'] = 1;
        var url = freebase.service_url + "/api/service/touch";
        fetch_opts.method = "POST";
        fetch_opts.bless = true;  // safe request, even though it's POST
        return fetch(url, fetch_opts);
    };

    /**
     * Obtain user information from freebase. It will return 'null'
     * if the user has no valid oauth credentials
     */
     freebase.get_user_info = function(options) {
         var [api_opts, fetch_opts] = decant_options(options);
         var base_url = freebase.apiary_url + "/user_info";
         api_opts.key = get_app_freebase_api_key();
         var url = acre.form.build_url(base_url, api_opts);
         fetch_opts.sign = true;
         fetch_opts.check_results = "json";

         function handle_get_user_info_success(res) {
             // this sets vary_cookies on the oauth cookies for us
             acre.oauth.has_credentials();
             return res;
         }

         function handle_get_user_info_error(e) {
             // remove the oauth cookies if the user credentials are no longer valid
             acre.oauth.remove_credentials();
             return null;
         }

         var callback = fetch_opts.callback;
         var errback = fetch_opts.errback;

         if(callback) {
             fetch_opts.callback = function(res) {
                 callback(handle_get_user_info_success(res));
             };
             fetch_opts.errback = function(e) {
                 callback(handle_get_user_info_error(e));
             };
             return fetch(url, fetch_opts);
         } else {
             try {
                 var res = fetch(url, fetch_opts);
                 return handle_get_user_info_success(res);
             } catch (e) {
                 return handle_get_user_info_error(e);
             }
         }
     };

    /**
     * Perform a mqlread
     */
    freebase.mqlread = function(query,envelope,options) {
        if (envelope && envelope['extended']) { 
            return legacy_mqlread(query,envelope,options,legacy_prepareContent);
        } else{
            return mqlread(query,envelope,options,prepareContent);
        }
    };

    /**
     * Perform a mqlread on multiple queries
     */
    freebase.mqlread_multiple = function(queries,envelopes,options) {
        return mqlread(queries,envelopes,options,prepareMultipleContent);
    };

    /**
     * Perform a mqlwrite
     */
    freebase.mqlwrite = function(query,envelope,options) {
        var [api_opts, fetch_opts] = decant_options(options);
        var url = freebase.apiary_url + "/mqlwrite";
        fetch_opts.method = "POST";
        fetch_opts.content = prepareContent(query,envelope,api_opts);
        if (typeof fetch_opts.sign === 'undefined') fetch_opts.sign = true;
        return fetch(url, fetch_opts);
    };

    /**
     * Perform an upload
     */
    freebase.upload = function(content,media_type,options) {
        var [api_opts, fetch_opts] = decant_options(options);
        if (!content) throw new Error("You must specify what content to upload");
        if (!media_type) throw new Error("You must specify a media type for the content to upload");
        var url = freebase.service_url + "/api/service/upload";
        if (options) url += "?" + form_encode(api_opts);
        //acre.response.vary_cookies['mwLastWriteTime'] = 1;
        fetch_opts.method = "POST";
        fetch_opts.content = content;
        fetch_opts.headers = { "Content-Type" : media_type };
        if (typeof fetch_opts.sign === 'undefined') fetch_opts.sign = true;
        return fetch(url, fetch_opts);
    };

    /**
     * Creates an anonymous, self-administering group
     */
    freebase.create_group = function(name, options) {
        var [api_opts, fetch_opts] = decant_options(options);
        var url = freebase.service_url + "/api/service/create_group";
        if (typeof name != 'undefined') {
            var params = { 'name' : name };
        } else {
            var params = {};
        }
        fetch_opts.method = "POST";
        fetch_opts.content = form_encode(api_opts);
        if (typeof fetch_opts.sign === 'undefined') fetch_opts.sign = true;
        return fetch(url, fetch_opts);
    };

    /**
     * Get a blob from Freebase content store
     */
    freebase.get_blob = function(id,mode,options) {
        if (!id) throw new Error("You must provide the id of the blob you want");
        if (!options) var options = {};
        // this is done for back compatibility with the previous API signature
        if (typeof mode == 'object') {
            options = mode;
            mode = options.mode;
            delete options.mode;
        }

        var [api_opts, fetch_opts] = decant_options(options);

        mode = mode || "plain";
        var base_url = freebase.apiary_url + "/text" + id;
        api_opts.key = get_app_freebase_api_key();
        switch (mode) {
          case "escaped": 
          case "unsafe":
            api_opts.format = 'raw';
            break;
          case "blurb":
          case "plain":
            api_opts.format = 'plain';
            break;
          case "raw":
          case "html":
            api_opts.format = 'html';
            break;
          default:
            throw new Error("Invalid mode; must be 'html' or 'plain' or 'escaped'");
        }

        // TODO -- this will get the callbacks
        var url = acre.form.build_url(base_url, api_opts);
        fetch_opts.method = "GET";
        fetch_opts.headers = {'X-Requested-With' : '1' },
        fetch_opts.check_results = "text-json";
        return fetch(url, fetch_opts);
    };

    /**
     * Get info about a single topic using the Topic API
     */
    freebase.get_topic = function(id,options) {
        if (!id) throw new Error('You must provide the id of the topic you want');
        if (id.indexOf(',') > 0) throw new Error('Use get_topic_multi if you want to retrieve multiple topics');
        if (typeof id != 'string') throw new Error("'get_topic' needs a string as ID, if you need to get multiple topics use 'get_topic_multi' instead.");

        if (options.callback) {
            var callback = options.callback;
            options.callback = function(topic){
               callback(topic[id]);
            };
            return topic(id,options);
        } else {
            return topic(id,options)[id];
        }
    };

    /**
     * Get info about a multiple topics using the Topic API
     */
    freebase.get_topic_multi = function(ids,options) {
        if (!ids) throw new Error('You must provide an array of ids of the topics you want');
        if (!(ids instanceof Array)) throw new Error("'get_topic_multi' needs an array of IDs, if you need to get a single topic use 'get_topic' instead.");
        return topic(ids,options);
    };

    /**
     * Perform a search
     */
    freebase.search = function(query,options) {
        var [api_opts, fetch_opts] = decant_options(options);
        if (!query) throw new Error("You must provide a string to search");
        if (!api_opts) api_opts = {};
        api_opts.query = query;
        api_opts.format = "json";
        fetch_opts.content = form_encode(api_opts);
        var url = freebase.service_url + "/api/service/search";
        return fetch.apply(this, compose_get_or_post(url, fetch_opts));
    };

    /**
     * Perform a geosearch
     */
    freebase.geosearch = function(location,options) {
        var [api_opts, fetch_opts] = decant_options(options);
        if (!location) throw new Error("You must provide a location to geosearch");
        if (!options) options = {};
        api_opts.location = location;
        api_opts.format = "json";
        fetch_opts.content = form_encode(api_opts);
        var url = freebase.service_url + "/api/service/geosearch";
        return fetch.apply(this, compose_get_or_post(url, fetch_opts));
    };

    /**
     *  Applies parameters to a query
     *
     *  @param query     a mql query
     *  @param paths     an object of paramaters where the key is a path and the value is an updated value
     */
    freebase.extend_query = function (query, paths) {
      if (typeof paths == 'undefined')
        paths = {};
      if (typeof query == 'undefined')
        throw new Error('extend_query: MQL query is undefined');

      // go through all the substitutions in the paths dict,
      // patching query accordingly.
      for (var path in paths) {
        var val = paths[path];

        // turn the path expression into a list of keys
        var pathkeys = path.split('.');
        var last_key = pathkeys.pop();

        // walk the obj variable down the path starting
        // at the query root
        var obj = query instanceof Array ? query[0] : query;

        for (var i = 0; i < pathkeys.length; i++) {
          var key = pathkeys[i];
          // If we're on an uncreated frontier, create it.
          if (typeof obj[key] != 'object' || obj[key] === null) {
            obj[key] = {};
          }
          obj = obj[key];
          if (obj instanceof Array) {
            if (obj.length == 0)
              obj = [{}];

            if (obj.length > 1)
              throw new Error('extend_query: path ' + JSON.stringify(path)
                              + ' references an array with more than one element');

            obj = obj[0];
          }
        }

        if (obj === null || typeof obj != 'object') {
          throw new Error('extend_query: path ' + JSON.stringify(path)
                          + ' does not exist in query');
        }

        // patch in the final value
        obj[last_key] = val;
      }

      return query;
    };

    freebase.imgurl = function(cid, maxwidth, maxheight, mode, errorid) {
      var qargs = {};
      if (typeof maxwidth !== 'undefined') {
        qargs.maxwidth = maxwidth;
      }
      if (typeof maxheight !== 'undefined') {
        qargs.maxheight = maxheight;
      }
      if (typeof mode !== 'undefined') {
        qargs.mode = mode;
      }
      if (typeof errorid !== 'undefined') {
        qargs.errorid = errorid;
      }

      var qstr = 'key=' + get_app_freebase_image_api_key();
      for (var a in qargs) {
        if (!qargs[a]) continue;
        if (qstr !== '') qstr += '&';
        qstr += a+'='+encodeURIComponent(qargs[a]);
      }

      return freebase.apiary_url + '/image' + cid + "?" + qstr;
  };
}



// ------------------- mqlquery file handler ------------------------------

function handler() {

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

    return {
        'to_js': function(script) {
            var res = {
                name: script.name,
                query: JSON.parse(script.get_content().body)
            };
            return "var module = ("+JSON.stringify(res)+");";
        },
        'to_module': function(compiled_js, script) {
            return MqlQueryWrapper(compiled_js.module.name, compiled_js.module.query);
        },
        'to_http_response': function(module, script) {
            var res = {'body':'', 'status':200, 'headers':{}};

            var q = acre.freebase.extend_query(module.query, acre.request.params);
            delete q.callback;

            var callback = acre.request.params.callback || null;
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

            if (callback !== null) {
                res.body += ')';
            }

            return res;
        }
    };
}



// --------------------- Freebase graph appfetcher ------------------------------

// XXX - configs & utils copy/pasted from acreboot, ugh
var _DELIMITER_PATH = "dev";
var _DEFAULT_HOSTS_PATH = '/freebase/apps/hosts';
var _DEFAULT_ACRE_HOST_PATH = "/z/acre";

function escape_re(s) {
  var specials = /[.*+?|()\[\]{}\\]/g;
  return s.replace(specials, '\\$&');
}

function namespace_to_host(namespace) {
    var host_re = new RegExp(escape_re('^' + _DEFAULT_HOSTS_PATH));
    var acre_host_re = new RegExp(escape_re('^' + _DEFAULT_ACRE_HOST_PATH));

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


function appfetcher(register_appfetcher, make_appfetch_error, _system_urlfetch) {

    var APPFETCH_ERROR_UNKNOWN = 1,
        APPFETCH_ERROR_METHOD = 2,
        APPFETCH_ERROR_APP = 3,
        APPFETCH_ERROR_NOT_FOUND = 4,
        APPFETCH_THUNK = 5;
        
    var have_touched = false;

    var graph_resolver = function(host) {
        return host_to_namespace(host);
    };

    var graph_inventory_path  = function(app, namespace) {
        // get a new _mwLastWriteTime for the client so all
        // requests will also be fresh.
        if (acre.request.skip_cache === true && have_touched === false) {
            _system_freebase.touch();
            have_touched = true;
        }
        
        var result = {
            dirs : {},
            files : {}
        };

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

         // if we have an as_of time, add it to the envelope
         try {
             var envelope = (app.as_of !== null) ?
             { 'as_of_time' : /(.*)Z/.exec(app.as_of)[1] } : null;
         } catch (e) {
             // Unable to parse
             syslog.error(e, "appfetch.graph.asof.parse.error");
             throw make_appfetch_error("as_of_time parse error", APPFETCH_ERROR_APP, e);
         }

         try {
             var res = _system_freebase.mqlread(q, envelope, {'key' : APIARY_KEY }).result;
         } catch (e) {
             syslog.error(e, "appfetch.graph.mqlread.error");
             throw make_appfetch_error("Mqlread Error", APPFETCH_ERROR_METHOD, e);
         }

         if (res == null) {
             syslog.debug({'fake_id':namespace}, "appfetch.graph.not_found");
             throw make_appfetch_error("Not Found Error", APPFETCH_ERROR_NOT_FOUND);
         }

         if ('permission' in res && res['permission'] === '/boot/all_permission') {
             console.error("Script has /boot/all_permission as permission node and " +
             "thus cannot be run");
             throw make_appfetch_error("Boot permission used", APPFETCH_ERROR_APP);
         }

         var app_version_t = res["/freebase/apps/acre_app_version/acre_app"];
         if (app_version_t !== null) {
             // Handle the case that we've hit a version node
             var target_host = namespace_to_host(app_version_t['id']);
             app.guid = app_version_t['guid'];
             app.as_of = res['/freebase/apps/acre_app_version/as_of_time'];

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
             * presence of result.hosts.
             */
             var target_versions = app_version_t['/type/namespace/keys'];

             for (var a=0; a < target_versions.length; a++) {
                 var version = target_versions[a].value;
                 app.versions.push(version);

                 var vhost = version + '.' + target_host;
                 if (vhost !== app.host) app.hosts.push(vhost);
             }

             var canonical_host = namespace_to_host(res.id);
             if (canonical_host !== app.host) {
                 app.hosts.push(canonical_host);
             }

             var servurl = res['/freebase/apps/acre_app_version/service_url'];
             if (servurl !== null) {
                 app.freebase = app.freebase || {};
                 app.freebase.service_url = servurl;
             }

             // thunkety, thunk, thunk
             throw make_appfetch_error(null, APPFETCH_THUNK, {method:"freebase", args:[target_host, app]});
         }

         // Explictly build out the metadata here, filling in any blanks, in case
         // we didn't hit a version node up front.
         app.id = res.id;
         app.guid = res.guid;
         app.ttl = (app.versions && app.versions.length) ? 600000 : 0;

         app.freebase = app.freebase || {};
         app.freebase.write_user = (res['/type/domain/owners'] != null ? res['/type/domain/owners'].member.id.substr(6) : null);

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
                     file_result.name = _system_freebase.mqlkey_unquote(f.value);
                     var handler = file_data['/freebase/apps/acre_doc/handler'];
                     file_result.handler = (handler && 'handler_key' in handler ?
                                            handler.handler_key : 'passthrough');
                     file_result.media_type =
                        file_data['/common/document/content'].media_type.substr(12);
                    file_result.content_id = file_data['/common/document/content'].id;
                     file_result.content_hash =
                        file_data['/common/document/content'].guid.substr(1);

                     app.files[file_result.name] = file_result;
                 } else {
                     syslog.warn({"filename":f.value}, "appfetch.not_a_file");
                 }
             }
         }

         return app;
     };

     var graph_get_content = function() {
         if (this.handler === 'binary') {
             return _system_freebase.get_blob(this.content_id, 'raw', {'key' : APIARY_KEY });
         } else {
             return _system_freebase.get_blob(this.content_id, 'unsafe', { 'key' : APIARY_KEY });
         }
     };

     register_appfetcher("freebase", graph_resolver, graph_inventory_path, graph_get_content);
 };
