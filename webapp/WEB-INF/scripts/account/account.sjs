var usage = [
  'Usage:',
  '/acre/account/signin',
  '/acre/account/signin?onsucceed=/next_file',
  '/acre/account/inline_signin',
  '/acre/account/user_info',
  '/acre/account/signout',
  '',
  '(onsucceed defaults to "/")'
].join('\n');

var params = acre.request.params;

// when coming back from oauth2 signin flow,
// the params are encoded in a state token
if (params.state) {
    params = acre.form.decode(params.state);
}

// allow requesting signin to a graph other than the current one
if (params.service_url) {
    acre.freebase.set_service_url(params.service_url);
}

var provider = acre.oauth.providers[params.provider || "freebase"];
if (!provider) {
    throw "Unregistered provider '" + params.provider + "'";
}

switch (acre.request.path_info) {

    case '/signin' :
        params.onsucceed = get_redirect_url(params.onsucceed, true, true);
        params.onfail = get_redirect_url(params.onfail, true, true);
        // fake out oauth1 providers to use same redirect URL-based flow as oauth2
        if (provider.oauth_version !== 2) {
          var redirect_url = acre.request.url.replace(/\/signin(\?.*)?$/,"/redirect");
          params.onsucceed = acre.form.build_url(redirect_url, {
            onsucceed: params.onsucceed,
            onfail: params.onfail
          });
        }
        var success = acre.oauth.get_authorization(provider, params.onsucceed, params.onfail);
        redirect(success);
        break;

    case '/inline_signin' :
        acre.oauth.get_authorization(provider);
        acre.response.status = 200;
        acre.response.set_header("content-type","text/html");
        acre.write('<html><body></body><script type="text/javascript">' +
        'if (top.opener && top.opener.onauthorization) {' +
        '   top.opener.onauthorization(window);' +
        '}' +
        'self.close();' +
        '</script></html>');
        break;

    case '/redirect':
        params.onsucceed = get_redirect_url(params.onsucceed, false, true);
        params.onfail = get_redirect_url(params.onfail, false, true);
        var success = acre.oauth.get_authorization(provider);
        redirect(success);
        break;

    case '/signout':
        params.onsucceed = get_redirect_url(params.onsucceed, true, false);
        params.onfail = get_redirect_url(params.onfail, true, false);
        acre.oauth.remove_credentials(provider);
        redirect(true);
        break;

    case '/user_info':
        var user_info = acre.freebase.get_user_info({provider:provider.name});
        acre.response.status = 200;
        acre.response.set_header("content-type","application/json");
        acre.write(JSON.stringify(user_info,null,2));
        break;

    default: 
        acre.write('ERROR:\n\n' + usage); 
        break;

}


function get_redirect_url(url, use_referer, secure) {
    if (use_referer) {
        url = url || acre.request.headers.referer;
    }
    url = url || acre.request.app_url;
    url = url.replace(/^https?:/, (secure ? "https:" : "http:"));
    return url;
};

function redirect(success) {
    if (typeof success == 'undefined') success = true;
    var url = success ? params.onsucceed : params.onfail;
    acre.response.status = 303;
    acre.response.set_header('Location', url);
}
