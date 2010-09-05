var service = acre.require('/freebase/apps/appeditor/lib_appeditor_service');

function run_require(path, match) {
    var req = acre.require(path);
    var result_matches = [];
    /*
     * match can come in two forms:
     *   1- an object, where the results are compared
     *      FIXME: for now this only works for primative values
     *             that can be ==='d
     *   2- an array where only in presense is necessary
     */
    if (match instanceof Array) {
        for (var a in match) {
            if (match[a] in req) {
                result_matches.push(match[a]);
            }
        }
    } else if (match instanceof Object) {
        for (var a in match) {
            if (a in req && req[a] === match[a]) {
                result_matches.push(match[a]);
            }
        }
    }
    return {'matches':result_matches, 'path':path};
}

if (acre.current_script == acre.request.script) {
    service.GetService(function() {
        var args = service.parse_request_args(['path']);

        return run_require(args.path, JSON.parse(args.match || '[]'));
    }, this);
}
