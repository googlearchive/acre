var service = acre.require('/freebase/apps/appeditor/lib_appeditor_service');

var e = acre.error;
var msg = e.message + " (" + e.filename + ", line: " + e.line + ")";
var ret = new service.ServiceError("500 Internal Server Error", "/api/status/error", { message: msg, code: '/api/status/error/javascript', info: e});

service.output_response(ret);