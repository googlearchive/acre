var app_guid = acre.request.body_params.app_guid || null;
var metaweb_user = acre.request.body_params.metaweb_user || null;

function me_response(response, messages) {
    messages = messages || [];
    return {'status':"200 OK", 'code':"/api/status/ok", 'messages':messages, 'result':response};
}

function me_error(status, messages) {
    return {'status':status, 'code':'/api/status/error', 'messages':messages};
}

if (app_guid === null) {
    acre.response.status = 400;
    acre.write(JSON.stringify(me_error("400 Bad Request", [{'message':'No app GUID provided', 'code':'/api/status/error/input/invalid'}])));
    acre.exit();
}

if (metaweb_user === null) {
    acre.response.status = 400;
    acre.write(JSON.stringify(me_error("400 Bad Request", [{'message':'No user credentials found.', 'code':'/api/status/error/input/invalid'}])));
    acre.exit();
}

// Note, we touch here, because we want to make sure that the user has not
// been removed as an admin from the app recently
acre.freebase.touch();

var user_info_url = acre.freebase.service_url + "/api/service/user_info";

var headers = {};
headers['Content-Type'] = "application/x-www-form-urlencoded";
headers['X-Metaweb-Request'] = "1";
headers['Cookie'] = "metaweb-user=" + metaweb_user;
var user_info = JSON.parse(acre.urlfetch(user_info_url, "POST", headers, "", false).body);

if (user_info.status != "200 OK") {
    acre.response.status = 401;
    acre.write(JSON.stringify(me_error("401 Unauthorized", [{'message':'Failure to authenticate'}])));
    acre.exit();
}

function user_check_query(user_id, app_guid) {
  var q = {
    "/type/domain/owners" : {
      "member":{
        "id":user_id
      }
    },
    "guid":'#'+app_guid
  };

  var res = acre.freebase.mqlread(q).result;

  if (res !== null) {
    return true;
  } else {
    return false;
  }
}

if (user_check_query(user_info.id, app_guid)) {
  acre.response.status = 200;
  acre.write(JSON.stringify(me_response(true)));
} else {
  acre.response.status = 401;
  acre.write(JSON.stringify(me_error("401 Unauthorized", [{'message':'User not in admin group'}])));
}
