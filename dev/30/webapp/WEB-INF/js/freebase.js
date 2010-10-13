var URL_SIZE_LIMIT = 2047;

/**
 * Attach the functions defined in this script to the given API object
 * to make them available to the user scope
 */
function augment(freebase, urlfetch, async_urlfetch, service_url, site_host, mwlt_mode) {

    freebase.service_url = service_url;
    freebase.site_host = site_host;

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
            errback           : true,
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


    function compose_get_or_post(url, opts) {
        if (typeof opts !== "object") {
            opts = {};
        }

        if (typeof opts.content === 'undefined') {
            opts.content = "";
        }

        if ((!opts.method || opts.method === "GET") && url.length + opts.content.length < URL_SIZE_LIMIT) {
            opts.method = "GET";
            url += "?" + opts.content;
            delete opts.content;
        } else {
            opts.method = "POST";
        }
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
            if (typeof opts.headers['Content-Type'] == 'undefined') {
                opts.headers['Content-Type'] = "application/x-www-form-urlencoded";
            }
            opts.headers['X-Requested-With'] = "1";
            if (opts.content && mwlt_mode == true && opts.content !== ''
                && opts.headers['Content-Type'] === "application/x-www-form-urlencoded") {
                opts.content += '&mw_cookie_scope=domain';
            } else if (mwlt_mode == true
                    && opts.headers['Content-Type'] === "application/x-www-form-urlencoded") {
                opts.content = 'mw_cookie_scope=domain';
            } else if (mwlt_mode === true && url.indexOf('?') > -1) {
                opts.url += '&mw_cookie_scope=domain';
            } else if (mwlt_mode === true) {
                opts.url += "?mw_cookie_scope=domain";
            }
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
            return check_results(urlfetch(url, opts), opts.check_results);
        }
    }


    /**
     * Make sure that the JSON result generated by the freebase API is not erroneous
     */
    function check_results(result, mode) {
        switch (mode) {
            case "raw" :
                break;
            case "json" :
            case "JSON" :
                result = JSON.parse(result.body);
                break;
            case "freebase" :
            default:
                result = JSON.parse(result.body);
                if (result.status != "200 OK" || result.code != "/api/status/ok") {

                    if (result.status != "200 OK") {
                        var message = 'HTTP error: ' + result.status;
                    } else if ('message' in result.messages[0]) {
                        var message = result.code + ': ' + result.messages[0].message;
                    } else {
                        var message = result.code;
                    }

                    var exception = new freebase.Error(message);
                    exception.code = result.code;
                    exception.info = result;
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

    // ------------------------------------------------------------------

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
        return fetch(url, fetch_opts);
    };

    /**
     * Obtain user information from freebase. It will return 'null'
     * if the user has no valid oauth credentials
     */
     freebase.get_user_info = function(options) {
         var [api_opts, fetch_opts] = decant_options(options);
         var url = freebase.service_url + "/api/service/user_info";
         fetch_opts.method = "POST";
         fetch_opts.content = form_encode(api_opts);
         fetch_opts.sign = true;

         function handle_get_user_info_success(res) {
             if ('metaweb-user' in acre.request.cookies) {
                 //acre.response.vary_cookies['metaweb-user'] = 1;
             } else {
                 acre.oauth.has_credentials(); // this sets vary_cookies on the oauth cookies for us
             }
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
             fetch_opts.callback = function(res){
                 callback(handle_get_user_info_success(res));
             };
             fetch_opts.errback = function(e){
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
        return mqlread(query,envelope,options,prepareContent);
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
        var url = freebase.service_url + "/api/service/mqlwrite";
        fetch_opts.method = "POST";
        fetch_opts.content = prepareContent(query,envelope,api_opts);
        if (typeof fetch_opts.sign === 'undefined') fetch_opts.sign = true;
        //acre.response.vary_cookies['mwLastWriteTime'] = 1;
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
            var params = {}
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

        mode = mode || "raw";
        var base_url = freebase.service_url + "/api/trans/";
        switch (mode) {
            case "unsafe":
            case "blurb":
            case "raw":
                base_url += mode;
                break;
            default:
                throw new Error("Invalid mode; must be 'raw' or 'blurb' or 'unsafe'");
        }
        base_url += id;
        // TODO -- this will get the callbacks
        var url = acre.form.build_url(base_url, api_opts);
        fetch_opts.method = "GET";
        fetch_opts.headers = {'X-Requested-With' : '1' },
        fetch_opts.check_results = "raw";
        return fetch(url, fetch_opts);
    };

    /**
     * Get info about a single topic using the Topic API
     */
    freebase.get_topic = function(id,options) {
        if (!id) throw new Error('You must provide the id of the topic you want');
        if (id.indexOf(',') > 0) throw new Error('Use get_topic_multi if you want to retrieve multiple topics');
        if (typeof id != 'string') throw new Error("'get_topic' needs a string as ID, if you need to get multiple topics use 'get_topic_multi' instead.")

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
        if (!(ids instanceof Array)) throw new Error("'get_topic_multi' needs an array of IDs, if you need to get a single topic use 'get_topic' instead.")
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
      if (typeof mode !== 'undefined') {
        qargs.errorid = errorid;
      }

      var qstr = '';
      for (var a in qargs) {
        if (!qargs[a]) continue;
        if (qstr !== '') qstr += '&';
        qstr += a+'='+encodeURIComponent(qargs[a]);
      }

      return freebase.service_url + '/api/trans/image_thumb' + cid + "?" + qstr;
};

}
