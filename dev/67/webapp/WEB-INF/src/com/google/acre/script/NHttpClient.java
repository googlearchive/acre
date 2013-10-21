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

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.SSLContext;

import org.apache.http.HttpEntityEnclosingRequest;
import org.apache.http.HttpException;
import org.apache.http.HttpRequest;
import org.apache.http.HttpResponse;
import org.apache.http.impl.DefaultConnectionReuseStrategy;
import org.apache.http.impl.nio.DefaultClientIOEventDispatch;
import org.apache.http.impl.nio.reactor.DefaultConnectingIOReactor;
import org.apache.http.impl.nio.ssl.SSLClientIOEventDispatch;
import org.apache.http.message.BasicHttpEntityEnclosingRequest;
import org.apache.http.message.BasicHttpRequest;
import org.apache.http.nio.NHttpClientHandler;
import org.apache.http.nio.NHttpConnection;
import org.apache.http.nio.entity.NByteArrayEntity;
import org.apache.http.nio.protocol.BufferingHttpClientHandler;
import org.apache.http.nio.protocol.EventListener;
import org.apache.http.nio.protocol.HttpRequestExecutionHandler;
import org.apache.http.nio.reactor.ConnectingIOReactor;
import org.apache.http.nio.reactor.IOEventDispatch;
import org.apache.http.nio.reactor.IOReactorException;
import org.apache.http.nio.reactor.IOReactorExceptionHandler;
import org.apache.http.nio.reactor.IOReactorStatus;
import org.apache.http.nio.reactor.IOSession;
import org.apache.http.nio.reactor.SessionRequest;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.CoreConnectionPNames;
import org.apache.http.params.HttpParams;
import org.apache.http.protocol.BasicHttpProcessor;
import org.apache.http.protocol.HttpContext;
import org.apache.http.protocol.RequestConnControl;
import org.apache.http.protocol.RequestContent;
import org.apache.http.protocol.RequestExpectContinue;
import org.apache.http.protocol.RequestTargetHost;
import org.apache.http.protocol.RequestUserAgent;

import com.google.acre.Configuration;
import com.google.acre.util.CostCollector;

/*
 * Based on http://www.eamtd.com/IT/a/20090729/072912164110271541.html
 */

public class NHttpClient {
    
    private final HttpParams DEFAULT_HTTP_PARAMS = new BasicHttpParams()
        .setIntParameter(CoreConnectionPNames.SO_TIMEOUT, 
            Configuration.Values.ACRE_REQUEST_MAX_TIME.getInteger())
        .setIntParameter(CoreConnectionPNames.CONNECTION_TIMEOUT, 
            Configuration.Values.ACRE_REQUEST_MAX_TIME.getInteger())
        .setIntParameter(CoreConnectionPNames.SOCKET_BUFFER_SIZE, 512 * 1024)
        .setBooleanParameter(CoreConnectionPNames.STALE_CONNECTION_CHECK, true);
    
    private static final int DEFAULT_MAX_CONNECTIONS = Configuration.Values.ACRE_MAX_ASYNC_CONNECTIONS.getInteger();

    private List<NHttpClientClosure> _requests;
    private DefaultConnectingIOReactor _reactor; 
    private final IOEventDispatch _dispatch;
    private Semaphore _connection_lock;

    private int _max_connections;

    private NHttpClient.NHttpProxyHost _proxy;
    private CostCollector _costCollector;

    public static class NHttpException extends Exception {
        private static final long serialVersionUID = 3381900596614745150L;
        public NHttpException(String msg) {
            super(msg);
        }
        public NHttpException(Throwable t) {
            super(t);
        }
    }

    public static class NHttpTimeoutException extends NHttpException {
        private static final long serialVersionUID = 7838933001286405951L;
        public NHttpTimeoutException() {
            super("Time limit exceeded");
        }
    }

    public static abstract class NHttpProxyHost {
        private String _host;
        private int _port;

        public NHttpProxyHost(String host, int port) {
            _host = host;
            _port = port;
        }

        public String host() {
            return _host;
        }

        public void host(String host) {
            _host = host;
        }

        public int port() {
            return _port;
        }

        public void port(int port) {
            _port = port;
        }
        
        public abstract boolean use_proxy(String url);
    }

    private class NHttpAdaptableSensibleAndLogicalIOEventDispatch implements IOEventDispatch {
        SSLClientIOEventDispatch _ssl_dispatch;
        DefaultClientIOEventDispatch _std_dispatch;

        public NHttpAdaptableSensibleAndLogicalIOEventDispatch(final NHttpClientHandler handler,
                                                               final SSLContext sslcontext,
                                                               final HttpParams params) {
            _ssl_dispatch = new SSLClientIOEventDispatch(handler, sslcontext, params);
            _std_dispatch = new DefaultClientIOEventDispatch(handler, params);
        }

        public void connected(IOSession session) {
            NHttpClientClosure closure = (NHttpClientClosure) 
                session.getAttribute(IOSession.ATTACHMENT_KEY);

            if (closure.ssl() && _proxy != null &&
                _proxy.use_proxy(closure.url().toString())) {
                // For now, do nothing, when we can write, throw up a connect statement

                throw new RuntimeException("SSL over proxy not currently supported");
            } else if (closure.ssl()) {
                _ssl_dispatch.connected(session);
            } else {
                _std_dispatch.connected(session);
            }
        }

        public void disconnected(IOSession session) {
            NHttpClientClosure closure = (NHttpClientClosure) 
                session.getAttribute(IOSession.ATTACHMENT_KEY);

            if (closure.ssl() && _proxy != null &&
                _proxy.use_proxy(closure.url().toString())) {
                throw new RuntimeException("SSL over proxy not currently supported");
            } else if (closure.ssl()) {
                _ssl_dispatch.disconnected(session);
            } else {
                _std_dispatch.disconnected(session);
            }
        }

        public void inputReady(IOSession session) {
            NHttpClientClosure closure = (NHttpClientClosure) 
                session.getAttribute(IOSession.ATTACHMENT_KEY);

            if (closure.ssl() && _proxy != null &&
                _proxy.use_proxy(closure.url().toString())) {
                throw new RuntimeException("SSL over proxy not currently supported");
            } else if (closure.ssl()) {
                _ssl_dispatch.inputReady(session);
            } else {
                _std_dispatch.inputReady(session);
            }
        }

        public void outputReady(IOSession session) {
            NHttpClientClosure closure = (NHttpClientClosure) 
                session.getAttribute(IOSession.ATTACHMENT_KEY);

            if (closure.ssl() && _proxy != null &&
                _proxy.use_proxy(closure.url().toString())) {
                throw new RuntimeException("SSL over proxy not currently supported");
            } else if (closure.ssl()) {
                _ssl_dispatch.outputReady(session);
            } else {
                _std_dispatch.outputReady(session);
            }
        }

        public void timeout(IOSession session) {
            NHttpClientClosure closure = (NHttpClientClosure) 
                session.getAttribute(IOSession.ATTACHMENT_KEY);

            if (closure.ssl() && _proxy != null &&
                _proxy.use_proxy(closure.url().toString())) {
                throw new RuntimeException("SSL over proxy not currently supported");
            } else if (closure.ssl()) {
                _ssl_dispatch.timeout(session);
            } else {
                _std_dispatch.timeout(session);
            }

        }
    }

    private class NHttpClientClosure {
        private URL _url;
        private HttpRequest _request;
        private NHttpClientCallback _callback;
        private HttpResponse _response;
        private boolean _done;
        private long _start_time;
        private long _timeout;
        private SessionRequest _sreq;
        private List<Exception> _exceptions;

        public NHttpClientClosure(URL url, HttpRequest request, NHttpClientCallback callback) {
            _url = url;
            _request = request; 
            _callback = callback;
            _done = false;
            _start_time = System.currentTimeMillis();
            _timeout = 0;
            _sreq = null;
            _exceptions = new ArrayList<Exception>();
        }

        public URL url() {
            return _url;
        }

//        public void url(URL url) {
//            _url = url;
//        }

        public HttpRequest request() {
            return _request;
        }

//        public void request(HttpRequest request) {
//            _request = request;
//        }

        public NHttpClientCallback callback() {
            return _callback;
        }

//        public void callback(NHttpClientCallback callback) {
//            _callback = callback;
//        }

        public HttpResponse response() {
            return _response;
        }

        public void response(HttpResponse response) {
            _response = response;
        }

        public boolean done() {
            return _done;
        }

        public void done(boolean done) {
            _done = done;
        }

        public long start_time() {
            return _start_time;
        }

        public void start_time(long start_time) {
            _start_time = start_time;
        }

        public long timeout() {
            return _timeout;
        }

        public void timeout(long timeout) {
            _timeout = timeout;
        }

        public SessionRequest sreq() {
            return _sreq;
        }

        public void sreq(SessionRequest sreq) {
            _sreq = sreq;
        }

        public boolean ssl() {
            return this.url().getProtocol().equalsIgnoreCase("https");
        }

        public SessionRequest connect(NHttpProxyHost proxy, ConnectingIOReactor reactor) {
            if (!(_connection_lock.tryAcquire()) || this.sreq() != null) {
                return null;
            }

            SessionRequest sreq = null;

            String host = this.url().getHost();
            int port = this.url().getPort() < 0 ? this.url().getDefaultPort() : this.url().getPort(); 
            
            if (proxy == null || !proxy.use_proxy(this.url().toString())) {
                sreq = reactor.connect(new InetSocketAddress(host, port),
                                       null, this, null); 
            } else {
                sreq = reactor.connect(new InetSocketAddress(proxy.host(),
                                                             proxy.port()),
                                       null, this, null); 
            }

            return sreq;
        }

        public List<Exception> exceptions() {
            return _exceptions;
        }
    }

    public static interface NHttpClientCallback {
        public void finished(final URL url, final HttpResponse response);
        public void error(final URL url, final NHttpException e);
    }

    public NHttpClient.NHttpProxyHost proxy() {
        return _proxy;
    }

    public void proxy(NHttpClient.NHttpProxyHost proxy) {
        _proxy = proxy;
    }

    public int max_connections() {
        return _max_connections;
    }

    // NOTE: setting max_connections is actually a non-trivial
    // operation, so if you want to change it, construct a new
    // NHttpClient

    public NHttpClient() {
        this(NHttpClient.DEFAULT_MAX_CONNECTIONS);
    }

    public NHttpClient(int max_connections) {
        _max_connections = max_connections;
        _costCollector = CostCollector.getInstance();

        BasicHttpProcessor httpproc = new BasicHttpProcessor(); 
        httpproc.addInterceptor(new RequestContent()); 
        httpproc.addInterceptor(new RequestTargetHost()); 
        httpproc.addInterceptor(new RequestConnControl()); 
        httpproc.addInterceptor(new RequestUserAgent()); 
        httpproc.addInterceptor(new RequestExpectContinue()); 

        BufferingHttpClientHandler handler = 
            new BufferingHttpClientHandler(httpproc,
                                           new NHttpRequestExecutionHandler(),
                                           new DefaultConnectionReuseStrategy(),
                                           DEFAULT_HTTP_PARAMS); 


        handler.setEventListener(new EventListener() {
                private final static String REQUEST_CLOSURE = "request-closure";
                public void connectionClosed(NHttpConnection conn) {
                    // pass (should we be logging this?)
                }

                public void connectionOpen(NHttpConnection conn) {
                    // pass (should we be logging this?)
                }

                public void connectionTimeout(NHttpConnection conn) {
                    noteException(null, conn);
                }

                void noteException(Exception e, NHttpConnection conn) {
                    HttpContext context = conn.getContext();
                    NHttpClientClosure closure = (NHttpClientClosure)
                        context.getAttribute(REQUEST_CLOSURE);
                    if (closure != null)
                        closure.exceptions().add(e);
                }

                public void fatalIOException(IOException e, NHttpConnection conn) {
                    noteException(e, conn);
                }

                public void fatalProtocolException(HttpException e, NHttpConnection conn) {
                    noteException(e, conn);
                }
            });

        try {
            SSLContext sctx = SSLContext.getInstance("SSL");
            sctx.init(null, null, null);
            _dispatch =
                new NHttpAdaptableSensibleAndLogicalIOEventDispatch(handler,
                                                                    sctx,
                                                                    DEFAULT_HTTP_PARAMS);
        } catch (java.security.KeyManagementException e) {
            throw new RuntimeException(e);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }

        _requests = new ArrayList<NHttpClientClosure>();
        _connection_lock = new Semaphore(_max_connections);

    }

    public void make_reactor() {
        try {
            _reactor = new DefaultConnectingIOReactor(2, DEFAULT_HTTP_PARAMS); 
            _reactor.setExceptionHandler(new IOReactorExceptionHandler() {
                    public boolean handle(IOException e) {
                        return false; 
                    }
                    public boolean handle(RuntimeException e) {
                        return false; 
                    }
                });
        } catch (IOReactorException e) {
            throw new RuntimeException(e);
        }
    }

    public void start() {
        // The reactor can't be restarted if it's shutdown, so generate
        // a new one if we've shutdown or don't have one.
        if (_reactor == null 
            || _reactor.getStatus() == IOReactorStatus.SHUT_DOWN) {
            make_reactor();
        }

        Thread t = new Thread(new Runnable() {
                public void run() {
                    try {
                        _reactor.execute(_dispatch); 
                    } catch (Throwable e) {
                        e.printStackTrace();
                        try {
                            _reactor.shutdown();
                        } catch (IOException ex) {
                            throw new RuntimeException(ex);
                        }
                    }
                }
            }); 

        t.start(); 
    }

    public void stop() {
        if (_reactor != null) {
            try {
                _requests.clear();
                _reactor.shutdown();
                _reactor = null;
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public void fetch(String url, String method, Map<String, String> headers,
                      byte[] body, long timeout, boolean no_redirect, NHttpClientCallback callback) throws NHttpException {
        URL u;
        String path;
        HttpRequest req;

        try {
            u = new URL(url); 
        } catch (MalformedURLException e) {
            throw new NHttpException(e);
        }

        // Proxies expect the entire URL as the path
        if (_proxy == null || !_proxy.use_proxy(url)) {
            path = u.getPath(); 
            if (path.equals("")) {
                path = "/"; 
            }

            if (u.getQuery() != null) {
                path += "?" + u.getQuery(); 
            }
        } else {
            path = url;
        }


        if ((method.equalsIgnoreCase("POST")
            || method.equalsIgnoreCase("PUT")) && body.length > 0) {
            req = new BasicHttpEntityEnclosingRequest(method, path);
            NByteArrayEntity bae = new NByteArrayEntity(body);
            ((HttpEntityEnclosingRequest)req).setEntity(bae);

        } else {
            req = new BasicHttpRequest(method, path);
        }

        if (headers != null) {
            for (Map.Entry<String,String> header : headers.entrySet()) {
                req.addHeader(header.getKey(), header.getValue());
            }
        }

        if (req instanceof HttpEntityEnclosingRequest) req.removeHeaders("Content-Length");
        fetch(u, req, timeout, no_redirect, callback);
    }
                      

    public void fetch(URL url, HttpRequest req, long timeout, boolean no_redirect, NHttpClientCallback callback)
        throws NHttpException {

        // WARNING: no_redirect is not used!
        
        //FIXME(SM): how can we use 'no_redirect' signal here if the client is already established?!
        
        //if (!(url.getProtocol().equalsIgnoreCase("http")))
        //    throw new NHttpException("Unsupported protocol: "+url.getProtocol());

        if (_reactor == null) make_reactor();

        NHttpClientClosure closure = new NHttpClientClosure(url, req, callback); 

        SessionRequest sreq = closure.connect(_proxy, _reactor);
        closure.sreq(sreq);
        closure.timeout(timeout);

        _requests.add(closure);
    }

    public void wait_on_result(AcreResponse res) throws NHttpException {
        wait_on_result(-1L, TimeUnit.MILLISECONDS, res);
    }

    public void wait_on_result(long time, TimeUnit tunit, AcreResponse res) throws NHttpException {

        if (_reactor != null && _reactor.getStatus() != IOReactorStatus.INACTIVE) {
            throw new NHttpException("Can not run wait_on_results while it is already running [current status: " + _reactor.getStatus() + "]");
        }
        
        start();

        long endtime = System.currentTimeMillis() + tunit.toMillis(time);

        int i = 0;
        while (_requests.size() > 0) {
            long pass_start_time = System.currentTimeMillis();
            
            if (i > _requests.size()-1) i = 0;

            if (time != -1L && endtime <= System.currentTimeMillis()) {
                // If we've run out of time, kill off the reactor to
                // close our open connections, and throw an exception
                // to let the caller know we're out of time
                // 
                // XXX should probably use a real exception here
                try {
                    _requests.clear();
                    _reactor.shutdown();
                    throw new NHttpTimeoutException();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }

            NHttpClientClosure closure = _requests.get(i);
            if (!closure.done() && closure.sreq() == null && _connection_lock.availablePermits() > 0) {
                closure.sreq(closure.connect(_proxy, _reactor));
            }

            if (closure.done()) {
                if (closure.response() != null) {
                    closure.callback()
                        .finished(closure.url(), closure.response());
                } else if (closure.exceptions().size() > 0) {
                    closure.exceptions().get(0).printStackTrace();
                    closure.callback()
                        .error(closure.url(), new NHttpException(closure.exceptions().get(0)));
                } else {
                    closure.callback()
                        .error(closure.url(), new NHttpException("Request failed"));
                }
                _requests.remove(i);
                continue;
            } else if (closure.timeout() != 0 &&
                       (closure.start_time() + closure.timeout())
                       <= System.currentTimeMillis()) {
                // We pass a null response to the callback to let it know
                // that things broke
                if (closure.sreq() != null) {
                    closure.sreq().cancel();
                    _connection_lock.release();
                }

                closure.callback().error(closure.url(), new NHttpTimeoutException());
                _requests.remove(i);
                continue;
            }

            
            // Block for 15ms to not eat all the cpu
            try {
                Thread.sleep(15);
            } catch (InterruptedException e) {
                // pass
            }

            _costCollector.collect("auub", System.currentTimeMillis() - pass_start_time);
            i++;
        }
        
        // It's somewhat questionable to stop the reactor when we're done
        // but we can restart it if we need it again.
        stop();
    }

    private class NHttpRequestExecutionHandler 
        implements HttpRequestExecutionHandler {
        private final static String REQUEST_CLOSURE = "request-closure";
        private final static String REQUEST_SENT = "request-sent"; 
        private final static String RESPONSE_RECEIVED = "response-received"; 

        public NHttpRequestExecutionHandler() {
            super(); 
        }

        public void initalizeContext(final HttpContext context, 
                                     final Object attachment) {
            NHttpClientClosure closure = (NHttpClientClosure) attachment;
            context.setAttribute(REQUEST_CLOSURE, closure); 
        }

        public void finalizeContext(final HttpContext context) {
            Object flag = context.getAttribute(RESPONSE_RECEIVED); 
            if (flag == null) {
                NHttpClientClosure closure = (NHttpClientClosure)
                    context.getAttribute(REQUEST_CLOSURE); 

                SessionRequest sreq = closure.sreq();
                sreq.cancel();
                closure.sreq(null);
                closure.response(null);
                closure.done(true);
                // signal completion of the request execution
            }
        }

        public HttpRequest submitRequest(final HttpContext context) {
            NHttpClientClosure closure = (NHttpClientClosure)
                context.getAttribute(REQUEST_CLOSURE); 

            Object flag = context.getAttribute(REQUEST_SENT); 
            if (flag == null) {
                context.setAttribute(REQUEST_SENT, true); 
                closure.start_time(System.currentTimeMillis());
                return closure.request();
            }

            return null; 
        }

        public void handleResponse(final HttpResponse response,
                                    final HttpContext context) {
            NHttpClientClosure closure = (NHttpClientClosure)
                context.getAttribute(REQUEST_CLOSURE); 
            _connection_lock.release();

            // Note that we don't call the callback here. The reason for that
            // is that this function is called from the thread of the reactor
            // which doesn't have access to the TLS where our rhino context is
            // stored. Instead wait_on_result calls the callbacks.
            closure.response(response);
            closure.sreq(null);
            closure.done(true);
            context.setAttribute(RESPONSE_RECEIVED, true); 
        }
    }
}
