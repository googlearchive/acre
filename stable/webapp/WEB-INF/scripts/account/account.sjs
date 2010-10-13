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

function redirect() {
  acre.response.status = 303;
  acre.response.set_header('Location', acre.request.params.onsucceed || '/' );
}

// allow requesting signin to a graph other than the current one
if (acre.request.params.service_url) {
    acre.freebase.set_service_url(acre.request.params.service_url);
}

switch (acre.request.path_info) {

  case '/signin' :
    acre.freebase.get_user_info();
    acre.oauth.get_authorization();  
    redirect(); 
    break;

  case '/inline_signin' :
    acre.oauth.get_authorization();
    acre.response.status = 200;
    acre.response.set_header("content-type","text/html");
    acre.write('<html><body></body><script type="text/javascript">' +
        'if (top.opener && top.opener.onauthorization) {' +
        '   top.opener.onauthorization(window);' +
        '}' +
        'self.close();' +
    '</script></html>');
    break;

  case '/signout': 
    acre.oauth.remove_credentials(); 
    redirect(); 
    break;

  case '/user_info':
    var user_info = acre.freebase.get_user_info();
    acre.response.status = 200;
    acre.response.set_header("content-type","application/json");
    acre.write(JSON.stringify(user_info,null,2));
    break;
    
  default: 
    acre.write('ERROR:\n\n' + usage); 
    break;
    
}
