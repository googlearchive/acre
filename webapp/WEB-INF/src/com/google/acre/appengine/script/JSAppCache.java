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

package com.google.acre.appengine.script;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.util.CostCollector;
import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.memcache.Expiration;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;

public class JSAppCache extends JSObject {
    
    private static final long serialVersionUID = 8349031142780892250L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSAppCache(scope);
    }

    MemcacheService _cache;
    CostCollector _costCollector;
    
    // ------------------------------------------------------------------------------------------

    public JSAppCache() { }
    
    public JSAppCache(Scriptable scope) {
        _scope = scope;
        _cache = MemcacheServiceFactory.getMemcacheService();
        _costCollector = CostCollector.getInstance();
    }
    
    public String getClassName() {
        return "AppCache";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    public Object jsFunction_get(String key) {
        try {
            _costCollector.collect("amrc");
            final long start_time = System.currentTimeMillis();

            Object cache_response = _cache.get(key);
            _costCollector.collect("amrw", System.currentTimeMillis() - start_time);
            return cache_response;

        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to get object: " + e.getMessage()).newJSException(_scope);
        }
    }

    public void jsFunction_put(String key, Object obj, Object expires) {
        try {
            _costCollector.collect("amwc");
            final long start_time = System.currentTimeMillis();

            if (expires instanceof Number) { 
                _cache.put(key,obj,Expiration.byDeltaMillis(((Number) expires).intValue()));
            } else {
                _cache.put(key,obj);
            }
            _costCollector.collect("amww", System.currentTimeMillis() - start_time);

        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to put object: " + e.getMessage()).newJSException(_scope);
        }
    }

    public int jsFunction_increment(String key, int delta, Object initValue) {
        try {
            if (initValue instanceof Number) { 
                return _cache.increment(key, delta, ((Number) initValue).longValue()).intValue();
            } else {
                return _cache.increment(key, delta).intValue();
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to increment object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public void jsFunction_remove(String key) {
        try {
            _cache.delete(key);
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to delete object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
}
