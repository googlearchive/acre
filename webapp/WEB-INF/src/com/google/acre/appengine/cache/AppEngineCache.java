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

package com.google.acre.appengine.cache;

import com.google.acre.cache.Cache;
import com.google.appengine.api.memcache.Expiration;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;

public class AppEngineCache implements Cache {
    
    private MemcacheService _cache;
    private static Cache _singleton;
    
    public static synchronized Cache getCache() {
        if (_singleton == null) {
            _singleton = new AppEngineCache();
        }
        return _singleton;
    }

    public AppEngineCache() {
        _cache = MemcacheServiceFactory.getMemcacheService();
    }

    public Object get(String key) {
        return _cache.get(key);
    }

    public void put(String key, Object value, long expires) {
        _cache.put(key, value, Expiration.byDeltaMillis((int) expires));
    }

    public void put(String key, Object value) {
        _cache.put(key, value);
    }

    public void delete(String key) {
        _cache.delete(key);
    }

    public int increment(String key, int delta, int initValue) {
        return _cache.increment(key, delta, (long) initValue).intValue();
    }
}
