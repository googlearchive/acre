
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        // acre.cache interface
        obj.cache = {
           "get" : persistentGet,
           "getAll" : persistentGetAll,
           "put" : persistentPut,
           "putAll" : persistentPutAll,
           "increment" : persistentIncrement,
           "remove" : persistentRemove,
           "removeAll" : persistentRemoveAll,

           // acre.cache.request interface
           request: {
            "get": requestGet,
            "getAll": requestGetAll,
            "put" : requestPut,
            "putAll" : requestPutAll,
            "remove" : requestRemove,
            "removeAll" : requestRemoveAll
           }
        };
    };

    _local = {};

    //There are two implementations of the cache interface.
    //acre.cache.*: persistent caching across requests.
    //acre.cache.request.*: persistent and request caching (faster but more memory intensive since objects exist at least twice).

    // ******** <cache>.get()  ************ //

    function _get(k) {
        if (typeof k == "undefined") throw Error("Can't retrieve with an undefined key");
        return _cache.get(key(k));
    }
    
    function persistentGet(k) {
        return JSON.parse(_get(k));
    }

    function requestGet(k) {
        if (typeof k == "undefined") throw Error("Can't retrieve with an undefined key");

        if (k in _local) {
            return JSON.parse(_local[k]);
        }

        var value = _get(k);

        if (value != null) {
            //Save it back to the local cache before decoding it.
            _local[k] = value;
            return JSON.parse(value);
        }

        return null;
    }

    // ********* <cache>.getAll() ********** //

  function _getAll(k_list) {
        var modified_k_list = k_list.map(function(k) { return key(k); });

        var result = _cache.getAll(modified_k_list);
        for (var k in result) {
            result[unkey(k)] = result[k];
            delete result[k];
        }

        return result;
    }

    function persistentGetAll(k_list) {
        if (k_list == null || !(k_list instanceof Array)) throw Error("Must call getAll() with an array of strings.");
        var result = _getAll(k_list);
        for (k in result) {
            result[k] = JSON.parse(result[k]);
        }

        return result;
    }

    function requestGetAll(k_list) {
        if (k_list == null || !(k_list instanceof Array)) throw Error("Must call getAll() with an array of strings.");

        //The final result;
        var result = {};

        //List of keys missing from the local cache.
        var missing = [];

        // Entries we get from the local request cache.

        k_list.forEach(function(k){
            if (_local[k] == null) {
                missing.push(k);
            } else {
                result[k] = JSON.parse(_local[k]);
            }
        });

        // Entries we get from the persistent cache. 

        if (missing.length > 0) {
            var persistent_result = _getAll(missing);
            for (k in persistent_result) {
                //Assign to the local cache.
                _local[k] = persistent_result[k];
                result[k] = JSON.parse(_local[k]);
            }
        }

        return result;
    }


    // ********* <cache>.put() ********** //

     function _put(k, obj, expires) {
        if (typeof expires != "undefined" && typeof expires != "number") throw Error("Expiration must be a number");
        return _cache.put(key(k),obj,expires);
    }

    function persistentPut(k,obj,expires) {
        if (typeof k == "undefined") throw Error("Can't save with an undefined key");
        if (typeof obj == "undefined") throw Error("Can't save an undefined object in cache");
        return _put(k,JSON.stringify(obj),expires);
    }

    function requestPut(k, obj, expires){
        if (typeof k == "undefined") throw Error("Can't save with an undefined key");
        if (typeof obj == "undefined") throw Error("Can't save an undefined object in cache");
        //Note: expires is not enforced for the request cache by definition.

        var value = JSON.stringify(obj);

        _local[k] = value;
        return _put(k, value, expires);
    }


    // ********* <cache>.putAll() ********** //

    function _putAll(obj, expires) {
        if (typeof expires != "undefined" && typeof expires != "number") throw Error("Expiration must be a number");
        var modified_keys_obj = {};
        for (var k in obj) {
            modified_keys_obj[key(k)] = obj[k];
        }
        return _cache.putAll(modified_keys_obj, expires);
    }

    function persistentPutAll(obj, expires) {
        if (typeof obj == "undefined") throw Error("Can't save an undefined object.");
        for (var k in obj){
            obj[k] = JSON.stringify(obj[k]);
        }
        return _putAll(obj, expires);
    }

    function requestPutAll(obj, expires) {
        if (typeof obj == "undefined") throw Error("Can't save an undefined object in cache");

        var value = null;
        for (var k in obj) {
            obj[k] = JSON.stringify(obj[k]);
            _local[k] = obj[k];
        }

        return _putAll(obj, expires);
    }


    // ********* <cache>.remove() ********** //

    function _remove(k) {
      return _cache.remove(key(k));
    }


    function persistentRemove(k) {
      if (typeof k == "undefined") throw Error("Can't delete with an undefined key");
      return _remove(k);
    }


    function requestRemove(k) {
      if (typeof k == "undefined") throw Error("Can't delete with an undefined key");
      delete _local[k];
      return _remove(k);
    }

    // ********* <cache>.removeAll() ********** //

    function _removeAll(k_list) {
      var modified_k_list = k_list.map(function(k) { return key(k); });
      return _cache.removeAll(modified_k_list);
    }


    function persistentRemoveAll(k_list) {
      if (k_list == null || !(k_list instanceof Array)) throw Error("Must call removeAll() with an array of strings.");
      return _removeAll(k_list);
    }


    function requestRemoveAll(k_list) {
      if (k_list == null || !(k_list instanceof Array)) throw Error("Must call removeAll() with an array of strings.");
      k_list.forEach(function(k){
        delete _local[k];
      });
      return _removeAll(k_list);
    }


    // ******* <cache>.increment() ********* //

    function _increment(k,delta,init_value) {
        return _cache.increment(key(k),delta,init_value);
    }

    function persistentIncrement(k, delta,init_value) {
        if (typeof k == "undefined") throw Error("Can't increment an undefined key");
        if (typeof delta != "number") throw Error("Can't increment by a delta that is not numeric");
        if ((typeof init_value != "undefined") && (typeof init_value != "number")) throw Error("Can't have an init value that is not a number");
        return _increment(k, delta,init_value);
    }


    // ******** helpers *********
    
    function key(k) {
        var appid = _request.app_project;
        if (!appid) console.error("Cache key '" + k + "' cannot be accessed because no project has been set.");
        return appid + ":" + k;
    }



    function unkey(k) {
        // Removes the appid from a cache key.
        // Will turn <appid>:<cachekey> to <cachekey>.
        var appid = _request.app_project;
        if (!appid) console.error("Cache key '" + k + "' cannot be accessed because no project has been set.");
        return k.slice(appid.length+1);

    }
    
})();

