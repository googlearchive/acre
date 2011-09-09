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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Date;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;

import org.apache.commons.io.IOUtils;

import com.google.acre.Configuration;
import com.google.acre.servlet.AcreHttpServletRequest;
import com.google.acre.servlet.OneTrueServlet;

public class AcreRequest extends JsConvertable {

    // parsed request headers
    public String request_method;
    public String request_url;
    public String request_base_url;
    public String request_app_url;
    public String server_protocol;
    public String server_name;
    public String request_server_name;
    public int request_server_port;
    public int server_port;
    public String server_host;
    public String server_host_base;
    public String path_info;
    public String request_path_info;
    public String query_string;
    public Map<String, Object> headers;

    // well-known request headers are pre-parsed
    public Object request_body;
    public Map<String, AcreCookie> cookies;

    // information from a previous error
    public AcreExceptionInfo error_info;

    // Acre specific request props
    public String script_id;
    public String script_namespace;

    public String script_name;
    public String freebase_service_url;
    public String freebase_site_host;

    //The hostname of googleapis - usually https://www.googleapis.com
    public String googleapis_host;
    //The Freebase API path - relative to googleapis_host above.
    public String googleapis_freebase;
    //The private api key that acre uses to do internal googleapis calls.
    public String googleapis_key;

    // if non-empty, this overrides the script_path computed from the url
    public String handler_script_path;

    public Date request_start_time;

    public String version;
    public String server;
    
    public boolean trusted;

    public boolean skip_routes;
    // other aspects of request handling
    public String _metaweb_tid;

    // deadline (in msec as returned by System.currentTimeMillis()
    public long _deadline;
    public boolean _has_quotas;
    public int _reentries;
    
    public int _logtype = 0;

    private HttpServletRequest _request;
    
    private static final Pattern hostValidator = Pattern.compile("^[-A-Za-z0-9.:_]+$");

    public static final int _LOG_FirePHP = 0x01;
    public static final int _LOG_JSONBODY = 0x10;

    @SuppressWarnings("unchecked")
    public AcreRequest(AcreHttpServletRequest request) throws IOException {

        _request = request;
        
        request_start_time = new Date();
        headers = new HashMap<String, Object>();
        cookies = new HashMap<String, AcreCookie>();
        version = Configuration.Values.ACRE_VERSION.getValue();
        server = OneTrueServlet.getServer();
        trusted = Configuration.Values.ACRE_TRUSTED_MODE.getBoolean();
        skip_routes = false;
        _metaweb_tid = (String) request.getAttribute("X-Metaweb-TID");

        String urlstr = request.getRequestURL().toString();

        server_name = request.getHeader("X-Forwarded-Host");
        if (server_name == null) server_name = request.getHeader("Host");

        String quotas_str = request.getHeader(HostEnv.ACRE_QUOTAS_HEADER);

        long max_deadline = System.currentTimeMillis() + Configuration.Values.ACRE_REQUEST_MAX_TIME.getInteger();
        if (quotas_str == null) {
            _deadline = max_deadline;
            _has_quotas = false;
        } else {
            Map<String,String> quotas = parseQuotas(quotas_str);
            _has_quotas = true;
            try {
                long deadline = Long.parseLong(quotas.get("td"));
                _deadline = Math.min(max_deadline,deadline);     
            } catch (NumberFormatException e) {
                _deadline = max_deadline;
            }
            _reentries = quotas.containsKey("r") ? Integer.parseInt(quotas.get("r")) : 0;
        }
        
        Matcher m = hostValidator.matcher(server_name);
        if (!m.matches()) {
            throw new IOException("Host name '" + server_name + "' contains invalid characters");
        }
        
        request_method = request.getMethod();

        server_protocol = request.getHeader("X-Forwarded-Proto");
        if (server_protocol == null) server_protocol = request.getScheme();

        request_server_name = request.getHeader("X-Untransformed-Host");
        
        query_string = request.getQueryString();

        StringBuffer b = new StringBuffer();
        b.append(server_protocol);
        b.append("://");
        b.append(request_server_name);
        request_app_url = b.toString();
        request_base_url = request_app_url + "/";
        // XXX - shouldn't we be adding request_server_port here?

        // XXX - shouldn't this be request.getPathInfo() instead?
        b.append((new URL(urlstr)).getPath());
        if (query_string != null) {
            b.append('?');
            b.append(query_string);
        }
        request_url = b.toString();

        if (query_string == null) {
            query_string = "";
        }

        Server sinfo = splitHostAndPort(server_name);
        Server osinfo = splitHostAndPort(request_server_name);

        server_name = sinfo.name;
        server_port = sinfo.port;
        request_server_name = osinfo.name;
        request_server_port = osinfo.port;

        path_info = request.getPathInfo();
        request_path_info = request.getRequestPathInfo();

        String content_type = null;
        for (Enumeration<String> e = request.getHeaderNames(); e.hasMoreElements() ;) {
            String hname = e.nextElement().toLowerCase();
            Enumeration<String> hvalue = request.getHeaders(hname);
            
            Object new_entry = null;
            for (; hvalue.hasMoreElements(); ) {
                String hval = hvalue.nextElement();
                if (hvalue.hasMoreElements() && new_entry == null) {
                    new_entry = new ArrayList<String>();
                    ((ArrayList<String>)new_entry).add(hval);
                } else {
                    if (new_entry == null) {
                        new_entry = hval;
                    } else {
                        ((ArrayList<String>)new_entry).add(hval);
                    }
                }
            }
            if (hname.equalsIgnoreCase("content-type")) {
                if (new_entry instanceof ArrayList) {
                    content_type = (String)((ArrayList<?>) new_entry).get(0);
                } else {
                    content_type = (String)new_entry;
                }
            }
            headers.put(hname, new_entry);

        }

        if (request_method.equals("POST") || request_method.equals("PUT")) {
            // NOTE(SM): we can't use request.getReader() because
            // if a previous servlet in the chain called getParameter 
            // during a POST, jetty calls getInputStream to obtain
            // the parameter and then a call to the reader will throw
            InputStream is = request.getInputStream();

            if (content_type != null &&
                (content_type.startsWith("image/") ||
                content_type.startsWith("application/octet-stream") ||
                 content_type.startsWith("multipart/form-data"))) {
                    byte[] data = IOUtils.toByteArray(is);

                    request_body = new JSBinary();
                    ((JSBinary)request_body).set_data(data);
                    is.close();
                } else { 
                    String encoding = request.getCharacterEncoding();
                    if (encoding == null) encoding = "ISO_8859_1";
                    BufferedReader reader = new BufferedReader(new InputStreamReader(is, encoding));
                    StringBuffer buf = new StringBuffer();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        buf.append(line);
                        buf.append("\n");
                    }
                    String body = buf.toString();
                    reader.close();
                    
                    // this following code is because of this bug in local AppEngine
                    //  http://code.google.com/p/googleappengine/issues/detail?id=5396
                    // which fails to provide a readable getInputStream() on a regular 
                    // urlencoded POST, so we re-encode it ourselves. It's a waste
                    // but it should only occur during develoment.
                    if (body.length() == 0) {
                        Map<String,String[]> params = request.getParameterMap();
                        Set<Entry<String,String[]>> entries = params.entrySet();
                        Iterator<Entry<String,String[]>> iterator = entries.iterator();
                        while (iterator.hasNext()) {
                            Entry<String, String[]> e = iterator.next();
                            buf.append(URLEncoder.encode(e.getKey(),encoding));
                            buf.append('=');
                            buf.append(URLEncoder.encode(e.getValue()[0],encoding));
                            if (iterator.hasNext()) {
                                buf.append('&');
                            }
                        }
                        body = buf.toString();
                    }
                    
                    request_body = body;
                }
        }

        // XXX fix this when figuring out cookies
        Cookie[] cks = request.getCookies();
        if (cks != null) {
            for (Cookie c : cks) {
                if (c.getName().equals("")) continue;
                cookies.put(c.getName(), new AcreCookie(c));
            }
        }

        String user_agent = _request.getHeader("user-agent");
        String log_header = _request.getHeader("x-acre-enable-log");
        if (user_agent != null && user_agent.indexOf("FirePHP") > 0) {
            _logtype = _LOG_FirePHP;
        }
        if (log_header != null) {
            if (!(log_header.toLowerCase().startsWith("firephp"))) {
                _logtype = _logtype | _LOG_JSONBODY;
            } else {
                _logtype = _LOG_FirePHP;
            }
        }
    }

    public void setPathInfo(String pathInfo) {
        path_info = pathInfo;
    }

    public void setQueryString(String queryString) {
        query_string = queryString;
    }
    
    public void setTID(String tid) {
        _metaweb_tid = tid;
    }
            
    public String getLogLevel() {
        String level = _request.getHeader("x-acre-enable-log");
        if (level == null || level.toLowerCase().equals("true") 
            || level.toLowerCase().startsWith("firephp")) {
            if (level != null && level.toLowerCase().startsWith("firephp:")) {
                level = level.substring(8);
            } else {
                level = "info";
            }
        }

        return level;
    }
    
    private Server splitHostAndPort(String sname) {
        Server s;
        int colonpos = sname.indexOf(":");
        if (colonpos > 0) {
            s = new Server(sname.substring(0, colonpos), Integer.parseInt(sname.substring(colonpos+1)));
        } else {
            s = new Server(sname, 80);
        }
        return s;
    }

    private Map<String,String> parseQuotas(String quotas_str) {
        Map<String,String> quotas = new HashMap<String,String>();
        String[] quotas_frags = quotas_str.split(",");
        for (String q : quotas_frags) {
            String[] q_frags = q.split("=");
            if (q_frags.length == 2) {
                quotas.put(q_frags[0], q_frags[1]);
            }
        }
        return quotas;
    }
    
    private class Server {
        String name;
        int port;
        Server(String name, int port) {
            this.name = name;
            this.port = port;
        }
    }
}
