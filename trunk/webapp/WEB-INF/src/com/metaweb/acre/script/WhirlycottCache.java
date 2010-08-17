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


package com.metaweb.acre.script;

import com.whirlycott.cache.Cache;
import com.whirlycott.cache.CacheException;
import com.whirlycott.cache.CacheManager;

public class WhirlycottCache implements com.metaweb.acre.util.Cache {
    private Cache _cache;
    private static com.metaweb.acre.util.Cache _singleton;
    
    public static synchronized com.metaweb.acre.util.Cache getCache() {
        if (_singleton == null) {
            _singleton = new WhirlycottCache();
        }
        return _singleton;
    }

    private WhirlycottCache() {
        try {
            CacheManager cm = CacheManager.getInstance();
            _cache = cm.getCache();
        } catch (CacheException e) {
            throw new RuntimeException(e);
        }
    }

    public String get(String key) {
        return (String) _cache.retrieve(key);
    }

    public void put(String key, String value, long expires) {
        _cache.store(key, value, expires);
    }

    public void put(String key, String value) {
        _cache.store(key, value);
    }

    public String delete(String key) {
        return (String) _cache.remove(key);
    }
}
