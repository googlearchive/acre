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

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringWriter;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;

import org.apache.commons.io.IOUtils;
import org.apache.http.Header;
import org.apache.http.HeaderElement;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.cookie.Cookie;
import org.apache.http.cookie.CookieOrigin;
import org.apache.http.cookie.CookieSpec;
import org.apache.http.cookie.MalformedCookieException;
import org.apache.http.impl.cookie.BrowserCompatSpecFactory;
import org.apache.http.message.BasicHeader;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;

import com.google.acre.Configuration;
import com.google.acre.Statistics;
import com.google.acre.logging.AcreLogger;
import com.google.acre.script.exceptions.JSURLTimeoutError;

public class NHttpAsyncUrlfetch implements AsyncUrlfetch {
    
    private final static AcreLogger _logger = new AcreLogger(NHttpAsyncUrlfetch.class);    
    
    private AcreResponse _response;
    private Scriptable _scope;
    private NHttpClient _nhttp;

    public NHttpAsyncUrlfetch(AcreResponse response, Scriptable scope) {
        this();
        _response = response;
        _scope = scope;
    }

    // Note It's easier to just call this with introspection
    // and then set the _scope and _response variables after instantiation
    public NHttpAsyncUrlfetch() {
        _nhttp = new NHttpClient(Configuration.Values.ACRE_MAX_ASYNC_CONNECTIONS.getInteger());

        String proxy_host = Configuration.Values.HTTP_PROXY_HOST.getValue();
        Integer proxy_port = null;
        if (!(proxy_host.length() == 0)) {
            proxy_port = Configuration.Values.HTTP_PROXY_PORT.getInteger();
            NHttpClient.NHttpProxyHost proxy = 
                new NHttpClient.NHttpProxyHost(proxy_host, proxy_port) {
                    public boolean use_proxy(String surl) {
                        String ACRE_METAWEB_API_ADDR = Configuration.Values.ACRE_METAWEB_API_ADDR.getValue();
                        String ACRE_FREEBASE_SITE_ADDR = Configuration.Values.ACRE_FREEBASE_SITE_ADDR.getValue();

                        try {
                            URL url = new URL(surl);
                            String host = url.getHost();
                            return !(ACRE_METAWEB_API_ADDR.equals(host) || ACRE_FREEBASE_SITE_ADDR.equals(host));
                        } catch (MalformedURLException e) {
                            // if the url parsing threw, it's safer to consider it 
                            // an external URL and let the proxy do the guarding job
                            return true;
                        }
                    }
                };
            _nhttp.proxy(proxy);
        }
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

    private static final Pattern CT_RE =
        Pattern.compile("^([^;]+); charset=['\"]?([^;'\"]+)['\"]?");    
    
    public void make_request(String url,
                             String method,
                             long timeout,
                             Map<String, String> headers,
                             Object body,
                             final boolean system,
                             final boolean log_to_user,
                             final String response_encoding,
                             final Function callback) {

        String content_charset = "UTF-8";

        StringBuffer request_header_log = new StringBuffer();
        if (headers != null) {
            for (Map.Entry<String,String> header : headers.entrySet()) {
                String key = header.getKey();
                String value = header.getValue();

                if ("content-type".equalsIgnoreCase(key)) {
                    Matcher m = CT_RE.matcher(value);
                    if (m.find()) {
                        content_charset = m.group(2);
                    }
                } else if ("content-length".equalsIgnoreCase(key)) {
                    // skip it, since it's probably wrong and we
                    // calculate it correctly anyway
                    headers.remove(key);
                } else if ("user-agent".equalsIgnoreCase(key)) {
                    // XXX do we need to do anything special here?
                }

                if (!("x-acre-auth".equalsIgnoreCase(key))) {
                    request_header_log.append(key + ": " + value + "\r\n");
                }
            }
        }

        byte[] rbody = null;
        if (body != null) {
            if (body instanceof JSBinary) {
                rbody = ((JSBinary)body).get_data();
            } else if (body instanceof String) {
                try {
                    rbody = ((String)body).getBytes(content_charset);
                } catch (UnsupportedEncodingException e) {
                    throw new RuntimeException(e);
                }
            }
            // XXX should it be possible to not include content-length?
            headers.put("content-length", Integer.toString(rbody.length));
            request_header_log.append("content-length: " +
                                      Integer.toString(rbody.length)+"\r\n");
        }
        
        String httpreqhdr = request_header_log.toString();
        _logger.syslog4j("DEBUG", "urlfetch.request.async",
                         "Method", method,
                         "URL", url,
                         "Headers", httpreqhdr);

        if (!system && log_to_user) {
            _response.userlog4j("DEBUG", "urlfetch.request.async",
                                "Method", method,
                                "URL", url,
                                "Headers", httpreqhdr);
        }
        
        // XXX this is time the request was initiated, not necessarily the
        // time it was actually dispatched
        final long start_time = System.currentTimeMillis();
        try {
            _nhttp.fetch(url, method, headers, rbody, timeout,
                         new NHttpClient.NHttpClientCallback() {
                             public void finished(final URL url, 
                                                  final HttpResponse res) {
                                 Context ctx = Context.getCurrentContext();
                                 callback.call(ctx, _scope, null,
                                               new Object[] {
                                                   url.toString(),
                                                   callback_result(start_time, url, res, system, log_to_user, response_encoding)
                                               });
                             }

                             public void error(final URL url,
                                               final NHttpClient.NHttpException e) {
                                 Context ctx = Context.getCurrentContext();
                                 
                                 Throwable cause = e.getCause();
                                 if (cause == null) {
                                     cause = e;
                                 }
                                 JSURLError jse = new JSURLError(cause.getMessage());

                                 callback.call(ctx, _scope, null, new Object[] {
                                         url.toString(),
                                         jse.toJSError(_scope)
                                     });
                             }
                         });
        } catch (NHttpClient.NHttpException e) {
            Throwable cause = e.getCause();
            if (cause == null) {
                cause = e;
            }

            throw new JSURLError(cause.getMessage()).newJSException(_scope);
        }

    }

    private Scriptable callback_result(long start_time, URL url, HttpResponse res, boolean system, boolean log_to_user, String response_encoding) {
        BrowserCompatSpecFactory bcsf = new BrowserCompatSpecFactory();
        CookieSpec cspec = bcsf.newInstance(null);
        String protocol = url.getProtocol();
        boolean issecure = ("https".equals(protocol));
        int port = url.getPort();
        if (port == -1) port = 80;
        CookieOrigin origin = new CookieOrigin(url.getHost(), port,
                                               url.getPath(), issecure);

        Object body = "";
        int status = res.getStatusLine().getStatusCode();

        Context ctx = Context.getCurrentContext();
        Scriptable out = ctx.newObject(_scope);
        Scriptable headers = ctx.newObject(_scope);
        Scriptable cookies = ctx.newObject(_scope);

        out.put("status", out, status);
        out.put("headers", out, headers);
        out.put("cookies", out, cookies);

        Header content_type_header = null;

        StringBuffer response_header_log = new StringBuffer();
        for (Header h : res.getAllHeaders()) {
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
            } else  if (h.getName().equalsIgnoreCase("content-type")) {
                content_type_header = h;
            }

            response_header_log.append(h.getName() + ": " + h.getValue() + "\r\n");
            headers.put(h.getName(), headers, h.getValue());
        }

        String charset = null;
        if (content_type_header != null) {
            HeaderElement values[] = content_type_header.getElements();
            if (values.length == 1) {
                NameValuePair param = values[0].getParameterByName("charset");
                if (param != null) {
                    charset = param.getValue();
                }
            }
        }
            
        if (charset == null) charset = response_encoding;
        
        // read body
        HttpEntity ent = res.getEntity();
        try {
            if (ent != null) {
                InputStream res_stream = ent.getContent();
                Header cenc = ent.getContentEncoding();
                if (cenc != null && res_stream != null) {
                    HeaderElement[] codecs = cenc.getElements();
                    for (HeaderElement codec : codecs) {
                        if (codec.getName().equalsIgnoreCase("gzip")) {
                            res_stream = new GZIPInputStream(res_stream);
                        }
                    }
                }

                long first_byte_time = 0;
                long end_time = 0;
                if (content_type_header != null && 
                    (content_type_header.getValue().startsWith("image/") ||
                     content_type_header.getValue().startsWith("application/octet-stream") ||
                     content_type_header.getValue().startsWith("multipart/form-data"))) {
                    // HttpClient's InputStream doesn't support mark/reset, so
                    // wrap it with one that does.
                    BufferedInputStream bufis = new BufferedInputStream(res_stream);
                    bufis.mark(2);
                    bufis.read();
                    first_byte_time = System.currentTimeMillis();
                    bufis.reset();
                    byte[] data = IOUtils.toByteArray(bufis);

                    end_time = System.currentTimeMillis();
                    body = new JSBinary();
                    ((JSBinary)body).set_data(data);

                    try {
                        res_stream.close();
                    } catch (IOException e) {
                        // ignore
                    }
                } else if (res_stream == null || charset == null) {
                    first_byte_time = end_time = System.currentTimeMillis();
                    body = "";
                } else {
                    StringWriter writer = new StringWriter();
                    Reader reader = new InputStreamReader(res_stream, charset);
                    int i = reader.read();
                    first_byte_time = System.currentTimeMillis();
                    writer.write(i);
                    IOUtils.copy(reader, writer);
                    end_time = System.currentTimeMillis();
                    body = writer.toString();

                    try {
                        reader.close();
                        writer.close();
                    } catch (IOException e) {
                        // ignore
                    }
                }

                long reading_time = end_time - first_byte_time;
                long waiting_time = first_byte_time - start_time;

                String httprephdr = response_header_log.toString();
                // XXX need to log start-time of request
                _logger.syslog4j("DEBUG", "urlfetch.response.async",
                                 "URL", url.toString(),
                                 "Status", Integer.toString(status),
                                 "Headers", httprephdr,
                                 "Reading time", reading_time,
                                 "Waiting time", waiting_time);

                if (system && log_to_user) {
                    _response.userlog4j("DEBUG", "urlfetch.response.async",
                                        "URL", url.toString(),
                                        "Status", Integer.toString(status),
                                        "Headers", httprephdr);

                }
                

                // XXX seems like AcreResponse should be able to use
                // the statistics object to generate x-metaweb-cost
                // given a bit of extra information

                Statistics.instance().collectUrlfetchTime(start_time,
                                                          first_byte_time,
                                                          end_time);

                _response.collect((system) ? "asuc":"auuc")
                    .collect((system) ? "asuw":"auuw", waiting_time);
                
            }


        } catch (IOException e) {
            throw new RuntimeException(e);
        }
                         
        out.put("body", out, body);

        return out;
    }

    public void wait_on_result(long time, TimeUnit tunit) {
        try {
            _nhttp.wait_on_result(time, tunit);
        } catch (NHttpClient.NHttpTimeoutException e) {
            _nhttp.stop();
            throw new JSURLTimeoutError(e.getMessage()).newJSException(_scope);
        } catch (NHttpClient.NHttpException e) {
            _nhttp.stop();
            throw new JSURLError(e.getMessage()).newJSException(_scope);
        }
    }

    public void wait_on_result() {
        wait_on_result(-1, TimeUnit.MILLISECONDS);
    }
}
