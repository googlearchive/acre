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

import java.lang.reflect.Method;
import java.util.List;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.Configuration;
import com.google.acre.util.KeyStore;
import com.google.util.javascript.JSObject;
import com.google.util.logging.MetawebLogger;

public class JSKeyStore extends JSObject {
    
    private static final long serialVersionUID = -306790422514648132L;
    
    private static KeyStore _keystore;
    private static MetawebLogger _logger = new MetawebLogger();

    static {
        String keystore_class = 
            Configuration.Values.ACRE_KEYSTORE_CLASS.getValue();
        try {
            Class<?> cls = Class.forName(keystore_class);
            Method method = cls.getMethod("getKeyStore", new Class[0]);
            _keystore = (KeyStore)method.invoke(null, new Object[0]);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

    }

    public JSKeyStore() { }

    public JSKeyStore(Scriptable scope) {
        _scope = scope;
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
            String[] out = _keystore.get_key(name, appid);
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
            List<String> keys = _keystore.get_keys(appid);
            if ((keys != null) && (keys.size() > 0)) {
                _logger.debug("keystore.get_keys", "found keys for app '" +
                              appid + "'");
                return Context.getCurrentContext().newArray(_scope,keys.toArray());
            } else {
                _logger.debug("keystore.get_keys", "NO keys found for app '" +
                              appid + "'");
                return null;
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
            _keystore.put_key(name, appid, token, secret);
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