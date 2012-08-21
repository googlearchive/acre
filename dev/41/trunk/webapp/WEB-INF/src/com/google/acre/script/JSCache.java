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

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import java.util.Collection;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.lang.Integer;

import log.Log;
import static log.Log.WARN;

import com.google.acre.AcreFactory;
import com.google.acre.cache.Cache;
import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.acre.util.CostCollector;

public class JSCache extends JSObject {
    
    private static final long serialVersionUID = 7556102890015508964L;
    private final static Log _logger = new Log(JSCache.class);

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
            _costCollector.collect("amrc").collect("amrn");
            final long start_time = System.currentTimeMillis();

            Object cache_response = _cache.get(key);
            
            _costCollector.collect("amrw", System.currentTimeMillis() - start_time);
            
            return cache_response;
        } catch (java.lang.Exception e) {
           //Do not throw an exception for failing to access the cache.
            _logger.log("jscache", WARN, "Error in cache.get(): " + e.getMessage());
            return null;
        }
    }

    public Object jsFunction_getAll(Scriptable key_list) {

        Collection<String> keys = new ArrayList<String>();
        Scriptable result = Context.getCurrentContext().newObject(_scope);

        // Extract the string cache keys from the request.

        Object[] ids = key_list.getIds();

        if (ids.length == 0) {
            return result;
        }

        try {
            for (int i = 0; i < ids.length; i++) {
                int id = Integer.parseInt(ids[i].toString());
                keys.add(key_list.get(id, key_list).toString());
            }
        } catch (java.lang.Exception e) {
            //Do not throw an exception for failing to access the cache.
            _logger.log("jscache", WARN, "Error - found non integer keys in cache.getAll(): " + e.getMessage());

        }

        // Get all the keys in one go from the cache. 

        try {
             _costCollector.collect("amrc").collect("amrn", (float) ids.length);
            final long start_time = System.currentTimeMillis();

            Map<String, Object> obj = _cache.getAll(keys);

            _costCollector.collect("amrw", System.currentTimeMillis() - start_time);

            // Create a scoped JS object with the results. Both keys and values are strings at this point. 
            for (Map.Entry<String, Object> entry : obj.entrySet()) {
                ScriptableObject.putProperty(result, entry.getKey(), entry.getValue());
            }
        } catch (java.lang.Exception e) {
           //Do not throw an exception for failing to access the cache.
            _logger.log("jscache", WARN, "Error in cache.getAll(): " + e.getMessage());
        }

        return result;

    }

    public void jsFunction_put(String key, Object obj, Object expires) {
        try {
            _costCollector.collect("amwc").collect("amwn");
            final long start_time = System.currentTimeMillis();
            
            if (expires instanceof Number) {
                _cache.put(key,obj,((Number) expires).intValue());
            } else {
                _cache.put(key,obj);
            }
            
            _costCollector.collect("amww", System.currentTimeMillis() - start_time);

        } catch (java.lang.Exception e) {
            //Do not throw an exception for failing to access the cache.
            _logger.log("jscache", WARN, "Error in cache.put(): " + e.getMessage());
        }
    }

    public void jsFunction_putAll(Scriptable obj, Object expires) {
  
        Map<String, Object> records = new HashMap<String, Object>();

        Object[] ids = obj.getIds();

        if (ids.length == 0) {
            return;
        }

        try {
            for (int i = 0; i < ids.length; i++) {
                String key = ids[i].toString();
                records.put(key, obj.get(key, obj));
            }
        } catch (java.lang.Exception e) {
             _logger.log("jscache", WARN, "Error converting keys to string in cache.putAll(): " + e.getMessage());
        }

        try {

             _costCollector.collect("amwc").collect("amwn", (float) ids.length);
            final long start_time = System.currentTimeMillis();

            if (expires instanceof Number) {
                _cache.putAll(records, ((Number) expires).intValue());
            } else {
                _cache.putAll(records);
            }

            _costCollector.collect("amww", System.currentTimeMillis() - start_time);

        } catch (java.lang.IllegalArgumentException e) {
            //Do not throw an exception for failing to access the cache.
             _logger.log("jscache", WARN, "Error in cache.putAll(): " + e.getMessage());
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

    public void jsFunction_removeAll(Scriptable key_list){

        Collection<String> keys = new ArrayList<String>();
  
        // Extract the string cache keys from the request.

        Object[] ids = key_list.getIds();

        if (ids.length == 0) {
            return;
        }

        try {
            for (int i = 0; i < ids.length; i++) {
                int id = Integer.parseInt(ids[i].toString());
                keys.add(key_list.get(id, key_list).toString());
            }
        } catch (java.lang.Exception e) {
            _logger.log("jscache", WARN, "Error - found non integer keys in cache.removeAll(): " + e.getMessage());
        }

        try {
            _cache.deleteAll(keys);
        } catch (java.lang.Exception e) {
           //Do not throw an exception for failing to access the cache.
            _logger.log("jscache", WARN, "Error in cache.removeAll(): " + e.getMessage());
        }

    }
}
