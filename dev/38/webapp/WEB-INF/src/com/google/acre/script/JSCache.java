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

//
//package com.google.acre.script;
//
//import com.google.acre.AcreFactory;
//import com.google.acre.cache.Cache;
//import com.google.acre.javascript.JSObject;
//
//public class JSCache extends JSObject {
//    
//    private static final long serialVersionUID = 7556102890015508964L;
//
//    private static Cache _cache;
//
//    static {
//        try {
//            _cache = AcreFactory.getCache();
//        } catch (Exception e) {
//            throw new RuntimeException(e);
//        }
//    }
//
//    public String getClassName() {
//        return "Cache";
//    }
//
//    public Object jsFunction_get(String key) {
//        return _cache.get(key);
//    }
//
//    public void jsFunction_put(String key, String value, Double expires) {
//        if (!(expires.isNaN())) {
//            _cache.put(key, value, expires.longValue());
//        } else {
//            _cache.put(key, value);
//        }
//    }
//
//    public void jsFunction_delete(String key) {
//        _cache.delete(key);
//    }
//
//}
//
//

package com.google.acre.script;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.AcreFactory;
import com.google.acre.cache.Cache;
import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.acre.util.CostCollector;

public class JSCache extends JSObject {
    
    private static final long serialVersionUID = 7556102890015508964L;
    
    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) throws Exception {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSCache(scope);
    }

    CostCollector _costCollector;
    
    Cache _cache;
    
    // ------------------------------------------------------------------------------------------

    public JSCache() { }
    
    public JSCache(Scriptable scope) throws Exception {
        _scope = scope;
        _costCollector = CostCollector.getInstance();
        _cache = AcreFactory.getCache();
    }
    
    public String getClassName() {
        return "Cache";
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
                _cache.put(key,obj,((Number) expires).intValue());
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
                return _cache.increment(key, delta, ((Number) initValue).intValue());
            } else {
                return _cache.increment(key, delta, 0);
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
