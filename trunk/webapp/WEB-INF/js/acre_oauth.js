
var augment;

(function() {

    augment = function (obj) {

        // augment the oauth providers with pre-packaged special google provider,
        // one per authorization scope
        var google = providers.google;

        for (var scope in google_scopes) {
            providers["google_" + scope] = {
                domain                 : google.domain,
                service_url_prefix     : google_scopes[scope],
                request_token_URL      : google.request_token_URL,
                access_token_URL       : google.access_token_URL,
                user_authorization_URL : google.user_authorization_URL,
                authorization_params   : { scope : google_scopes[scope] }
            };
        }

        var oauth = {};
        oauth.providers = providers;
        oauth.get_authorization = get_authorization;
        oauth.remove_credentials = remove_credentials;
        oauth.has_credentials = has_credentials;
        
        if (typeof _appengine_oauthservice != "undefined") {
            oauth.get_oauth_user = get_oauth_user;
            oauth.create_host_access_token = create_host_access_token;
            oauth.get_host_identity = get_host_identity;
        }

        // augment the given object (normally the 'acre' object)
        obj.oauth = oauth;
    };

    // ------------------------- public ------------------------------------------

    var freebase_service = _u.parseUri(acre.freebase.service_url).host;
    var freebase_site = _u.parseUri(acre.freebase.site_host).host;
    var freebase_service_frags = freebase_service.split('.');
    var freebase_domain = freebase_service_frags.slice(freebase_service_frags.length - 2, freebase_service_frags.length).join('.');

    /*
     * This is the OAuth providers registry that is made available to the
     * Acre apps for convenience.
     * CAREFUL: this object is available to the acre apps!
     */
    var providers = {

        // ---------------------------- freebase ---------------------------------

        // https://wiki.metaweb.com/index.php/OAuth_on_Freebase

        // used when oauth is used for cross-domain sign-in
        "freebase" : {
            domain                 : freebase_domain,
            request_token_URL      : "https://" + freebase_service + "/api/oauth/request_token",
            access_token_URL       : "https://" + freebase_service + "/api/oauth/access_token",
            user_authorization_URL : "https://" + freebase_site + "/signin/app"
        },

        // used when oauth is used for delegated authorization
        "freebase_provider" : {
            domain                 : freebase_domain,
            request_token_URL      : "https://" + freebase_service + "/api/oauth/request_token",
            access_token_URL       : "https://" + freebase_service + "/api/oauth/access_token",
            user_authorization_URL : "https://" + freebase_site + "/signin/authorize_token"
        },

        // ---------------------------- google ---------------------------------

        // http://code.google.com/intl/it/apis/accounts/docs/OAuth.html
        "google" : {
            domain                 : "google.com",
            request_token_URL      : "https://www.google.com/accounts/OAuthGetRequestToken",
            access_token_URL       : "https://www.google.com/accounts/OAuthGetAccessToken",
            user_authorization_URL : "https://www.google.com/accounts/OAuthAuthorizeToken",
            authorization_params   : { scope : "" }
        },

        // ---------------------------- yahoo ----------------------------------

        // http://developer.yahoo.com/oauth/
        "yahoo" : {
            domain                 : "yahoo.com",
            request_token_URL      : "https://api.login.yahoo.com/oauth/v2/get_request_token",
            access_token_URL       : "https://api.login.yahoo.com/oauth/v2/get_token",
            user_authorization_URL : "https://api.login.yahoo.com/oauth/v2/request_auth"
        },

        // http://fireeagle.yahoo.net/developer
        "yahoo_fireeagle" : {
            domain                 : "fireeagle.yahooapis.com",
            request_token_URL      : "https://fireeagle.yahooapis.com/oauth/request_token",
            access_token_URL       : "https://fireeagle.yahooapis.com/oauth/access_token",
            user_authorization_URL : "https://fireeagle.yahoo.net/oauth/authorize"
        },

        // currently undocumented
        "flickr" : {
            domain                 : "flickr.com",
            request_token_URL      : "http://api.flickr.com/services/rest/?method=flickr.auth.oauth.getRequestToken",
            access_token_URL       : "http://api.flickr.com/services/rest/?method=flickr.auth.oauth.getAccessToken",
            user_authorization_URL : "http://flickr.com/services/auth/oauth"
        },

        // --------------------------- netflix ----------------------------------

        // http://developer.netflix.com/docs/Security
        "netflix" : {
            domain                 : "netflix.com",
            request_token_URL      : "http://api.netflix.com/oauth/request_token",
            access_token_URL       : "http://api.netflix.com/oauth/access_token",
            user_authorization_URL : "https://api-user.netflix.com/oauth/login",
            signin_params          : {
                "application_name" : "",
                "oauth_consumer_key" : ""
            }
        },

        // --------------------------- myspace -----------------------------------

        // http://developer.myspace.com/Modules/Apps/Pages/ApplyDevSandbox.aspx
        "myspace" : {
            domain                 : "myspace.com",
            request_token_URL      : "http://api.myspace.com/request_token",
            access_token_URL       : "http://api.myspace.com/access_token",
            user_authorization_URL : "http://api.myspace.com/authorize"
        },

        // --------------------------- twitter -----------------------------------

        // http://twitter.com/oauth_clients
        "twitter" : {
            domain                 : "twitter.com",
            request_token_URL      : "https://twitter.com/oauth/request_token",
            access_token_URL       : "https://twitter.com/oauth/access_token",
            user_authorization_URL : "https://twitter.com/oauth/authorize"
        }

    };

    /*
     * This is the list of available google scopes.
     * These get turned into oauth provider objects during augmentation
     */
    var google_scopes = {
        base         : "http://www.google.com/base/feeds/",
        books        : "http://www.google.com/books/feeds/",
        blogger      : "http://www.blogger.com/feeds/",
        calendar     : "http://www.google.com/calendar/feeds/",
        contacts     : "http://www.google.com/m8/feeds/",
        docs         : "http://docs.google.com/feeds/",
        finance      : "http://finance.google.com/finance/feeds/",
        gmail        : "https://mail.google.com/mail/feed/atom",
        health       : "https://www.google.com/h9/feeds/",
        picasa       : "http://picasaweb.google.com/data/",
        spreadsheets : "http://spreadsheets.google.com/feeds/",
        youtube      : "http://gdata.youtube.com"
    };

    var cookie_options = {
        "path" : "/"
    };

    /*
     * Obtain OAuth access credentials and stores them in the user cookies.
     *
     * Parameters:
     *
     *  - provider: the Oauth service provider object to use to obtain the access credentials.
     *  - successURL: the URL to redirect the user once she authorizes us thru the oauth provider [optional]
     *  - failureURL: the URL to redirect the user if she denies us authorization [optional]
     *  - consumer: the secret information that identifies the consumer (the app using the oauth service
     *              on behalf of the user). It must be an object of the form
     *
     *                {
     *                   "consumerKey" : key,
     *                   "consumerSecret" : secret
     *                }
     *
     * NOTE: this method might perform the oauth authentiation dance
     * thus redirect the user browser to the oauth authentication page.
     */
    var get_authorization = function(provider, successURL, failureURL, consumer) {

        // if provider is not set, default to Freebase as the OAuth provider

        if (!provider) provider = acre.oauth.providers.freebase;

        // check to see if the oauth provider object has everything we need

        if (provider === null || typeof provider != "object") {
            throw new Error("You need to pass the provider as an object. See 'acre.oauth.providers' for a list of known OAuth providers definitions.");
        }
        if (provider.request_token_URL === null || typeof provider.request_token_URL == "undefined") {
            throw new Error("Your OAuth provider object is missing the necessary 'request_token_URL' property");
        }
        if (provider.access_token_URL === null || typeof provider.access_token_URL == "undefined") {
            throw new Error("Your OAuth provider object is missing the necessary 'access_token_URL' property");
        }
        if (provider.user_authorization_URL === null || typeof provider.user_authorization_URL == "undefined") {
            throw new Error("Your OAuth provider object is missing the necessary 'user_authorization_URL' property");
        }
        if (provider.domain === null || typeof provider.domain == "undefined") {
            throw new Error("Your OAuth provider object is missing the necessary 'domain' property");
        }

        // retrieve the access token from the user cookies

        var access_cookie = getCookieName(provider,"access");
        var access_token = retrieveToken(access_cookie, provider);

        if (!access_token) {

            // if the application identification information wasn't provided,
            // obtain it from the provider domain
            if (typeof consumer == "undefined") {
                consumer = getConsumer(provider.domain);
            }

            // get the request token from the provider
            var request_cookie = getCookieName(provider,"request");
            var request_token = retrieveToken(request_cookie, provider);

            // get the URL that the oauth provider will use to redirect the user after the
            // authorization stage, if no successfulURL is provided, we return back to
            // the URL that is currently executing us
            var callbackURL = (typeof successURL !== "undefined" && successURL != null) ? successURL : getCurrentURL();

            if (!request_token) {

                // if we don't have any tokens, let's start the OAuth dance by requesting a token
                request_token = obtainRequestToken(consumer,provider);

                var authorizeURLQuery = "oauth_token=" + OAuth.percentEncode(request_token.oauth_token) + "&oauth_callback=" + OAuth.percentEncode(callbackURL);

                if (typeof failureURL !== "undefined" && failureURL != null) {
                    authorizeURLQuery += "&ondecline=" + OAuth.percentEncode(failureURL);
                }

                // if the provider is ME, add a hook to avoid redirecting with oauth_* parameters in the URL
                if (provider.domain.indexOf('freebase') != -1 || provider.domain.indexOf('metaweb') != -1) {
                    authorizeURLQuery += "&clean_redirect=true";
                }
                
                if (provider.signin_params) {
                    for (var prop in provider.signin_params) {
                        if (provider.signin_params.hasOwnProperty(prop)) {
                            authorizeURLQuery += "&" + OAuth.percentEncode(prop) + "=" + OAuth.percentEncode(provider.signin_params[prop]);
                        }
                    }
                }

                // now redirect the user to the Authorize URL where she can authenticate against the
                // service provider and authorize us. And, in doing so, persist the state as a cookie.
                // By providing the 'oauth_callback', the provider will redirect the user back here for us to continue.

                var options = {
                    "path" : cookie_options.path,
                    "max_age" : 3600
                };
                acre.response.set_cookie(request_cookie, OAuth.formEncode(request_token), options);

                acre.response.set_header('Location', provider.user_authorization_URL + "?" + authorizeURLQuery);
                acre.response.status = 302;

                acre.exit(); // dance will resume next time we get called

            } else {

                // if we got here, it means that the user performed a valid authentication against the
                // service provider and authorized us, so now we can request more permanent credentials
                // to the service provider and save those as well for later use.

                try {
                    access_token = obtainAccessToken(consumer,provider,request_token);
                } catch (e if (typeof e.response != "undefined") && (e.response.status == 400 || e.response.status == 401)) {

                    // in some circumstances, a request token is present in the user cookies
                    // but it's not valid to obtain an access token (for example, if the user first
                    // denied access and then changed her mind and wanted to do the oauth dance again).
                    // So we need to catch exceptions raised while obtaining the access token
                    // and reset the dance by removing the request token from the cookies

                    acre.response.availability = false;
                    acre.response.clear_cookie(request_cookie, cookie_options);

                    acre.response.set_header('Location', callbackURL);
                    acre.response.status = 302;

                    acre.exit(); // dance will restart from the beginning next time we get called
                }


                // if we get here, we have the access token, so we set it in the user cookies and return

                var options = {
                   "path" : cookie_options.path,
                   "max_age" : 30 * 24 * 3600
                };

                var cookieval = OAuth.formEncode(access_token);

                // set the cookie for the remainder of this request, as well as on the response
                acre.request.cookies[access_cookie] = cookieval;
                acre.environ.cookies[access_cookie] = { name: access_cookie, value: cookieval }; // deprecated

                acre.response.set_cookie(access_cookie, cookieval, options);
                acre.response.clear_cookie(request_cookie, cookie_options);
            }
        }

    };

    /*
     * Remove the OAuth credentials from the user cookies.
     *
     * Parameters:
     *
     *  - serviceName: the Oauth service provider object.
     *
     */
    var remove_credentials = function(provider) {

        // if provider is not set, default to Freebase as the OAuth provider
        if (!provider) provider = acre.oauth.providers.freebase;

        var access_cookie = getCookieName(provider,"access");
        acre.response.clear_cookie(access_cookie, cookie_options);

    };

    /*
     * Check if the user has credentials associated with the given provider
     *
     * WARNING: it is possible that the credentials are present but not longer valid.
     * The only way to know for sure is to 'ping' an oauth-enabled URL to react on
     * error messages from that call that relate to authorization.
     */
    var has_credentials = function(provider) {

        // if provider is not set, default to Freebase as the OAuth provider
        if (!provider) provider = acre.oauth.providers.freebase;

        var access_cookie = getCookieName(provider,"access");
        var access_token = retrieveToken(access_cookie, provider);

        // XXX probably need a vary here, but it can't be done directly
        //acre.response.vary_cookies[access_cookie] = 1;

        return (typeof access_token !== "undefined");
    };

    /*
     * Get an object that describes the user that is using the current service
     * relayed thru another application.
     *
     * WARNING: this method works if the acre app is acting as service provider
     * and if it's running inside AppEngine.
     */
    var get_oauth_user = function(scope) {
        return _appengine_oauthservice.getCurrentUser(scope);
    }

    /*
     * Obtain an access token that can be used to identify this app against
     * external APIs (this is what's normally called 2-legged oauth)
     *
     * WARNING: this currently works only against Google APIs
     */
    var create_host_access_token = function(scope) {
        if (!scope) throw "You must specify an API scope";
        return _appengine_oauthservice.getAccessToken(scope);
    }

    /*
     * Obtain the identity used to in the "create_host_access_token" to identify this host
     */
    var get_host_identity = function() {
        return _appengine_oauthservice.getServiceAccountName();
    }

    // -------------------------- needed by acreboot -----------------------------------

    /*
     * Returns a OAuth signed URL if part of a oauth-orized domain, or the unchanged url otherwise.
     */
    OAuth.sign = function(url, method, headers, content, consumer, access_token) {
        var credentials = getCredentials(url);
        if (credentials) {
            if (typeof consumer == "undefined" || consumer == null || consumer === true) {
                consumer = credentials.consumer;
            }
            if (typeof access_token == "undefined" || access_token == null) {
                access_token = credentials.access_token;
            }
        }
        var signed = sign(consumer, access_token, url, method, headers, content);
        
        var request = {};
        if (signed.url) request.url = signed.url;
        if (signed.headers) request.headers = signed.headers;
        if (signed.content) request.content = signed.content;
        return request;
    };

    // ----------------------------------- private --------------------------------------------

    /*
     * Return the fully referenced URL of the currently executing script
     */
    function getCurrentURL() {
        return acre.request.url;
    }

    /*
     * This function returns the oauth credentials associated with the given URL
     * or nothing if the url is not part of an authorized domain.
     */
    function getCredentials(url) {
        var parsed_url = _u.parseUri(url);
        var host = parsed_url.host;
        var path = parsed_url.path;
        var domain_fragments = host.split('.');
        var domain = domain_fragments.slice(domain_fragments.length - 2).join('.');

        var authorized_hosts = {};

        // obtain all access tokens from the cookies that match the url domain
        // and create a lookup table of scopes based on the host part of their cookie identifier
        for (encoded_cookie in acre.request.cookies) {
            var cookie = cleanCookieName(OAuth.decodePercent(encoded_cookie));
            if (cookie.match(domain + "(/.*)?_access$")) {
                var cookie_scope = cookie.split("_access")[0];
                var cookie_host = (cookie_scope.match("^https?://")) ? parseUri(cookie_scope).host : cookie_scope;
                if (cookie_host in authorized_hosts) {
                    authorized_hosts[cookie_host].push(cookie_scope);
                } else {
                    authorized_hosts[cookie_host] = [ cookie_scope ];
                }
            }
        }

        var best_matching_scope = best_matching_domain = null;

        for (var j = 0; j < domain_fragments.length - 1; j++) {
            // start by matching the deepest subdomain until we find one that is authorized
            var subdomain = domain_fragments.slice(j,domain_fragments.length).join('.');
            if (subdomain in authorized_hosts) {
                var authorized_scopes = authorized_hosts[subdomain];
                if (authorized_scopes.length === 1) {
                    // if there is only one scope that matches the domain
                    // that is our best match
                    best_matching_scope = authorized_scopes[0];
                    best_matching_domain = best_matching_scope.match("^https?://") ? parseUri(best_matching_scope).host : best_matching_scope;
                } else {
                    // if there are more than one scope that matches
                    // the subdomain, continue matching on their paths
                    var max = 0;
                    var path_frags = path.split("/");
                    authorized_scopes.forEach(function(scope) {
                        var parsed_scope = parseUri(scope);
                        scope_path_frags = parsed_scope.path.split("/");
                        for (var i = 0; i < scope_path_frags.length; i++) {
                            if (i < path_frags.length && scope_path_frags[i] == path_frags[i]) {
                                // continue
                            } else {
                                if (i > max) {
                                    max = i;
                                    best_matching_scope = scope;
                                    best_matching_domain = parsed_scope.host;
                                }
                                break;
                            }
                        }
                    });
                }
                break;
            }
        }

        if (best_matching_scope && best_matching_domain) {
            return {
                consumer: getConsumer(best_matching_domain),
                access_token: retrieveToken(getCookieName(best_matching_scope,"access"),best_matching_scope)
            };
        } else {
            throw new Error("Could not find OAuth credentials to sign a request to '" + url + "'. Have you invoked 'acre.oauth.get_authorization' with the right provider?");
        }
    }

    // ---------------------------------------------------------------------------------------

    /*
     * Obtain the token/secret information for the calling app
     */
    function getConsumer(domain) {
        domain = remap(domain);

        var key = null;

        try {
            var domain_fragments = domain.split('.');
            for (var i = 0; i < domain_fragments.length - 1; i++) {
                // start by looking for the deepest subdomain until we find one that is authorized
                var subdomain = domain_fragments.slice(i).join('.');

                key = acre.keystore.get(subdomain);

                if (key) {
                    key = {
                        consumerKey    : key[0],
                        consumerSecret : key[1]
                    };
                    break;
                }
            }

        } catch (e) {
            throw new Error("Error while retrieving the application key for domain '" + subdomain + "': " + e);
        }

        if (!key) {
            throw new Error("Could not find the OAuth key for domain '" + domain + "' in the keystore. Have you added the key to the keystore yet? Have you used '" + domain + "' as the domain?");
        }

        return key;
    }

    /*
     * In order to simplify statement management during sandbox and qa refreshes
     * remap the credentials domains to the master one so that the keys in the
     * prod keystore can be used AS-IS for these other domains as well.
     */
    function remap(domain) {
        if (domain == "sandbox-freebase.com" || domain == "metaweb.com") {
            return "freebase.com";
        } else {
            return domain;
        }
    }

    // ---------------------------------------------------------------------------------------

    /*
     * This method signs he given URL according to OAuth rules and given
     * the consumer and access_token information.
     *
     * Parameters:
     *
     *  - consumer: the json object that contains the token/secret pair to identify the app
     *  - access_token: the json object that contains the token/secret pair to identify the user
     *  - url: the URL of the oauth-enabled web service to invoke (this may contain query arguments)
     *  - method: the HTTP method that the request will use [optional, defaults to GET]
     *  - headers: the request HTTP headers [optional]
     *  - content: the POST payload (ignored for other methods) [optional]
     */
    function sign(consumer, access_token, url, method, headers, content, authorization_params) {

        var uri = OAuth.SignatureMethod.parseUri(url);

        var form_urlencoded = (method &&
                               method.toLowerCase &&
                               method.toLowerCase() == "post" &&
                               headers &&
                               headers['content-type'] &&
                               headers['content-type'].toLowerCase() == "application/x-www-form-urlencoded");

        var accessor = consumer;
        if (access_token) {
            accessor.token = access_token.oauth_token;
            accessor.tokenSecret = access_token.oauth_token_secret;
        }

        var parameters = OAuth.decodeForm(uri.query);
        if (form_urlencoded) parameters = parameters.concat(OAuth.decodeForm(content));
        if (authorization_params) parameters = parameters.concat(OAuth.getParameterList(authorization_params));

        var port = ((uri.protocol == "http" && uri.port != "" && uri.port != "80") ||
                    (uri.protocol == "https" && uri.port != "" && uri.port != "443")) ? ":" + uri.port : "";

        var message = {
            method: method,
            action: uri.protocol + "://" + uri.host + port + uri.path,
            parameters: parameters
        };

        OAuth.completeRequest(message, accessor);

        if (!headers) headers = {};

        headers['Authorization'] = OAuth.getAuthorizationHeader(uri.host, message.parameters);

        if (authorization_params) {
            url += ((!uri.query) ? "?" : "&" ) + OAuth.formEncode(authorization_params);
        }

        return {
            url : url,
            headers : headers,
            content : content
        };
    }

    // ---------------------------------------------------------------------------------------

    /*
     * Obtain the request token/secret pair
     */
    function obtainRequestToken(consumer, provider) {
        var signed = sign(consumer, null, provider.request_token_URL, "GET", {}, "", provider.authorization_params);
        var res = _system_urlfetch(signed.url, signed.method, signed.headers, signed.content, false);
        return OAuth.getParameterMap(OAuth.decodeForm(res.body));
    }

    /*
     * Obtain the access token/secret pair
     */
    function obtainAccessToken(consumer, provider, request_token) {
        var signed = sign(consumer, request_token, provider.access_token_URL, "GET", {}, "", provider.authorization_params);
        var res = _system_urlfetch(signed.url, signed.method, signed.headers, signed.content, false);
        return OAuth.getParameterMap(OAuth.decodeForm(res.body));
    }

    // ---------------------------------------------------------------------------------------

    /*
     * Some cookies can get quoted between ""
     */
    function cleanCookieName(name) {
        if (name[0] == '"' && name[name.length-1] == '"') {
            return name.substring(1,name.length-1);
        } else {
            return name;
        }
    }

    /*
     * Retrieve token/secret pair with the given name and type from the cookies
     * NOTE: sometimes cookie names get surrounded by "" quotes for escaping
     * so we need to make sure we catch either case
     */
    function retrieveToken(cookie_name, provider) {
        var variations = [ cookie_name , '"' + cookie_name + '"' ];
        for (var i = 0; i < variations.length; i++) {
            var name = variations[i];
            if (typeof acre.request.cookies[name] != 'undefined') {
                var token = OAuth.getParameterMap(OAuth.decodeForm(acre.request.cookies[name]));
                token.name = getName(provider);
                return token;
            }
        }
    }

    /*
     * Obtain the full name of the cookie
     */
    function getCookieName(provider, type) {
        var name = (typeof provider == "string") ? provider : getName(provider);
        return OAuth.percentEncode(name + "_" + type);
    }

    /*
     * Get name from the provider
     */
    function getName(provider) {
        return (provider.service_url_prefix) ?  provider.service_url_prefix : provider.domain;
    }

})();
