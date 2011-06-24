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

package com.google.acre.appengine.script;

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

import log.Log;

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
import com.google.acre.script.exceptions.JSURLTimeoutError;
import com.google.appengine.api.urlfetch.HTTPHeader;
import com.google.appengine.api.urlfetch.HTTPMethod;
import com.google.appengine.api.urlfetch.HTTPRequest;
import com.google.appengine.api.urlfetch.HTTPResponse;
import com.google.appengine.api.urlfetch.URLFetchService;
import com.google.appengine.api.urlfetch.URLFetchServiceFactory;

public class AppEngineAsyncUrlfetch implements AsyncUrlfetch {

    private final static Log _logger = new Log(AppEngineAsyncUrlfetch.class);    
    
    class AsyncRequest {
        public AsyncRequest(URL url, Future<HTTPResponse> request, Function callback, long start_time, boolean system, boolean log_to_user, String response_encoding) {
            this.url = url;
            this.request = request;
            this.callback = callback;
            this.start_time = start_time;
            this.system = system;
            this.log_to_user = log_to_user;
            this.response_encoding = response_encoding;
        }

        Future<HTTPResponse> request;
        Function callback;
        URL url;
        long start_time;
        boolean system;
        boolean log_to_user;
        String response_encoding;
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
                             boolean system,
                             boolean log_to_user,
                             String response_encoding,
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
        StringBuffer request_header_log = new StringBuffer();
        for (Map.Entry<String,String> entry : headers.entrySet()) {
            req.addHeader(new HTTPHeader(entry.getKey(), entry.getValue()));
            request_header_log.append(entry.getKey() + ": " + entry.getValue() + ", ");
        }

        if (body != null) {
            if (body instanceof JSBinary) {
                req.setPayload(((JSBinary)body).get_data());
            } else if (body instanceof String) {
                req.setPayload(((String)body).getBytes());
            }
        }
        Future<HTTPResponse> futr = _urlfetch_service.fetchAsync(req);
        
        _logger.syslog4j("INFO", "urlfetch.request.async",
                "Method", method,
                "URL", url,
                "Headers", request_header_log);
                
        if (!system && log_to_user) {
            _response.userlog4j("INFO", "urlfetch.request.async",
                                "Method", method,
                                "URL", url,
                                "Headers", request_header_log);
        }
        
        final long start_time = System.currentTimeMillis();
        
        _requests.add(new AsyncRequest(requrl, futr, callback, start_time, system, log_to_user, response_encoding));
    }

    //Return the charset encoding of an HTTPResponse.
    private String getResponseEncoding(HTTPResponse res) { 

        // Default to utf-8
        String encoding = new String("utf-8");

        // We are looking for this header: Content-Type: text/html; charset=utf-8
        for (HTTPHeader header : res.getHeaders()) { 
            if (header.getName().equalsIgnoreCase("content-type")) { 
                for (String part : header.getValue().split(";")) { 

                    String trimmed_part = part.trim();
                    if (trimmed_part.startsWith("charset")) { 
                        encoding = trimmed_part.substring(8);
                    }

                }
            }
        }

        return encoding;
    }


    private Scriptable callback_result(AsyncRequest req, HTTPResponse res) {    

        long waiting_time = System.currentTimeMillis() - req.start_time;

        URL furl = res.getFinalUrl();
        if (furl == null) {
            furl = req.url;
        }

        BrowserCompatSpecFactory bcsf = new BrowserCompatSpecFactory();
        CookieSpec cspec = bcsf.newInstance(null);
        String protocol = furl.getProtocol();
        boolean issecure = ("https".equals(protocol));
        int port = furl.getPort();
        if (port == -1) port = 80;
        CookieOrigin origin = new CookieOrigin(furl.getHost(), port, furl.getPath(), issecure);

        Context ctx = Context.getCurrentContext();
        Scriptable out = ctx.newObject(_scope);
        Scriptable headers = ctx.newObject(_scope);
        Scriptable cookies = ctx.newObject(_scope);

        out.put("status", out, res.getResponseCode());

        try {
            out.put("body", out, new String(res.getContent(), getResponseEncoding(res)));
        } catch (java.io.UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }

        out.put("headers", out, headers);
        out.put("cookies", out, cookies);

        StringBuffer response_header_log = new StringBuffer();
        for (HTTPHeader h : res.getHeaders()) {
            if (h.getName().equalsIgnoreCase("set-cookie")) {
                String set_cookie = h.getValue();
                Matcher m = Pattern.compile("\\s*(([^,]|(,\\s*\\d))+)").matcher(set_cookie);
                while (m.find()) {
                    Header ch = new BasicHeader("Set-Cookie",set_cookie.substring(m.start(),m.end()));
                    try {
                        List<Cookie> pcookies = cspec.parse(ch, origin);
                        for (Cookie c : pcookies) {
                            cookies.put(c.getName(), cookies, new AcreCookie(c).toJsObject(_scope));
                        }
                    } catch (MalformedCookieException e) {
                        throw new RuntimeException(e);
                    }
                }
            }

            headers.put(h.getName(), headers, h.getValue());
            response_header_log.append(h.getName() + ": " + h.getValue() + ", ");
        }

        boolean system = req.system;
        boolean log_to_user = req.log_to_user;
                
        _logger.syslog4j("INFO", "urlfetch.response.async",
                         "URL", furl.toString(),
                         "Status", Integer.toString(res.getResponseCode()),
                         "Headers", response_header_log);
        
        if (system && log_to_user) {
            _response.userlog4j("INFO", "urlfetch.response.async",
                                "URL", furl.toString(),
                                "Status", Integer.toString(res.getResponseCode()),
                                "Headers", response_header_log);
        }
        
        _response.collect((system) ? "asuc":"auuc")
            .collect((system) ? "asuw":"auuw", waiting_time);
        
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
            long pass_start_time = System.currentTimeMillis();
            
            if (i > _requests.size()-1) i = 0;

            if (time != -1 && endtime <= System.currentTimeMillis()) {
                for (AsyncRequest r : _requests) {
                    r.request.cancel(true);
                }
                throw new JSURLTimeoutError("Time limit exceeded").newJSException(_scope);
            }

            AsyncRequest asyncreq = _requests.get(i);
            Future<HTTPResponse> futr = asyncreq.request;
            Function callback = asyncreq.callback;
            if (futr.isCancelled()) {
                JSURLError jse = new JSURLError("Request cancelled");

                callback.call(ctx, _scope, null, new Object[] {
                    asyncreq.url.toString(),
                    jse.toJSError(_scope)
                });
                _requests.remove(i);
                continue;
            }

            try {
                HTTPResponse res = futr.get(10, TimeUnit.MILLISECONDS);
                callback.call(ctx, _scope, null, new Object[] { 
                    asyncreq.url.toString(),
                    callback_result(asyncreq, res) 
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
                    asyncreq.url.toString(),
                    jse.toJSError(_scope)
                });
                _requests.remove(i);
                continue;
            } catch (InterruptedException e) {
                JSURLError jse = new JSURLError(e.getMessage());

                callback.call(ctx, _scope, null, new Object[] {
                    asyncreq.url.toString(),
                    jse.toJSError(_scope)
                });
                _requests.remove(i);
                continue;
            }

            _response.collect("auub", System.currentTimeMillis() - pass_start_time);
            i++;
        }
    }
}
