
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.store = {
            "begin" : begin,
            "get" : get,
            "put" : put,
            "update" : update,
            "remove" : remove,
            "find" : find,
            "find_keys" : find_keys
        };

    };

    function begin() {
        return store.begin();
    }
        
    function get(key, transaction) {
        return store.get(key, transaction);
    }
    
    function put(obj, name, parent_key, transaction) {
        // allow put() to be used both as (value,key) and (key,value)
        // this is useful to be able to say put(value) without specifying a key
        if (typeof obj == 'string' && typeof name == 'object') {
            var temp = obj;
            var obj = name;
            var name = temp;
        }
        var kind = obj.type || "untyped";
        return store.put(kind, obj, name, parent_key, transaction);
    }
    
    function update(key, obj, transaction) {
        if (typeof key == "object" && typeof obj == "undefined") {
            obj = key;
            key = obj._.key;
        }
        return store.update(key, obj, transaction);
    }
    
    function remove(key, transaction) {
        if (!key) throw "Can't remove an object with a null or undefined key";
        
        if (key instanceof Array) {
            for each (var k in key) {
                remove(k, transaction);
            }
        } else if (typeof key == "object") {
            if (typeof key._ == "undefined") throw "Can only remove objects retrieved from the store";
            store.remove(key._.key, transaction);
        } else {
            store.remove(key, transaction);
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

    Result.prototype.limit = function(limit) {
        this.result.limit(limit);
        return this;
    }

    Result.prototype.offset = function(offset) {
        this.result.offset(offset);
        return this;
    }

    Result.prototype.as_array = function() {
        var a = [];
        for (var o in this) {
            a.push(o);
        }
        return a;
    }

    Result.prototype.get_count = function() {
        return this.result.get_count();
    }
    
    Result.prototype.get_cursor = function() {
        return this.result.get_cursor();
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
    
    function find(query,cursor) {
        var kind = query.type || "untyped";
        var result = store.find(kind, query, cursor);
        return new Result(result);
    }

    function find_keys(query,cursor) {
        var kind = query.type || "untyped";
        var result = store.find_keys(kind, query, cursor);
        return new Result(result);
    }
    
})();

