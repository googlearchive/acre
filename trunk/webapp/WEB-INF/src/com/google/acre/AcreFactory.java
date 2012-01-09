package com.google.acre;

import java.lang.reflect.Method;

import org.apache.http.conn.ClientConnectionManager;
import org.apache.http.conn.ssl.AllowAllHostnameVerifier;
import org.apache.http.conn.ssl.SSLSocketFactory;

import com.google.acre.cache.Cache;
import com.google.acre.classstore.ClassStore;
import com.google.acre.keystore.KeyStore;
import com.google.acre.remoting.NoopRemotingManager;
import com.google.acre.remoting.RemotingManager;
import com.google.acre.script.AsyncUrlfetch;

public class AcreFactory {
    
    public static KeyStore getKeyStore() throws Exception {
        String keystore_class = "com.google.acre." + ((Configuration.isAppEngine()) ? "appengine.keystore.AppEngineKeyStore" : "keystore.MySQLKeyStore");
        Class<?> cls = Class.forName(keystore_class);
        Method method = cls.getMethod("getKeyStore", new Class[0]);
        return (KeyStore) method.invoke(null, new Object[0]);
    }

    public static Cache getCache() throws Exception {
        String cache_class = "com.google.acre." + ((Configuration.isAppEngine()) ? "appengine.cache.AppEngineCache" : "cache.WhirlyCache");
        Class<?> cls = Class.forName(cache_class);
        Method method = cls.getMethod("getCache", new Class[0]);
        return (Cache) method.invoke(null, new Object[0]);
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
    
    @SuppressWarnings("unchecked")
    public static RemotingManager getRemotingManager() throws Exception {
        if (Configuration.isAppEngine() && Configuration.Values.APPENGINE_REMOTING.getBoolean()) {
            String manager = "com.google.acre.appengine.remoting.AppEngineRemotingManager";
            Class<RemotingManager> cls = (Class<RemotingManager>) Class.forName(manager);
            return cls.newInstance();
        } else {
            return new NoopRemotingManager();
        }
    }
}
