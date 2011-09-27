package com.google.acre;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

import org.apache.http.conn.ClientConnectionManager;
import org.apache.http.conn.ssl.AllowAllHostnameVerifier;
import org.apache.http.conn.ssl.SSLSocketFactory;

import com.google.acre.cache.Cache;
import com.google.acre.classstore.ClassStore;
import com.google.acre.keystore.KeyStore;
import com.google.acre.script.AsyncUrlfetch;

public class AcreFactory {
    
    public static KeyStore getKeyStore() throws Exception {
        String keystore_class = "com.google.acre." + ((Configuration.isAppEngine()) ? "appengine.keystore.AppEngineKeyStore" : "keystore.MySQLKeyStore");
        Class<?> cls = Class.forName(keystore_class);
        Method method = cls.getMethod("getKeyStore", new Class[0]);
        return (KeyStore) method.invoke(null, new Object[0]);
    }

    public static Cache createCache(String namespace) throws Exception {
        String cache_class = "com.google.acre." + ((Configuration.isAppEngine()) ? "appengine.cache.AppEngineCache" : "cache.WhirlyCache");
        Class<?> cls = Class.forName(cache_class);
        Class<?>[] signature = new Class[1];
        signature[0] = String.class;
        Method method = cls.getMethod("getCache", signature);
        Object[] arguments = new Object[1];
        arguments[0] = namespace;
        return (Cache) method.invoke(null, arguments);
    }
    
    static private Map<String,Cache> _cache_map = new HashMap<String,Cache>();
    
    public static Cache getCache(String namespace) throws Exception {
        if (_cache_map.containsKey(namespace)) {
            return _cache_map.get(namespace);
        } else {
            Cache cache = createCache(namespace);
            _cache_map.put(namespace,cache);
            return cache;
        }
    }
    
    public static ClassStore getClassStore() throws Exception {
        if (Configuration.isAppEngine()) {
            String class_store_class = "com.google.acre.appengine.classstore.AppEngineClassStore";
            return (ClassStore) Class.forName(class_store_class).newInstance();
        } else {
            return null;
        }
    }
    
    public static AsyncUrlfetch getAsyncUrlfetch() throws Exception {
        String async_urlfetch_class = "com.google.acre." + ((Configuration.isAppEngine()) ? "appengine.script.AppEngineAsyncUrlfetch" : "script.NHttpAsyncUrlfetch");
        return (AsyncUrlfetch) Class.forName(async_urlfetch_class).newInstance();
    }
    
    public static ClientConnectionManager getClientConnectionManager() {
        if (Configuration.isAppEngine()) {
            String connection_manager_class = "com.google.acre.appengine.client.AppEngineClientConnectionManager";
            try {
                return (ClientConnectionManager) Class.forName(connection_manager_class).newInstance();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else {
            SSLSocketFactory.getSocketFactory().setHostnameVerifier(new AllowAllHostnameVerifier());
            return null; // this means that the httpclient will use the default connection manager
        }
    }
}
