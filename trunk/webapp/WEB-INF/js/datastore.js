
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

    var graphd_guid_prefix = "#9202a8c04000641f8";

    var keyStr = "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-=";


    // turn a number into its base64 representation
    function compress_num(n) {
      var o = "";
      
      for (var i = 0; i < 5; i++) {
        var mask = (1 << (6*(i+1))) - 1;
        var masked = n & mask;
        var adjusted = masked >> (6*i);
        o += keyStr[adjusted];
      }
      
      return o;
    }

    // remove trailing underscores since they don't provide any differentiation signal
    function remove_trailing_underscores(str) {
        for (var i = str.length - 1; str.charAt(i) == "_"; i--);
        return str.substring(0,i+1);
      }
    
    // given a freebase guid, return the shortest possible string
    // that we can use to keep unicity between apps
    function compress(guid) {
      if (guid.indexOf(graphd_guid_prefix) != 0) return guid;
      var str = guid.substring(graphd_guid_prefix.length);
      var str1 = str.substring(0,7);
      var str2 = str.substring(8,15);
      var sep_ch = str.charAt(7);
      var sep = parseInt(sep_ch,16);
      var n1 = (parseInt(str1,16) << 2) + (sep >> 2);
      var n2 = parseInt(str2,16) + (sep << 28);
      var c1 = compress_num(n1);
      var c2 = compress_num(n2);
      return remove_trailing_underscores(c2 + c1);
    }
    
    function get_appid() {
        var appid = acreboot._request_app_guid;
        if (!appid) throw Error("appid can't be null or undefined");
        appid = compress(appid);
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
        if (typeof key == "object" && typeof obj == "undefined") {
            obj = key;
            key = obj._.key;
        }
        return store.update(get_appid(), key, obj);
    }
    
    function remove(key) {
        if (!key) throw "Can't remove an object with a null or undefined key";
        
        if (key instanceof Array) {
            for each (var k in key) {
                remove(k);
            }
        } else if (typeof key == "object") {
            if (typeof key._ == "undefined") throw "Can only remove objects retrieved from the store";
            remove(key._.key);
        } else {
            store.remove(get_appid(), key);
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

    Result.prototype.as_array = function() {
        var a = [];
        for (var o in this) {
            a.push(o);
        }
        return a;
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
        var result = store.find(get_appid(), query, cursor);
        return new Result(result);
    }

})();

