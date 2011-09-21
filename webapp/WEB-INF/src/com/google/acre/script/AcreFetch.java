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
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;

import log.Log;

import org.apache.commons.io.IOUtils;
import org.apache.http.Header;
import org.apache.http.HeaderElement;
import org.apache.http.HttpEntity;
import org.apache.http.HttpHost;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.client.params.AllClientPNames;
import org.apache.http.client.params.CookiePolicy;
import org.apache.http.conn.ClientConnectionManager;
import org.apache.http.cookie.Cookie;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.BasicCookieStore;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.params.HttpParams;

import com.google.acre.Configuration;
import com.google.acre.Statistics;
import com.google.acre.script.exceptions.AcreURLFetchException;
import com.google.acre.util.http.HttpPropFind;
import com.google.acre.util.CostCollector;

/**
 *   This represents a URL fetch from Acre.
 *   It has some similarities to AcreRequest but is different enough
 *   for a separate class.
 */
public class AcreFetch extends JsConvertable {

    private final static Log _logger = new Log(AcreFetch.class);    
    
    private static String ACRE_METAWEB_API_ADDR = Configuration.Values.ACRE_METAWEB_API_ADDR.getValue();
    private static String ACRE_FREEBASE_SITE_ADDR = Configuration.Values.ACRE_FREEBASE_SITE_ADDR.getValue();

    public String request_method;
    public String request_url;
    public HashMap<String, String> request_headers;
    public HashMap<String, AcreCookie> request_cookies;
    public Object request_body;

    public int status;
    public String status_text;
    public HashMap<String, String> headers;
    public Object body;
    public HashMap<String, AcreCookie> cookies;

    public String content_type;
    public String content_type_charset;

    private AcreResponse _acre_response;
    private long _deadline;
    private int _reentries;
    private boolean _internal;
    private ClientConnectionManager _connectionManager;
    private CostCollector _costCollector;
    
    public AcreFetch(String url, String method, long deadline, int reentries, AcreResponse response, ClientConnectionManager connectionManager) {
        request_url = url;
        request_method = method;
        _deadline = deadline;
        _reentries = reentries;
        _internal = isInternal(url);
        _acre_response = response;
        _connectionManager = connectionManager;
        _costCollector = CostCollector.getInstance();

        request_headers = new HashMap<String, String>();
        request_body = null;
        request_cookies = new HashMap<String, AcreCookie>();

        status = -1;
        headers = new HashMap<String, String>();
        cookies = new HashMap<String, AcreCookie>();

        body = null;
        content_type = null;
        content_type_charset = null;
    }

    /*
     * Check to see if the URL to be fetched should go thru a proxy or not
     */
    private static boolean isInternal(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            return (ACRE_METAWEB_API_ADDR.equals(host) || ACRE_FREEBASE_SITE_ADDR.equals(host));
        } catch (URISyntaxException e) {
            // if the url parsing threw, it's safer to consider it an external URL
            // and let the proxy do the guarding job
            return false;
        }
    }

    // XXX this is duplicated in AcreRequest and here.
    // should share it, but not way off in some utility library.
    // note that the pattern in UrlUtil.java is incorrect.
    private static Pattern contentTypeCharsetPattern = Pattern.compile("^([^;]+); charset=['\"]?([^;'\"]+)['\"]?");

    @SuppressWarnings("boxing")
    public void fetch(boolean system, String response_encoding, boolean log_to_user, boolean no_redirect) {
        
        if (request_url.length() > 2047) {
            throw new AcreURLFetchException("fetching URL failed - url is too long");
        }

        DefaultHttpClient client = new DefaultHttpClient(_connectionManager, null);
        
        HttpParams params = client.getParams();
        
        // pass the deadline down to the invoked service.
        // this will be ignored unless we are fetching from another
        // acre server.
        // note that we may send a deadline that is already passed:
        // it's not our job to throw here since we don't know how
        // the target service will interpret the quota header.
        // NOTE: this is done *after* the user sets the headers to overwrite
        // whatever settings they might have tried to change for this value
        // (which could be a security hazard)
        long sub_deadline = (HostEnv.LIMIT_EXECUTION_TIME) ? _deadline - HostEnv.SUBREQUEST_DEADLINE_ADVANCE : HostEnv.ACRE_URLFETCH_TIMEOUT;
        int reentries = _reentries + 1;
        request_headers.put(HostEnv.ACRE_QUOTAS_HEADER, "td=" + sub_deadline + ",r=" + reentries);
        
        // if this is not an internal call, we need to invoke the call thru a proxy
        if (!_internal) {
            // XXX No sense wasting the resources to gzip inside the network.
            // XXX seems that twitter gets upset when we do this
            /*
            if (!request_headers.containsKey("accept-encoding")) {
                request_headers.put("accept-encoding", "gzip");
            }
            */
            String proxy_host = Configuration.Values.HTTP_PROXY_HOST.getValue();
            int proxy_port = -1;
            if (!(proxy_host.length() == 0)) {
                proxy_port = Configuration.Values.HTTP_PROXY_PORT.getInteger();
                HttpHost proxy = new HttpHost(proxy_host, proxy_port, "http");
                params.setParameter(AllClientPNames.DEFAULT_PROXY,proxy);
            }
        }

        params.setParameter(AllClientPNames.COOKIE_POLICY, CookiePolicy.BROWSER_COMPATIBILITY);

        // in msec

        long timeout = _deadline - System.currentTimeMillis();
        if (timeout < 0) timeout = 0;
        params.setParameter(AllClientPNames.CONNECTION_TIMEOUT,(int) timeout);
        params.setParameter(AllClientPNames.SO_TIMEOUT,(int) timeout);

        // we're not streaming the request so this should be a win.
        params.setParameter(AllClientPNames.TCP_NODELAY, true);

        // set the encoding of our POST payloads to UTF-8
        params.setParameter(AllClientPNames.HTTP_CONTENT_CHARSET,"UTF-8");

        BasicCookieStore cstore = new BasicCookieStore();
        for (AcreCookie cookie : request_cookies.values()) {
            cstore.addCookie(cookie.toClientCookie());
        }
        client.setCookieStore(cstore);

        HttpRequestBase method;

        HashMap<String, String> logmsg = new HashMap<String, String>();
        logmsg.put("Method", request_method);
        logmsg.put("URL", request_url);

        params.setParameter(AllClientPNames.HANDLE_REDIRECTS, !no_redirect);
        logmsg.put("Redirect", Boolean.toString(!no_redirect));
        
        try {
            if (request_method.equals("GET")) {
                method = new HttpGet(request_url);
            } else if (request_method.equals("POST"))  {
                method = new HttpPost(request_url);
            } else if (request_method.equals("HEAD")) {
                method = new HttpHead(request_url);
            } else if (request_method.equals("PUT")) {
                method = new HttpPut(request_url);
            } else if (request_method.equals("DELETE")) {
                method = new HttpDelete(request_url);
            } else if (request_method.equals("PROPFIND")) {
                method = new HttpPropFind(request_url);
            } else {
                throw new AcreURLFetchException("Failed: unsupported (so far) method " + request_method);
            }
            method.getParams().setBooleanParameter(AllClientPNames.USE_EXPECT_CONTINUE,false);
        } catch (java.lang.IllegalArgumentException e) {
            throw new AcreURLFetchException("Unable to fetch URL; this is most likely an issue with URL encoding.");
        } catch (java.lang.IllegalStateException e) {
            throw new AcreURLFetchException("Unable to fetch URL; possibly an illegal protocol?");
        }

        StringBuffer request_header_log = new StringBuffer();
        for (Map.Entry<String,String> header : request_headers.entrySet()) {
            String key = header.getKey();
            String value = header.getValue();

            // XXX should suppress cookie headers?
            // content-type and length?

            if ("content-type".equalsIgnoreCase(key)) {
                Matcher m = contentTypeCharsetPattern.matcher(value);
                if (m.find()) {
                    content_type = m.group(1);
                    content_type_charset = m.group(2);
                } else {
                    content_type_charset = "utf-8";
                }
                method.addHeader(key, value);
            } else if ("content-length".equalsIgnoreCase(key)) {
                // ignore user-supplied content-length, which is
                // probably wrong due to chars vs bytes and is
                // redundant anyway
                ArrayList<String> msg = new ArrayList<String>();
                msg.add("User-supplied content-length header is ignored");
                _acre_response.log("warn", msg);
            } else if ("user-agent".equalsIgnoreCase(key)) {
                params.setParameter(AllClientPNames.USER_AGENT, value);
            } else {
                method.addHeader(key, value);
            }
            if (!("x-acre-auth".equalsIgnoreCase(key))) {
                request_header_log.append(key + ": " + value + "\r\n");
            }
        }
        logmsg.put("Headers", request_header_log.toString());

        // XXX need more detailed error checking
        if (method instanceof HttpEntityEnclosingRequestBase &&
            request_body != null) {

            HttpEntityEnclosingRequestBase em = (HttpEntityEnclosingRequestBase) method;
            try {
                if (request_body instanceof String) {
                    StringEntity ent = new StringEntity((String)request_body, content_type_charset);
                    em.setEntity(ent);
                } else if (request_body instanceof JSBinary) {
                    ByteArrayEntity ent = new ByteArrayEntity(((JSBinary)request_body).get_data());
                    em.setEntity(ent);
                }
            } catch (UnsupportedEncodingException e) {
                throw new AcreURLFetchException("Failed to fetch URL. " +
                                       " - Unsupported charset: " + content_type_charset);
            }
        }

        if (!system && log_to_user) {
            ArrayList<Object> msg = new ArrayList<Object>();
            msg.add("urlfetch request");
            msg.add(logmsg);
            _acre_response.log("debug", msg);
        }
        _logger.debug("urlfetch.request", logmsg);

        long startTime = System.currentTimeMillis();

        try {
            // this sends the http request and waits
            HttpResponse hres = client.execute(method);
            status = hres.getStatusLine().getStatusCode();
            HashMap<String, String> res_logmsg = new HashMap<String, String>();
            res_logmsg.put("URL", request_url);
            res_logmsg.put("Status", ((Integer)status).toString());

            Header content_type_header = null;

            // translate response headers
            StringBuffer response_header_log = new StringBuffer();
            Header[] rawheaders = hres.getAllHeaders();
            for (Header rawheader : rawheaders) {
                String headername = rawheader.getName().toLowerCase();
                if (headername.equalsIgnoreCase("content-type")) {
                    content_type_header = rawheader;
                    // XXX should strip everything after ;
                    content_type = rawheader.getValue();

                    // XXX don't set content_type_parameters, deprecated?
                } else if (headername.equalsIgnoreCase("x-metaweb-cost")) {
                    _costCollector.merge(rawheader.getValue());
                } else if (headername.equalsIgnoreCase("x-metaweb-tid")) {
                    res_logmsg.put("ITID", rawheader.getValue());
                }

                headers.put(headername, rawheader.getValue());
                response_header_log.append(headername + ": " + rawheader.getValue() + "\r\n");
            }

            res_logmsg.put("Headers", response_header_log.toString());

            if (!system && log_to_user) {
                ArrayList<Object> msg = new ArrayList<Object>();
                msg.add("urlfetch response");
                msg.add(res_logmsg);
                _acre_response.log("debug", msg);
            }

            _logger.debug("urlfetch.response", res_logmsg);

            // read cookies
            for (Cookie c : cstore.getCookies()) {
                cookies.put(c.getName(), new AcreCookie(c));
            }

            // get body encoding

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
            HttpEntity ent = hres.getEntity();
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

                long firstByteTime = 0;
                long endTime = 0;
                if (content_type != null &&
                    (content_type.startsWith("image/") ||
                     content_type.startsWith("application/octet-stream") ||
                     content_type.startsWith("multipart/form-data"))) {
                    // HttpClient's InputStream doesn't support mark/reset, so
                    // wrap it with one that does.
                    BufferedInputStream bufis = new BufferedInputStream(res_stream);
                    bufis.mark(2);
                    bufis.read();
                    firstByteTime = System.currentTimeMillis();
                    bufis.reset();
                    byte[] data = IOUtils.toByteArray(bufis);

                    endTime = System.currentTimeMillis();
                    body = new JSBinary();
                    ((JSBinary)body).set_data(data);

                    try {
                        if (res_stream != null) {
                            res_stream.close();
                        }
                    } catch (IOException e) {
                        // ignore
                    }
                } else if (res_stream == null || charset == null) {
                    firstByteTime = endTime = System.currentTimeMillis();
                    body = "";
                } else {
                    StringWriter writer = new StringWriter();
                    Reader reader = new InputStreamReader(res_stream, charset);
                    int i = reader.read();
                    firstByteTime = System.currentTimeMillis();
                    writer.write(i);
                    IOUtils.copy(reader, writer);
                    endTime = System.currentTimeMillis();
                    body = writer.toString();

                    try {
                        reader.close();
                        writer.close();
                    } catch (IOException e) {
                        // ignore
                    }
                }

                long waitingTime = firstByteTime - startTime;
                long readingTime = endTime - firstByteTime;

                _logger.debug("urlfetch.timings","waiting time: " + waitingTime + "ms");
                _logger.debug("urlfetch.timings","reading time: " + readingTime + "ms");

                Statistics.instance().collectUrlfetchTime(startTime, firstByteTime, endTime);

                _costCollector.collect((system) ? "asuc":"auuc")
                    .collect((system) ? "asuw":"auuw", waitingTime)
                    .collect((system) ? "asub":"auub", waitingTime);
            }
        } catch (IllegalArgumentException e) {
            Throwable cause = e.getCause();
            if (cause == null) cause = e;
            throw new AcreURLFetchException("failed to fetch URL. " + " - Request Error: " + cause.getMessage());
        } catch (IOException e) {
            Throwable cause = e.getCause();
            if (cause == null) cause = e;
            throw new AcreURLFetchException("Failed to fetch URL. " + " - Network Error: " + cause.getMessage());
        } catch (RuntimeException e) {
            Throwable cause = e.getCause();
            if (cause == null) cause = e;
            throw new AcreURLFetchException("Failed to fetch URL. " + " - Network Error: " + cause.getMessage());
        } finally {
            method.abort();
        }
    }
}
