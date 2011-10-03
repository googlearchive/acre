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

package com.google.acre.appengine.client;

import java.net.InetAddress;
import java.net.Socket;
import java.util.concurrent.TimeUnit;

import org.apache.http.conn.ClientConnectionManager;
import org.apache.http.conn.ClientConnectionRequest;
import org.apache.http.conn.ManagedClientConnection;
import org.apache.http.conn.routing.HttpRoute;
import org.apache.http.conn.scheme.Scheme;
import org.apache.http.conn.scheme.SchemeRegistry;
import org.apache.http.conn.scheme.SocketFactory;
import org.apache.http.params.HttpParams;

public class AppEngineClientConnectionManager implements ClientConnectionManager {

    private SchemeRegistry schemes;

    class NoopSocketFactory implements SocketFactory {
        public Socket connectSocket(Socket sock, String host, int port,
                                   InetAddress addr, int lport,
                                   HttpParams params) {
            return null;
        }

        public Socket createSocket() {
            return null;
        }

        public boolean isSecure(Socket sock) {
            return false;
        }
    }

    public AppEngineClientConnectionManager() {
        SocketFactory noop_sf = new NoopSocketFactory();

        schemes = new SchemeRegistry();
        schemes.register(new Scheme("http",  noop_sf, 80));
        schemes.register(new Scheme("https", noop_sf, 443));
    }

    public void closeExpiredConnections() {
        return;
    }

    public void closeIdleConnections(long idletime, TimeUnit tunit) {
        return;
    }

    public ManagedClientConnection getConnection(HttpRoute route, Object state) {
        return new AppEngineClientConnection(route, state);
    }

    public SchemeRegistry getSchemeRegistry() {
        return schemes;
    }

    public void releaseConnection(ManagedClientConnection conn,
                                  long valid, TimeUnit tuint) {
        return;
    }

    public ClientConnectionRequest requestConnection(final HttpRoute route,
                                                     final Object state) {
        return new ClientConnectionRequest() {
            public void abortRequest() {
                return;
            }

            public ManagedClientConnection getConnection(long idletime,
                                                         TimeUnit tunit) {

                return AppEngineClientConnectionManager.this.getConnection(route, state);
            }
        };
    }

    public void shutdown() {
        return;
    }
}
