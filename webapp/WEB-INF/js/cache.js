
var augment;

(function() {

    var namespace = "apps";
    
    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.cache = {
           "get" : get,
           "put" : put,
           "increment" : increment,
           "remove" : remove
        };

        // load the cache (this avoids concurrency issues later)
        cache.get(namespace,'');
    };
        
    function get(k) {
        if (typeof k == "undefined") throw Error("Can't retrieve with an undefined key");
        return JSON.parse(cache.get(namespace,key(k)));
    }
    
    function put(k,obj,expires) {
        if (typeof k == "undefined") throw Error("Can't save with an undefined key");
        if (typeof obj == "undefined") throw Error("Can't save an undefined object in cache");
        if (typeof expires != "undefined" && typeof expires != "number") throw Error("Expiration must be a number");
        cache.put(namespace,key(k),JSON.stringify(obj),expires);
    }

    function increment(k,delta,init_value) {
        if (typeof k == "undefined") throw Error("Can't increment an undefined key");
        if (typeof delta != "number") throw Error("Can't increment by a delta that is not numeric");
        if ((typeof init_value != "undefined") && (typeof init_value != "number")) throw Error("Can't have an init value that is not a number");
        cache.increment(namespace,key(k),delta,init_value);
    }
    
    function remove(k) {
        if (typeof k == "undefined") throw Error("Can't delete with an undefined key");
        cache.remove(namespace,key(k));
    }
    
    // -----------------------------------------------------
    
    function key(k) {
        var appid = request.app_project;
        if (!appid) throw Error("appid can't be null or undefined");
        return appid + ":" + k;
    }
    
})();

