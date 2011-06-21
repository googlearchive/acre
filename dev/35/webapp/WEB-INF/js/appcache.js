
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.cache = {
           "get" : get,
           "put" : put,
           "remove" : remove
        };

    };
        
    function get(k) {
        if (typeof k == "undefined") throw Error("Can't retrieve with an undefined key");
        return JSON.parse(cache.get(key(k)));
    }
    
    function put(k,obj,expires) {
        if (typeof k == "undefined") throw Error("Can't save with an undefined key");
        if (typeof obj == "undefined") throw Error("Can't save an undefined object in cache");
        if (typeof expires != "undefined" && typeof expires != "number") throw Error("Expiration must be a number");
        cache.put(key(k),JSON.stringify(obj),expires);
    }

    function remove(k) {
        if (typeof k == "undefined") throw Error("Can't delete with an undefined key");
        cache.remove(key(k));
    }
    
    // -----------------------------------------------------
    
    function key(k) {
        var appid = request.app_project;
        if (!appid) throw Error("appid can't be null or undefined");
        return appid + ":" + k;
    }
    
})();

