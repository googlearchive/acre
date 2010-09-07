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


package com.google.acre.script;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.apache.commons.codec.binary.Hex;

import com.google.acre.util.Cache;
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

    public String get(String key) {
        String hkey = hash("MD5", key);
        return (String) _cache.get(hkey);
    }

    public void put(String key, String value, long expires) {
        Expiration exp = Expiration.byDeltaMillis((int)expires);
        _cache.put(hash("MD5", key), value, exp);
    }

    public void put(String key, String value) {
        _cache.put(hash("MD5", key), value);
    }

    public String delete(String key) {
        String hkey = hash("MD5", "key");
        String res = (String)_cache.get(hkey);
        _cache.delete(hkey);
        return res;
    }

    private String hash(String algorithm, String str) {
        try {
            MessageDigest alg = MessageDigest.getInstance(algorithm);
            alg.reset();
            alg.update(str.getBytes());

            byte digest[] = alg.digest();

            return new String(Hex.encodeHex(digest));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

}
