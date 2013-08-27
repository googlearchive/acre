var path = acre.request.path_info;
if (path != "/") {
    acre.require("/" + path);
} else {
    acre.write("you have to pass what to call (as an acre.require path) as path_info");
}
