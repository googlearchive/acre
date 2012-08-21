// Copyright 2007-2010 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.acre.cache;

import com.whirlycott.cache.Cache;
import com.whirlycott.cache.CacheException;
import com.whirlycott.cache.CacheManager;
import java.util.Collection;
import java.util.Map;
import java.util.HashMap;

public class WhirlyCache implements com.google.acre.cache.Cache {

    private static com.google.acre.cache.Cache _singleton;

    public static synchronized com.google.acre.cache.Cache getCache() throws CacheException {
        if (_singleton == null) {
            _singleton = new WhirlyCache();
        }
        return _singleton;
    }

    // ---------------------------------------------------------------------------
    
    private Cache _cache;
    
    private WhirlyCache() throws CacheException {
        _cache = CacheManager.getInstance().getCache();
    }

    public Object get(String key) {
        return _cache.retrieve(key);
    }

    public void put(String key, Object value, long expires) {
        _cache.store(key, value, expires);
    }

    public void put(String key, Object value) {
        _cache.store(key, value);
    }

    public void delete(String key) {
        _cache.remove(key);
    }

    public void deleteAll(Collection<String> keys){
        for (String k: keys){
            delete(k);
        }
    }

    public Map<String, Object> getAll(Collection<String> keys) {
        Map<String, Object> result =  new HashMap<String, Object>();
        // Unfortunately Whirlycott does not support multi_get so we have to fake it :(
        // http://www.jarvana.com/jarvana/view/com/whirlycott/whirlycache/1.0.1/whirlycache-1.0.1-javadoc.jar!/com/whirlycott/cache/Cache.html
        for (String k: keys) {
            result.put(k, get(k));
        }
        return result;
    }

    public void putAll(Map<String, Object> obj, long expires) {
        for (Map.Entry<String, Object> entry : obj.entrySet()) {
            put(entry.getKey(), entry.getValue(), expires);
        }
    }

    public void putAll(Map<String, Object> obj) {
        for (Map.Entry<String, Object> entry : obj.entrySet()) {
            put(entry.getKey(), entry.getValue());
        }
    }

    public int increment(String key, int delta, int initValue) {
        // Whirlycache does not support atomic increments so we need to do it ourselves
        synchronized(_cache) {
            Object o = this.get(key);
            if (o == null) {
                int i = initValue + delta;
                _cache.store(key, i);
                return i;
            }
            
            if (o instanceof String) {
                o = Integer.parseInt((String) o, 10);  
            }
            
            if (!(o instanceof Number)) {
                throw new RuntimeException("Can't increment a non-Number: " + o.getClass());
            }
            
            int l = ((Number) o).intValue();
            l += delta;
            _cache.store(key, l);
            return l;
        }
    }
}
