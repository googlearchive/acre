var augment;

(function() {

augment = function (obj) {

    // augment the oauth providers with freebase configs
    // and pre-packaged google providers per scope
    var freebase = {
        oauth_version: 2,
        domain: _u.parseUri(_request.googleapis_host).host,
        service_url_prefix: _request.googleapis_freebase,
        keystore_name: "www.googleapis.com",
        access_token_URL: "https://accounts.google.com/o/oauth2/token",
        refresh_token_URL: "https://accounts.google.com/o/oauth2/token",
        user_authorization_URL: "https://accounts.google.com/o/oauth2/auth",
        scope: "https://www.googleapis.com/auth/freebase"
    };

    // standard user login
    providers.freebase = _u.extend({}, freebase, {
        authorization_params: {
            access_type: "online",
            approval_prompt: "auto"
        }
    });

    // writeuser (offline scripts)
    providers.freebase_writeuser = _u.extend({}, freebase, {
        token_storage: "keystore",
        authorization_params: {
            access_type: "offline",
            approval_prompt: "force"
        },
    });


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

    // specify provider name
    for (var p in providers) {
        providers[p].name = p;
    }

    var oauth = {};
    oauth.providers = providers;
    oauth.get_authorization = get_authorization;
    oauth.remove_credentials = remove_credentials;
    oauth.has_credentials = has_credentials;
    oauth.Error = oauthError;

    if (typeof _appengine_oauthservice != "undefined") {
        oauth.get_oauth_user = get_oauth_user;
        oauth.create_host_access_token = create_host_access_token;
        oauth.get_host_identity = get_host_identity;
    }

    // augment the given object (normally the 'acre' object)
    obj.oauth = oauth;
};

// ------------------------- public ------------------------------------------

/**
*   This is the OAuth providers registry that is made available to the
*   Acre apps for convenience.
*   CAREFUL: this object is available to the acre apps!
**/
var providers = {

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

/**
*   This is the list of available google scopes.
*   These get turned into oauth provider objects during augmentation
**/
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


/**
*   Create the exception that we'll throw if oauth returns an error
**/
var oauthError = function (message) {
    this.message = message;
};
oauthError.prototype = new Error();
oauthError.prototype.name = 'acre.oauth.Error';


/**
*   Obtain OAuth access credentials and stores them in the appropriate place based on provider config
*
*   Parameters:
*   - provider: the Oauth service provider object to use to obtain the access credentials.
*   - successURL: the URL to redirect the user once she authorizes us thru the oauth provider [optional]
*   - failureURL: the URL to redirect the user if she denies us authorization [optional]
*   - consumer: the secret information that identifies the consumer (the app using the oauth service
*               on behalf of the user). It must be an object of the form
*
*       {
*           "consumerKey" : key,
*           "consumerSecret" : secret
*       }
*
*   NOTE: this method might perform the oauth authentiation dance
*   thus redirect the user browser to the oauth authentication page.
*   However, if the top level acre request is a POST then it will 
*   error as the arguments would be lost through the redirect process. 
**/
var get_authorization = function(provider, successURL, failureURL, consumer) {
    provider = getProvider(provider);
    consumer = consumer || getConsumer(provider) || {};

    // Need to be on https in order to check oauth2 authorization 
    // as the credentials are set in a secure cookie
    if ((provider.oauth_version === 2) && (acre.request.protocol !== "https")) {
        redirect(null, null, "https");
    }

    // Check whether there's already valid credentials
    // This also registers them for use later when signing
    var access_token = has_credentials(provider, consumer);
    if (access_token) return access_token;

    // state we'll need to carry through the various authorization flows
    var state = acre.form.encode({
        provider: provider.name,
        onsucceed: check_redirect(successURL) || acre.request.url,
        onfail: check_redirect(failureURL) || acre.request.url
    });

    /**
    *   OAuth2
    **/
    if (provider.oauth_version === 2) {
        // We've successfully completed the user portion 
        // of the auth flow, so get a token and store it
        if ("code" in acre.request.params) {
            var token = obtainOauth2AccessToken(provider, consumer, acre.request.params.code);
            if (!token) return null;
            access_token = storeAccessToken(provider, token, consumer);
            register_authorized_provider(provider, consumer, access_token);
            return access_token;
        }

        // We're returning from auth flow and there's a problem
        if ("error" in acre.request.params) {
            handleOauth2AuthorizationError(provider, acre.request.params.error);
            return null;
        }

        // Start from the top
        initiateOauth2AuthorizationFlow(provider, consumer, state);
    }


    /**
    *   OAuth v1
    **/
    else {
        // check if there's an existing request token for this provider
        var request_token = retrieveToken(provider, "request");

        if (!request_token) {
            initiateAuthorizationFlow(provider, consumer, state);
        }

        // get rid of the temporary request cookie so we don't get in any loops
        var request_cookie = getCookieName(provider.name, "request");
        acre.response.clear_cookie(request_cookie, extendCookieOpts());
        delete acre.request.cookies[request_cookie];

        // if we got here, it means that the user performed a valid authentication against the
        // service provider and authorized us, so now we can request more permanent credentials
        // to the service provider and save those for later use.
        access_token = obtainAccessToken(consumer, provider, request_token);
        storeAccessToken(provider, access_token);
    }
};

/**
*   Remove the OAuth credentials from the user cookies.
*
*   Parameters:
*   - serviceName: the Oauth service provider object.
*
**/
var remove_credentials = function(provider) {
    provider = getProvider(provider);
    var access_cookie = getCookieName(provider.name, "access");
    switch (provider.token_storage) {
        case "keystore":
          _keystore.remove(access_cookie);
          break;
        case "cookie":
        default:
          acre.response.clear_cookie(access_cookie, extendCookieOpts(provider.cookie));
          delete acre.request.cookies[access_cookie];
    }
};

/**
*   Check if the user has credentials associated with the given provider
*
*   WARNING: it is possible that the credentials are present but not longer valid.
*   The only way to know for sure is to 'ping' an oauth-enabled URL to react on
*   error messages from that call that relate to authorization.
**/
var has_credentials = function(provider, consumer) {
    provider = getProvider(provider);
    var access_token = retrieveToken(provider);
    if (!access_token) return false;

    var valid = false;
    if (validateAccessToken(access_token)) {
        valid = true;
    } else if (access_token.refresh_token) {
        consumer = consumer || getConsumer(provider);
        access_token = refreshOauth2AccessToken(provider, consumer, access_token);
        storeAccessToken(provider, access_token, consumer);
        valid = true;
    }

    if (!valid) return false;

    register_authorized_provider(provider, consumer || getConsumer(provider), access_token);
    return access_token;
};

/**
*   Get an object that describes the user that is using the current service
*   relayed thru another application.
*
*   WARNING: this method works if the acre app is acting as service provider
*   and if it's running inside AppEngine.
**/
var get_oauth_user = function(scope) {
    return _appengine_oauthservice.getCurrentUser(scope);
}

/**
*   Obtain an access token that can be used to identify this app against
*   external APIs (this is what's normally called 2-legged oauth)
*
*   WARNING: this currently works only against Google APIs
**/
var create_host_access_token = function(scope) {
    if (!scope) throw new oauthError("You must specify an API scope");
    return _appengine_oauthservice.getAccessToken(scope);
}

/**
*   Obtain the identity used to in the "create_host_access_token" to identify this host
**/
var get_host_identity = function() {
    return _appengine_oauthservice.getServiceAccountName();
}


// -------------------------- needed by acreboot -----------------------------------

/**
*   Returns a OAuth signed URL if part of a oauth-orized domain, or the unchanged url otherwise.
**/
OAuth.sign = function(url, method, headers, content, consumer, access_token) {
    var signed = {};

    // get the best-matched stored credentials based on prior get_authorization calls
    var credentials = getCredentials(url, access_token, consumer);
    if (credentials) {
        // oauth2 sign
        if (credentials.oauth_version == 2) {
            signed.headers = headers || {};
            signed.headers["Authorization"] = "Bearer " + credentials.token.access_token;
        }

        // oauth v1 sign
        else {
            signed = sign(credentials.consumer, credentials.token, url, method, headers, content);
        }
    }

    return signed;
};


// ----------------------------------- private --------------------------------------------


// ---------------------------------------------------------------------------------------
/**
*   OAuth v1
**/

/**
*   Obtain the request token/secret pair
**/
function obtainRequestToken(consumer, provider) {
    var signed = sign(consumer, null, provider.request_token_URL, "GET", {}, "", provider.authorization_params);
    var res = _system_urlfetch(signed.url, signed.method, signed.headers, signed.content, false);
    return OAuth.getParameterMap(OAuth.decodeForm(res.body));
}

/**
*   Obtain the access token/secret pair
**/
function obtainAccessToken(consumer, provider, request_token) {
    var signed = sign(consumer, request_token, provider.access_token_URL, "GET", {}, "", provider.authorization_params);
    var res = _system_urlfetch(signed.url, signed.method, signed.headers, signed.content, false);
    return OAuth.getParameterMap(OAuth.decodeForm(res.body));
}

function initiateAuthorizationFlow(provider, consumer, state) {
    var request_token = obtainRequestToken(consumer, provider);

    var authorizeURLQuery = "oauth_token=" + OAuth.percentEncode(request_token.oauth_token) + "&oauth_callback=" + OAuth.percentEncode(state.onsucceed);

    if (typeof state.onfail !== "undefined" && state.onfail != null) {
        authorizeURLQuery += "&ondecline=" + OAuth.percentEncode(state.onfail);
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
        "max_age" : 3600
    };
    set_cookie(request_cookie, OAuth.formEncode(request_token), extendCookieOpts(options));
    redirect(provider.user_authorization_URL + "?" + authorizeURLQuery);
};

/**
*   This method signs he given URL according to OAuth rules and given
*   the consumer and access_token information.
*
*   Parameters:
*   - consumer: the json object that contains the token/secret pair to identify the app
*   - access_token: the json object that contains the token/secret pair to identify the user
*   - url: the URL of the oauth-enabled web service to invoke (this may contain query arguments)
*   - method: the HTTP method that the request will use [optional, defaults to GET]
*   - headers: the request HTTP headers [optional]
*   - content: the POST payload (ignored for other methods) [optional]
**/
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
/**
*   OAuth v2
**/

/**
*   Initiate flow to get an authorization code
**/
var initiateOauth2AuthorizationFlow = function(provider, consumer, state) {
    var params = {
        response_type: "code",
        scope: provider.scope,
        client_id: consumer.consumerKey,
        redirect_uri: provider.redirect_URL,
        state: state
    };
    for (var key in provider.authorization_params) {
        params[key] = provider.authorization_params[key];
    }
    var url = acre.form.build_url(provider.user_authorization_URL, params);
    acre.response.set_header("console", url);
    redirect(url);
};

/**
*   Differentiate authorization flow error types
**/
var handleOauth2AuthorizationError = function(provider, error_type) {
    switch (error_type) {
        case "access_denied":
        acre.oauth.remove_credentials(provider);
        break;
        default:
        throw new oauthError(error_type);
    }
};

/**
*   Get a new access token given an authorization code
**/
var obtainOauth2AccessToken = function(provider, consumer, code) {
    var res = _system_urlfetch(provider.access_token_URL, {
        method: "POST",
        bless: true,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        content: acre.form.encode({
            grant_type: "authorization_code",
            code: code,
            client_id: consumer.consumerKey,
            client_secret: consumer.consumerSecret,
            redirect_uri: provider.redirect_URL
        })
    });
    return JSON.parse(res.body);
};

/**
*   Get a new access token given a refresh token
**/
var refreshOauth2AccessToken = function(provider, consumer, access_token) {
    var res = _system_urlfetch(provider.refresh_token_URL, {
        method: "POST",
        bless: true,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        content: acre.form.encode({
            grant_type: "refresh_token",
            refresh_token: access_token.refresh_token,
            client_id: consumer.consumerKey,
            client_secret: consumer.consumerSecret
        })
    });
    var token = JSON.parse(res.body);
    if (!token.refresh_token) {
        token.refresh_token = access_token.refresh_token;
    }
    return token;
};


// ----------------------------------- helpers --------------------------------------------

/**
*   Cache of credentials shared across the request, 
*   indexed by domain for easy lookup during signing
**/
var AUTHORIZED_HOSTS = {};

function register_authorized_provider(provider, consumer, access_token) {
    provider.consumer = consumer;
    provider.token = access_token;
    AUTHORIZED_HOSTS[provider.domain] = AUTHORIZED_HOSTS[provider.domain] || {};
    AUTHORIZED_HOSTS[provider.domain][provider.name] = provider;
};

/**
*   Get and validate the provider
**/
function getProvider(provider) {
    // default to Freebase
    provider = provider || "freebase";

    if (typeof provider !== "object") {
        var provider_name = provider;
        provider = acre.oauth.providers[provider];
        if (!provider) {
            throw new oauthError("You need to pass the provider as a known provider object or known provider name. " +
                                 "See 'acre.oauth.providers' for a list of known OAuth providers definitions. " +
                                 "You can add your own provider definitions using the 'oauth_providers' key in " +
                                 "the request app's metadata file.");
        }
        provider.name = provider_name;
    }
    if (!provider.name) {
        throw new oauthError("Your OAuth provider is missing the necessary 'name' property");
    }
    if (!provider.access_token_URL) {
        throw new oauthError("The OAuth provider '" + provider.name + "' is missing " + 
                             "the necessary 'access_token_URL' property");
    }
    if (!provider.user_authorization_URL) {
        throw new oauthError("The OAuth provider '" + provider.name + "' is missing " + 
                             "the necessary 'user_authorization_URL' property");
    }
    if (!provider.domain) {
        throw new oauthError("The OAuth provider '" + provider.name + "' is missing " + 
                             "the necessary 'domain' property");
    }
    if (provider.oauth_version == 2) {
        provider.redirect_URL = provider.redirect_URL || "https://" + acre.request.server_name + "/acre/account/redirect";
    } else {
        if (!provider.request_token_URL) {
            throw new oauthError("The OAuth provider '" + provider.name + "' is missing " + 
                                 "the necessary 'request_token_URL' property");
        }
    }
    return provider;
};

/**
*   Store the token in cookie or keystore depending on provider settings
**/
var storeAccessToken = function(provider, token) {
    var access_token = token;

    if (provider.oauth_version == 2) {
        // For oauth2, we only need the token value and when
        // it will expire... and we want to keep more sensitive
        // values like refresh_tokens out of the cookie
        access_token = {
            access_token: token.access_token,
            expires: (new Date().getTime() + (token.expires_in * 1000))
        }
    }

    var token_name = getCookieName(provider.name, "access");
    var token_val = OAuth.formEncode(access_token);

    switch (provider.token_storage) {
        case "keystore":
        // Require the writeuser to be declared in metadata 
        // of the app so people can't make themselves the 
        // writeuser just by signing in as one.
        if (!provider.writeuser) {
            throw new oauthError("Request app must specify the allowed writeuser in metadata.")
        }

        // NOTE: this only works for Freebase providers right now as 
        // they're the  ones we know how to verify the user identity for
        register_authorized_provider(provider, getConsumer(provider), access_token);
        var user = acre.freebase.get_user_info({provider: provider});
        if (!user || (user.username !== provider.writeuser)) {
            delete AUTHORIZED_HOSTS[provider.domain][provider.name];
            throw new oauthError("Supplied credentials don't match the writeuser specified in metadata");
        }

        // write key to keystore using the private acreboot 
        // method so it works in non-trusted mode as well
        _keystore.remove(token_name);
        _keystore.put(token_name, token_val, token.refresh_token);
        break;
        case "cookie":
        default:
        var cookieopts = extendCookieOpts(provider.cookie);
        cookieopts.max_age = cookieopts.max_age || (30 * 24 * 3600);
        cookieopts.httponly = true;
        if (provider.oauth_version == 2) {
            cookieopts.secure = true;
        }
        set_cookie(token_name, token_val, cookieopts);
    }
    return access_token;
};

function retrieveToken(provider, kind) {
    var token = null;

    // check cache
    if (AUTHORIZED_HOSTS[provider.domain]) {
        var credentials = AUTHORIZED_HOSTS[provider.domain][provider.name];
        if (credentials) {
            return credentials.token;
        }
    }

    // otherwise, retrieve using provider token storage method
    var token_name = getCookieName(provider.name, kind || "access");
    switch (provider.token_storage) {
        case "keystore":
        var key = _keystore.get(token_name);
        if (key) {
            token = OAuth.getParameterMap(OAuth.decodeForm(key[0]));
            token.refresh_token = key[1];
        }
        break;
        case "cookie":
        default:
        var variations = [ token_name , '"' + token_name + '"' ];
        for each (var name in variations) {
            if (typeof acre.request.cookies[name] != 'undefined') {
                var value = decodeURIComponent(acre.request.cookies[name]);
                token = OAuth.getParameterMap(OAuth.decodeForm(value));
            }
            break;
        }
    }
    return token;
}

/**
*   Check whether access token has expired
*
*   Consider the token to be expired a full
*   request length before it actually expires
*   to make sure it doesn't die part way through
**/
var validateAccessToken = function(token) {
    if (!token.expires) return true;
    var refresh_before  = parseInt(token.expires, 10) - (30 * 1000);
    return (new Date().getTime() < refresh_before);
};

/**
*   Obtain the token/secret information for the calling app
**/
function getConsumer(provider) {
    var key = null;
    var keyname = provider.keystore_name || provider.domain;
    try {
        key = _keystore.get(keyname);
        if (key) {
            key = {
                consumerKey    : key[0],
                consumerSecret : key[1]
            };
        }
    } catch (e) {
        throw new oauthError("Error while retrieving the application key " + 
                             "for provider '" + provider.name + "': " + e);
    }
    if (!key) {
        throw new oauthError("Could not find the OAuth key " + 
                             "for provider '" + provider.name + "' in the keystore. " + 
                             "Have you added the key to the keystore yet?");
    }
    return key;
}

/**
*   This function returns the oauth credentials associated with the given URL
*   or nothing if the url is not part of an authorized domain.
**/
function getCredentials(url, token, consumer) {
    var credentials = null;
    var storage = null;

    // 'token' can also be a list of provider
    // token_storage kinds to accept
    if (typeof token == "boolean") {
        token = null;
    } else if (typeof token == "string") {
        token = [ token ];
    }
    if (typeof token == "array") {
        storage = {};
        token.forEach(function(kind) {
            storage[kind] = true;
        });
        token = null;
    }

    var parsed_url = _u.parseUri(url);
    var host = parsed_url.host;
    var path = parsed_url.path;
    var domain_fragments = host.split('.');
    var domain = domain_fragments.slice(domain_fragments.length - 2).join('.');

    for (var j = 0; j < domain_fragments.length - 1; j++) {
        // start by matching the deepest subdomain until we find one that is authorized
        var subdomain = domain_fragments.slice(j,domain_fragments.length).join('.');
        if (subdomain in AUTHORIZED_HOSTS) {
            var authorized_providers = AUTHORIZED_HOSTS[subdomain];
            // continue matching on paths
            var max = 0;
            var path_frags = path.split("/");
            for (var p in authorized_providers) {
                var provider = authorized_providers[p];
                if (storage && !storage[provider.token_storage]) continue;
                var provider_path = provider.service_url_prefix || "/";
                provider_path_frags = provider_path.split("/");
                for (var i = 0; i < path_frags.length; i++) {
                    if ((i < provider_path_frags.length) && (provider_path_frags[i] == path_frags[i])) {
                        // continue
                    } else {
                        if (i > max) {
                            max = i;
                            credentials = provider;
                        }
                        break;
                    }
                }
            }
            break;
        }
    }

    if (!credentials) {
        throw new oauthError("Could not find OAuth credentials to sign a " + 
                             "request to '" + url + "'. Have you invoked " + 
                             "'acre.oauth.get_authorization' with the right provider?");
    }

    if (consumer) {
        credentials.consumer = consumer;
    }
    if (token) {
        credentials.token = token;
    }
    return credentials;
}

/**
*   Obtain the full name of the cookie
**/
function getCookieName(provider_name, type) {
    return OAuth.percentEncode(provider_name + "_" + type);
}

/**
*   Some cookies can get quoted between ""
**/
function cleanCookieName(name) {
    if (name[0] == '"' && name[name.length-1] == '"') {
        return name.substring(1,name.length-1);
    } else {
        return name;
    }
}

/**
*   Custom set cookie method because
*   acre.response.set_cookie() doesn't support HttpOnly
**/
function extendCookieOpts(options) {
    // defaults
    var cookie_options = {
        "path" : "/"
    };

    var options = options || {};
    var opts = {};
    for (var key in cookie_options) {
        opts[key] = cookie_options[key];
    }
    if (options.path) {
        opts.path = options.path;
    }
    if (options.domain) {
        opts.domain = options.domain
    }
    if (options.max_age) {
        opts.max_age = options.max_age;
    }
    return opts;
};

/**
*   Custom set cookie method because
*   acre.response.set_cookie() doesn't support HttpOnly
**/
var set_cookie = function(name, value, options) {
    var headerval = name + "=" + value;
    if (options.expires) {
        headerval += "; Expires=" + options.domain;
    }
    if (options.max_age) {
        headerval += "; Max-Age=" + options.max_age;
    }
    if (options.domain) {
        headerval += "; Domain=" + options.domain;
    }
    if (options.path) {
        headerval += "; Path=" + options.path;
    }
    if (options.secure) {
        headerval += "; Secure";
    }
    if (options.httponly) {
        headerval += "; HttpOnly";
    }
    acre.response.headers["Set-Cookie"] = headerval;
    acre.request.cookies[name] = value;
};

var check_redirect = function(url) {
    // Don't let account redirect to other sites
    var host_domain = acre.request.server_name.split(".").slice(-2).join(".");
    var rd_domain = _u.parseUri(url).host.split(".").slice(-2).join(".");
    if (host_domain !== rd_domain) {
        console.error("Redirect URL is not on the same domain.");
        return false;
    }
    return url;
};

/**
*   We often need to redirect as part of authorization flows
**/
var redirect = function(url, code, protocol) {
    url = url || acre.request.url
    code = code || 302;

    if (acre.request.method == "POST") {
        throw new oauthError("Could not complete authorization because it" +
                             "required a redirect during a 'POST' request");
    }

    if (protocol) {
        url = url.replace(/^[^:]*/, protocol);
    }

    acre.response.status = code;
    acre.response.set_header('Location', url);
    acre.exit();
};

})();
