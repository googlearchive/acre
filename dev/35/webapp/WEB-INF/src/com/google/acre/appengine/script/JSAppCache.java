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
    
    // ------------------------------------------------------------------------------------------

    public JSAppCache() { }
    
    public JSAppCache(Scriptable scope) {
        _scope = scope;
        _cache = MemcacheServiceFactory.getMemcacheService();
    }
    
    public String getClassName() {
        return "AppCache";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    public String jsFunction_get(String key) {
        try {
            return (String) _cache.get(key);
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to get object: " + e.getMessage()).newJSException(_scope);
        }
    }

    public void jsFunction_put(String key, String obj, Object expires) {
        try {
            if (expires instanceof Number) { 
                _cache.put(key,obj,Expiration.byDeltaMillis(((Number) expires).intValue()));
            } else {
                _cache.put(key,obj);
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to put object: " + e.getMessage()).newJSException(_scope);
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
