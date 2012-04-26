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

import java.util.List;

import log.Log;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.AcreFactory;
import com.google.acre.javascript.JSObject;
import com.google.acre.keystore.KeyStore;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.acre.util.CostCollector;

public class JSKeyStore extends JSObject {

    private final static Log _logger = new Log(JSKeyStore.class);    
    
    private static final long serialVersionUID = -306790422514648132L;
    
    private static KeyStore _keystore;

    CostCollector _costCollector;
    
    static {
        try {
            _keystore = AcreFactory.getKeyStore();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public JSKeyStore() {
        _costCollector = CostCollector.getInstance();
    }

    public JSKeyStore(Scriptable scope) {
        _scope = scope;
        _costCollector = CostCollector.getInstance();
    }

    public static Scriptable jsConstructor(Context cx, Object[] args,
                                           Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSKeyStore(scope);
    }

    public String getClassName() {
        return "KeyStore";
    }

    public Scriptable jsFunction_get_key(String name, String appid) {
        Scriptable ret = Context.getCurrentContext().newArray(_scope, 2);
        try {
            _costCollector.collect("akrc");
            final long start_time = System.currentTimeMillis();
            String[] out = _keystore.get_key(name, appid);
            _costCollector.collect("akrw", System.currentTimeMillis() - start_time);

            if (out != null) {
                _logger.debug("keystore.get_key", "found key '" + name + "' for app '" + appid + "'");
                ret.put(0, ret, out[0]);
                ret.put(1, ret, out[1]);
                return ret;
            } else {
                _logger.debug("keystore.get_key", "NOT found key '" + name + "' for app '" + appid + "'");
                return null;
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to fetch key named "+ name +" from KeyStore: " + e.getMessage()).newJSException(_scope);
        }
    }

    public Scriptable jsFunction_get_keys(String appid) {
        try {
            _costCollector.collect("akrkc");
            final long start_time = System.currentTimeMillis();
            List<String> keys = _keystore.get_keys(appid);
            _costCollector.collect("akrkw", System.currentTimeMillis() - start_time);
            if ((keys != null) && (keys.size() > 0)) {
                _logger.debug("keystore.get_keys", "found keys for app '" +
                              appid + "'");
                return Context.getCurrentContext().newArray(_scope,keys.toArray());
            } else {
                _logger.debug("keystore.get_keys", "NO keys found for app '" +
                              appid + "'");
                return Context.getCurrentContext().newArray(_scope, new String[0]);
            }
        } catch (java.lang.Exception e) {
            throw new
                JSConvertableException("Failed to fetch keys from the KeyStore: " +
                                       e.getMessage()).newJSException(_scope);
        }
    }
    
    public void jsFunction_put_key(String name, String appid, String token,
                                   String secret) {
        try {
            _logger.debug("keystore.put_key", "Storing key '" +
                          name + "' for app '" + appid + "'");
            _costCollector.collect("akwc");
            final long start_time = System.currentTimeMillis();
            _keystore.put_key(name, appid, token, secret);
            _costCollector.collect("akww", System.currentTimeMillis() - start_time);
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to set key named " +
                                             name +" in KeyStore: " +
                                             e.getMessage()).newJSException(_scope);
        }
    }

    public void jsFunction_delete_key(String name, String appid) {
        try {
            _logger.debug("keystore.delete_key", "Deleting key '" +
                          name + "' for app '" + appid + "'");
            _keystore.delete_key(name, appid);
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to delete key named "+
                                             name +" from KeyStore: " +
                                             e.getMessage()).newJSException(_scope);
        }
    }
}
