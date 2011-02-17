
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.store = {
            "begin" : begin,
            "commit" : commit,
            "rollback" : rollback,
            "get" : get,
            "put" : put,
            "update" : update,
            "remove" : remove,
            "find" : find
        };

    };

    function get_appid() {
        var appid = acreboot._request_app_guid;
        if (!appid) throw Error("appid can't be null or undefined");
        return appid;
    }

    function begin() {
        store.begin();
    }
    
    function commit() {
        store.commit();
    }
    
    function rollback() {
        store.rollback();
    }
    
    function get(key) {
        return store.get(get_appid(), key);
    }
    
    function put(obj, name, parent_key) {
        // allow put() to be used both as (value,key) and (key,value)
        // this is useful to be able to say put(value) without specifying a key
        if (typeof obj == 'string' && typeof name == 'object') {
            var temp = obj;
            var obj = name;
            var name = temp;
        }
        return store.put(get_appid(), obj, name, parent_key);
    }
    
    function update(key, obj) {
        return store.update(get_appid(), key, obj);
        
    }
    
    function remove(key) {
        var appid = get_appid();
        if (key instanceof Array) {
            for each (var k in key) {
                store.remove(appid, k);
            }
        } else {
            store.remove(appid, key);
        }
    }

    // ------------------- find ----------------------------

    function Result(result) {
        this.result = result;
    }
    
    Result.prototype.first = function() {
        try {
            return this.__iterator__().next();
        } catch (e) {
            return undefined;
        }
    }
    
    Result.prototype.__iterator__ = function() {
        return new ResultIterator(this.result.as_iterator());
    };        

    function ResultIterator(iterator) {
        this.iterator = iterator;
    }

    ResultIterator.prototype.next = function() {
        if (this.iterator.has_next()) {
            return this.iterator.next();
        } else {
            throw StopIteration;
        }
    }
    
    function find(query) {
        var result = store.find(get_appid(), query);
        return new Result(result);
    }

})();

