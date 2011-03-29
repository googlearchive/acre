var what = acre.request.path_info;
if (what != "/") {
    acre.require(what);
} else {
    acre.write("you have to pass what to call (as an acre.require path) as path_info");
}
