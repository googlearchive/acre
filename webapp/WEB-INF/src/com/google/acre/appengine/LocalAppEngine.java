package com.google.acre.appengine;

import java.io.IOException;

import log.Log;

import com.google.acre.Configuration;
import com.google.appengine.tools.remoteapi.RemoteApiInstaller;
import com.google.appengine.tools.remoteapi.RemoteApiOptions;

public class LocalAppEngine {

    private final static Log _logger = new Log(LocalAppEngine.class);
    
    private static boolean APPENGINE_REMOTING = Configuration.Values.APPENGINE_REMOTING.getBoolean();
    private static String APPENGINE_REMOTE_APP_HOST = Configuration.Values.APPENGINE_REMOTE_APP_HOST.getValue();
    private static int APPENGINE_REMOTE_APP_PORT = Configuration.Values.APPENGINE_REMOTE_APP_PORT.getInteger();
    private static String APPENGINE_REMOTE_APP_PATH = Configuration.Values.APPENGINE_REMOTE_APP_PATH.getValue();
    private static String APPENGINE_REMOTE_USERNAME = Configuration.Values.APPENGINE_REMOTE_USERNAME.getValue();
    private static String APPENGINE_REMOTE_PASSWORD = Configuration.Values.APPENGINE_REMOTE_PASSWORD.getValue();
    
    private static LocalAppEngine _instance;
    
    private boolean initialized = false;
    
    private RemoteApiInstaller installer;
    
    private RemoteApiOptions options;
    
    private LocalAppEngine() { }
    
    public static synchronized LocalAppEngine getInstance() {
        if (_instance == null) {
            _instance = new LocalAppEngine();
        }
        return _instance;
    }
    
    public void init() throws IOException {
        if (APPENGINE_REMOTING && !initialized) {
            
            this.options = new RemoteApiOptions()
                .server(APPENGINE_REMOTE_APP_HOST, APPENGINE_REMOTE_APP_PORT)
                .credentials(APPENGINE_REMOTE_USERNAME, APPENGINE_REMOTE_PASSWORD)
                .remoteApiPath(APPENGINE_REMOTE_APP_PATH);

            installer = new RemoteApiInstaller();
            installer.logMethodCalls();
            installer.install(options);
            // Update the options with reusable credentials so we can skip authentication on subsequent calls.
            options.reuseCredentials(APPENGINE_REMOTE_USERNAME, installer.serializeCredentials());
            initialized = true;
            
            _logger.info("appengine.remote_api", "Initialized RemoteAPI connector on thread '" + Thread.currentThread().getName() + "' against '" + APPENGINE_REMOTE_APP_HOST + ":" + APPENGINE_REMOTE_APP_PORT + APPENGINE_REMOTE_APP_PATH + "'");
        }
    }
    
    public void destroy() throws IOException {
        if (APPENGINE_REMOTING && initialized) {
            installer.uninstall();
            initialized = false;
        }
    }
    
    public void enableRemoting() throws IOException {
        if (APPENGINE_REMOTING && initialized) {
            RemoteApiInstaller installer = new RemoteApiInstaller();
            installer.install(options);
            _logger.info("appengine.remote_api", "Remoting enabled on thread: " + Thread.currentThread().getName());
        }
    }
    
    public void disableRemoting() throws IOException {
        if (APPENGINE_REMOTING && initialized) {
            RemoteApiInstaller installer = new RemoteApiInstaller();
            installer.uninstall();
            _logger.info("appengine.remote_api", "Remoting disabled on thread: " + Thread.currentThread().getName());
        }
    }
}
