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

import static com.google.appengine.api.urlfetch.FetchOptions.Builder.allowTruncate;

import java.io.ByteArrayOutputStream;
import java.net.InetAddress;
import java.net.URL;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.SSLSession;

import org.apache.http.Header;
import org.apache.http.HttpConnectionMetrics;
import org.apache.http.HttpHost;
import org.apache.http.HttpResponse;
import org.apache.http.ProtocolVersion;
import org.apache.http.conn.ManagedClientConnection;
import org.apache.http.conn.routing.HttpRoute;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.message.BasicHttpResponse;
import org.apache.http.params.HttpParams;
import org.apache.http.protocol.HttpContext;

import com.google.appengine.api.urlfetch.HTTPHeader;
import com.google.appengine.api.urlfetch.HTTPMethod;
import com.google.appengine.api.urlfetch.HTTPRequest;
import com.google.appengine.api.urlfetch.HTTPResponse;
import com.google.appengine.api.urlfetch.URLFetchService;
import com.google.appengine.api.urlfetch.URLFetchServiceFactory;

class AppEngineClientConnection implements ManagedClientConnection {

    // Managed is the composition of ConnectionReleaseTrigger,
    //     HttpClientConnection, HttpConnection, HttpInetConnection

    private HttpRoute _route;
    private Object _state;
    private boolean _reuseable;

    public AppEngineClientConnection(HttpRoute route, Object state) {
        _route = route;
        _state = state;
    }

    // ManagedClientConnection methods

    public HttpRoute getRoute() {
        return _route;
    }

    public Object getState() {
        return _state;
    }

    public SSLSession getSSLSession() {
        return null;
    }

    public boolean isSecure() {
        // XXX maybe parse the url to see if it's https?
        return false;
    }

    public boolean isMarkedReusable() {
        return _reuseable;
    }

    public void markReusable() {
        _reuseable = true;
    }

    public void layerProtocol(HttpContext context, HttpParams params) {
        return;
    }

    public void open(HttpRoute route, HttpContext context, HttpParams params) {
        return;
    }

    public void setIdleDuration(long duration, TimeUnit unit) {
        return;
    }

    public void setState(Object state) {
        _state = state;
    }

    public void tunnelProxy(HttpHost next, boolean secure, HttpParams params) {
        return;
    }

    public void tunnelTarget(boolean secure, HttpParams params) {
        return;
    }

    public void unmarkReusable() {
        _reuseable = false;
    }


    // ConnectionReleaseTrigger methods

    public void releaseConnection() {
        return;
    }

    public void abortConnection() {
        return;
    }

    // HttpClientConnection methods

    private HTTPRequest _appengine_hrequest;
    private HTTPResponse _appengine_hresponse;

    public void flush() {
        return;
    }

    public boolean isResponseAvailable(int timeout) {
        // XXX possibly use Async fetcher
        return true;
    }

    public void receiveResponseEntity(org.apache.http.HttpResponse apache_response) {
        byte[] data = _appengine_hresponse.getContent();

        if (data != null) {
            apache_response.setEntity(new ByteArrayEntity(data));
        }
    }

    public HttpResponse receiveResponseHeader() {
        URLFetchService ufs = URLFetchServiceFactory.getURLFetchService();
        try {
            _appengine_hresponse = ufs.fetch(_appengine_hrequest);
        } catch (java.io.IOException e) {
            throw new RuntimeException(e);
        }

        org.apache.http.HttpResponse apache_response =
            new BasicHttpResponse(new ProtocolVersion("HTTP", 1, 0),
                                  _appengine_hresponse.getResponseCode(),
                                  null);

        // WARNING(SM): appengine condenses multiple HTTP headers with the same name into
        // one single comma-separated string. Unfortunately it doesn't escape the commas
        // already present in the header value, making it a realy pain to write a header
        // parsing code that is not special-casing the various headers. Since the only
        // header we're having trouble with is set-cookie, we're special-casing that one
        // but there could be others lurking and waiting to bite us in the rear later.
        
        for (HTTPHeader h : _appengine_hresponse.getHeaders()) {
            if ("set-cookie".equalsIgnoreCase(h.getName())) {
                splitCookies(h.getValue(), apache_response);
            } else {
                apache_response.addHeader(h.getName(), h.getValue());
            }
        }

        return apache_response;
    }
    
    private void splitCookies(String str, org.apache.http.HttpResponse response) {
        str = str.replace("expires=Mon, ", "expires=Mon{@_#_@} ");
        str = str.replace("expires=Tue, ", "expires=Tue{@_#_@} ");
        str = str.replace("expires=Wed, ", "expires=Wed{@_#_@} ");
        str = str.replace("expires=Thu, ", "expires=Thu{@_#_@} ");
        str = str.replace("expires=Fri, ", "expires=Fri{@_#_@} ");
        str = str.replace("expires=Sat, ", "expires=Sat{@_#_@} ");
        str = str.replace("expires=Sun, ", "expires=Sun{@_#_@} ");
        String[] parts = str.split(",");
        
        for (String s : parts) {
            s = s.replace("{@_#_@}", ",");
            response.addHeader("set-cookie", s);
        }
    }
    
    public void sendRequestEntity(org.apache.http.HttpEntityEnclosingRequest request) {
        ByteArrayOutputStream os = new ByteArrayOutputStream();

        org.apache.http.HttpEntity ent = request.getEntity();
        if (ent != null) {
            try {
                ent.writeTo(os);
            } catch (java.io.IOException e) {
                throw new RuntimeException(e);
            }
        }

        _appengine_hrequest.setPayload(os.toByteArray());
    }

    public void sendRequestHeader(org.apache.http.HttpRequest apache_request) {
        URL request_url;

        HttpHost host = _route.getTargetHost();

        String protocol = host.getSchemeName();
        String addr = host.getHostName();
        int port = host.getPort();

        String path = apache_request.getRequestLine().getUri();

        try {
            request_url = new URL(protocol, addr, port, path);
        } catch (java.net.MalformedURLException e) {
            throw new RuntimeException(e);
        }

        HTTPMethod method = HTTPMethod.valueOf(apache_request.getRequestLine().getMethod());
        _appengine_hrequest = new HTTPRequest(request_url, method, allowTruncate().doNotFollowRedirects());

        Header[] apache_headers = apache_request.getAllHeaders();
        for (int i = 0; i < apache_headers.length; i++) {
            Header h = apache_headers[i];
            _appengine_hrequest.setHeader(new HTTPHeader(h.getName(), h.getValue()));
        }
    }

    // HttpConnection methods

    public void close() {
        return;
    }

    public HttpConnectionMetrics getMetrics() {
        return null;
    }

    public int getSocketTimeout()  {
        return -1;
    }

    public boolean isOpen() {
        return true;
    }

    public boolean isStale() {
        return false;
    }

    public void setSocketTimeout(int timeout) {
        return;
    }

    public void shutdown() {
        return;
    }

    // HttpInetConnection methods

    public InetAddress getLocalAddress() {
        return null;
    }
           
    public int getLocalPort() {
        return -1;
    }
           
    public InetAddress getRemoteAddress() {
        return null;
    }
           
    public int getRemotePort() {
        return -1;
    }
}
