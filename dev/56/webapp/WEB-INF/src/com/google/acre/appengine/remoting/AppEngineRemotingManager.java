// Copyright 2007-2012 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.acre.appengine.remoting;

import log.Log;

import com.google.acre.Configuration;
import com.google.acre.remoting.RemotingManager;
import com.google.appengine.tools.remoteapi.RemoteApiInstaller;
import com.google.appengine.tools.remoteapi.RemoteApiOptions;

public class AppEngineRemotingManager implements RemotingManager {

    private final static Log _logger = new Log(AppEngineRemotingManager.class);
    
    private static String APPENGINE_REMOTE_APP_HOST = Configuration.Values.APPENGINE_REMOTE_APP_HOST.getValue();
    private static int APPENGINE_REMOTE_APP_PORT = Configuration.Values.APPENGINE_REMOTE_APP_PORT.getInteger();
    private static String APPENGINE_REMOTE_APP_PATH = Configuration.Values.APPENGINE_REMOTE_APP_PATH.getValue();
    private static String APPENGINE_REMOTE_USERNAME = Configuration.Values.APPENGINE_REMOTE_USERNAME.getValue();
    private static String APPENGINE_REMOTE_PASSWORD = Configuration.Values.APPENGINE_REMOTE_PASSWORD.getValue();
    
    private RemoteApiInstaller _installer;
    
    private static RemoteApiOptions _options;
    
    static {
        _options = new RemoteApiOptions()
        .server(APPENGINE_REMOTE_APP_HOST, APPENGINE_REMOTE_APP_PORT)
        .credentials(APPENGINE_REMOTE_USERNAME, APPENGINE_REMOTE_PASSWORD)
        .remoteApiPath(APPENGINE_REMOTE_APP_PATH);

        RemoteApiInstaller installer = new RemoteApiInstaller();
        try {
            installer.logMethodCalls();
            installer.install(_options);
            _options.reuseCredentials(APPENGINE_REMOTE_USERNAME, installer.serializeCredentials());
            _logger.warn("appengine.remote_api", "Successully enabled remoting APIs and stored authorization credentials for reuse");
        } catch (Exception e) {
            _logger.error("appengine.remote_api", "Error enabling remoting APIs: " + e.getMessage());
        } finally {
            try {
                installer.uninstall();
            } catch (Exception e) {
                e.printStackTrace();
                // ignore;
            }
        }
    }

    public AppEngineRemotingManager() { 
        this._installer = new RemoteApiInstaller();
        this._installer.logMethodCalls();
    }
            
    public void enable() {
        try {
            this._installer.install(_options);
            _logger.warn("appengine.remote_api", "Remoting enabled on thread: " + Thread.currentThread().getName() + " [" + Thread.currentThread().getThreadGroup().getName() + "]");
        } catch (IllegalStateException e) {
            _logger.warn("appengine.remote_api", "Remoting already installed on thread: " + Thread.currentThread().getName());
        } catch (Exception e) {
            _logger.error("appengine.remote_api", "Error installing remote API: " + e.getMessage());
        }
    }
    
    public void disable() {
        try {
            this._installer.uninstall();
            _logger.warn("appengine.remote_api", "Remoting disabled on thread: " + Thread.currentThread().getName());
        } catch (IllegalArgumentException e) {
            _logger.warn("appengine.remote_api", "Remoting already disabled on thread: " + Thread.currentThread().getName());
        }
    }
}
