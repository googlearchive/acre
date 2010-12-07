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

import static com.google.appengine.api.urlfetch.FetchOptions.Builder.disallowTruncate;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.http.Header;
import org.apache.http.cookie.Cookie;
import org.apache.http.cookie.CookieOrigin;
import org.apache.http.cookie.CookieSpec;
import org.apache.http.cookie.MalformedCookieException;
import org.apache.http.impl.cookie.BrowserCompatSpecFactory;
import org.apache.http.message.BasicHeader;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;

import com.google.acre.script.AcreCookie;
import com.google.acre.script.AcreResponse;
import com.google.acre.script.AsyncUrlfetch;
import com.google.acre.script.JSBinary;
import com.google.acre.script.JSURLError;
import com.google.appengine.api.urlfetch.HTTPHeader;
import com.google.appengine.api.urlfetch.HTTPMethod;
import com.google.appengine.api.urlfetch.HTTPRequest;
import com.google.appengine.api.urlfetch.HTTPResponse;
import com.google.appengine.api.urlfetch.URLFetchService;
import com.google.appengine.api.urlfetch.URLFetchServiceFactory;

public class AppEngineAsyncUrlfetch implements AsyncUrlfetch {

    class AsyncRequest {
        public AsyncRequest(URL url, Future<HTTPResponse> request, Function callback) {
            _url = url;
            _request = request;
            _callback = callback;
        }

        private Future<HTTPResponse> _request;
        private Function _callback;
        private URL _url;

        public Future<HTTPResponse> request() {
            return _request;
        }

        public void request(Future<HTTPResponse> futr) {
            _request = futr;
        }

        public Function callback() {
            return _callback;
        }

        public void callback(Function cb) {
            _callback = cb;
        }

        public URL url() {
            return _url;
        }

        public void url(URL url) {
            _url = url;
        }
    }

    private AcreResponse _response;
    private Scriptable _scope;
    private URLFetchService _urlfetch_service;
    private List<AsyncRequest> _requests;
       
    public AppEngineAsyncUrlfetch(AcreResponse response, Scriptable scope) {
        _response = response;
        _scope = scope;
        _urlfetch_service = URLFetchServiceFactory.getURLFetchService();
        _requests = new ArrayList<AsyncRequest>();
    }

    // Note It's easier to just call this with introspection
    // and then set the _scope and _response variables after instatiation
    // sadly a constructor can't seem to call a constructor to cut and
    // paste for great victory
    public AppEngineAsyncUrlfetch() {
        _urlfetch_service = URLFetchServiceFactory.getURLFetchService();
        _requests = new ArrayList<AsyncRequest>();
    }

    public AcreResponse response() {
        return _response;
    }

    public void response(AcreResponse res) {
        _response = res;
    }

    public Scriptable scope() {
        return _scope;
    }

    public void scope(Scriptable scope) {
        _scope = scope;
    }

    public void make_request(String url,
                             String method,
                             long timeline,
                             Map<String, String> headers,
                             Object body,
                             Function callback) {
        URL requrl;
        try {
            requrl = new URL(url);
        } catch (MalformedURLException e) {
            throw new JSURLError("Malformed URL: " + url).newJSException(_scope);
        }

        Double dbl_deadline = (new Long(timeline).doubleValue())/1000;

        HTTPRequest req = new HTTPRequest(requrl, HTTPMethod.valueOf(method),
                                          disallowTruncate()
                                          .setDeadline(dbl_deadline));
        for (Map.Entry<String,String> entry : headers.entrySet()) {
            req.addHeader(new HTTPHeader(entry.getKey(), entry.getValue()));
        }

        if (body != null) {
            if (body instanceof JSBinary) {
                req.setPayload(((JSBinary)body).get_data());
            } else if (body instanceof String) {
                req.setPayload(((String)body).getBytes());
            }
        }
        Future<HTTPResponse> futr = _urlfetch_service.fetchAsync(req);
        
        _requests.add(new AsyncRequest(requrl, futr, callback));
    }

    private Scriptable callback_result(URL init_url, HTTPResponse res) {
        URL furl = res.getFinalUrl();
        if (furl == null) {
            furl = init_url;
        }

        BrowserCompatSpecFactory bcsf = new BrowserCompatSpecFactory();
        CookieSpec cspec = bcsf.newInstance(null);
        String protocol = furl.getProtocol();
        boolean issecure = false;
        if (protocol != null)
            issecure = (protocol.equals("https") ? true : false);
        int port = furl.getPort();
        if (port == -1) port = 80;
        CookieOrigin origin = new CookieOrigin(furl.getHost(), port,
                                               furl.getPath(), issecure);

        Context ctx = Context.getCurrentContext();
        Scriptable out = ctx.newObject(_scope);
        Scriptable headers = ctx.newObject(_scope);
        Scriptable cookies = ctx.newObject(_scope);

        out.put("status", out, res.getResponseCode());
        out.put("body", out, new String(res.getContent()));
        out.put("headers", out, headers);
        out.put("cookies", out, cookies);

        for (HTTPHeader h : res.getHeaders()) {
            if (h.getName().equalsIgnoreCase("set-cookie")) {
                String set_cookie = h.getValue();
                Matcher m = Pattern.compile("\\s*(([^,]|(,\\s*\\d))+)")
                    .matcher(set_cookie);
                while (m.find()) {
                    Header ch = new BasicHeader("Set-Cookie",
                                                set_cookie.substring(m.start(),
                                                                     m.end()));
                    try {
                        List<Cookie> pcookies = cspec.parse(ch, origin);
                        for (Cookie c : pcookies) {
                            cookies.put(c.getName(), cookies,
                                        new AcreCookie(c).toJsObject(_scope));
                        }
                    } catch (MalformedCookieException e) {
                        throw new RuntimeException(e);
                    }
                }
            }

            headers.put(h.getName(), headers, h.getValue());
        }

        return out;
    }

    public void wait_on_result() {
        wait_on_result(-1, TimeUnit.MILLISECONDS);
    }

    public void wait_on_result(long time, TimeUnit tunit) {
        int i = 0;
        long endtime = System.currentTimeMillis() + tunit.toMillis(time);

        Context ctx = Context.getCurrentContext();
        while (_requests.size() > 0) {
            if (i > _requests.size()-1) i = 0;

            if (time != -1 && endtime <= System.currentTimeMillis()) {
                for (AsyncRequest r : _requests) {
                    r.request().cancel(true);
                }
                throw new JSURLError("Time limit exceeded").newJSException(_scope);
            }

            AsyncRequest asyncreq = _requests.get(i);
            Future<HTTPResponse> futr = asyncreq.request();
            Function callback = asyncreq.callback();
            if (futr.isCancelled()) {
                _requests.remove(i);
                JSURLError jse = new JSURLError("Request cancelled");

                callback.call(ctx, _scope, null, new Object[] {
                        asyncreq.url().toString(),
                        jse.toJSError(_scope)
                    });
                continue;
            }

            try {
                HTTPResponse res = futr.get(10, TimeUnit.MILLISECONDS);
                callback.call(ctx, _scope, null,
                              new Object[] { 
                                  asyncreq.url().toString(),
                                  callback_result(asyncreq.url(), res) 
                              });
                _requests.remove(i);
                continue;
            } catch (TimeoutException e) {
                // This is timeout on the futr.get() call, not a request timeout
            } catch (CancellationException e) {
                // pass, handled by isCancelled
            } catch (ExecutionException e) {
                JSURLError jse = new JSURLError(e.getMessage());
                
                callback.call(ctx, _scope, null, new Object[] {
                        asyncreq.url().toString(),
                        jse.toJSError(_scope)
                    });
            } catch (InterruptedException e) {
                                JSURLError jse = new JSURLError(e.getMessage());
                
                                callback.call(ctx, _scope, null, new Object[] {
                                        asyncreq.url().toString(),
                                        jse.toJSError(_scope)
                });
            }

            i++;
        }
    }
}
