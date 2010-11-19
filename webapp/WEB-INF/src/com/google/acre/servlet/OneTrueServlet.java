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


package com.google.acre.servlet;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.apache.log4j.MDC;

import com.google.acre.Configuration;
import com.google.acre.Statistics;
import com.google.acre.util.Supervisor;
import com.google.util.TIDGenerator;
import com.google.util.logging.MetawebLogger;

public class OneTrueServlet extends javax.servlet.http.HttpServlet implements javax.servlet.Servlet {
    
    protected static final MetawebLogger _logger = new MetawebLogger();

    private static final long serialVersionUID = -7572688360464348578L;
        
    public static final String SUPERVISOR = "com.google.acre.supervisor";
     
    private static boolean ENABLE_SUPERVISOR = Configuration.Values.ACRE_SUPERVISOR_THREAD.getBoolean();
   
    protected static final List<String[]> urlmap;

    static {
        try {
            urlmap = OneTrueConfig.parse();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse OTS config file", e);
        }
    }
    
    @Override
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        dispatch(request, response);
    }

    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        dispatch(request, response);
    }
   
    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        this.servletContext = config.getServletContext();
        Supervisor s = (Supervisor) this.servletContext.getAttribute(SUPERVISOR);
        if (s == null) {
            Supervisor news = (ENABLE_SUPERVISOR ? new Supervisor() : null);
            this.servletContext.setAttribute(SUPERVISOR, news);
        }
    }
    
    @Override
    public void destroy() {
        Supervisor s = (Supervisor) this.servletContext.getAttribute(SUPERVISOR);
        if (s != null) {
            s.cancel();
        }
    }

    private final static Logger access_logger = Logger.getLogger(Configuration.Values.ACCESS_LOG_LOGGER_NAME.getValue());
    
    private final static boolean app_thresholding = Configuration.Values.ACRE_APP_THRESHOLDING.getBoolean();
    private final static float max_request_rate = Configuration.Values.ACRE_MAX_REQUEST_RATE.getFloat();
    
    private transient ServletContext servletContext;
            
    private boolean check_hostname(String rule_host, String request_host) {
        if (rule_host == null) return true;

        if (!(rule_host.startsWith(".")) && rule_host.equals(request_host))
            return true;

        if (request_host.endsWith(rule_host))
            return true;

        String base_host = rule_host.substring(1);
        if (request_host.equals(base_host))
            return true;

        return false;
    }

    private void dispatch(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        long start = System.currentTimeMillis();
        String tid = request.getHeader("X-Metaweb-TID");
        String sname = Configuration.Values.SERVICE_NAME.getValue();
        String tid_event;
        if (tid == null) {
            tid = TIDGenerator.generateTID(Thread.currentThread().getId(), sname);
            tid_event = "request.generate.tid";
        } else {
            tid_event = "request.reuse.tid";
        }
        MDC.put("TID", tid);
        request.setAttribute("X-Metaweb-TID", tid);

        // We'll set this again going out to make sure it's not overridden
        response.setHeader("X-Metaweb-TID", tid);

        _logger.debug("request.start", start_log(request));
        _logger.debug(tid_event, tid);
        
        try {
            
            String pathinfo = request.getPathInfo();
            String hostval = request.getHeader("Host");
            String portval = "";

            if (hostval == null) {
                _logger.warn("request.url", "missing Host: header");
                response.sendError(400);
                return;
            }

            _logger.info("request.url", hostval + pathinfo);
            
            AcreHttpServletResponse res = new AcreHttpServletResponse(response);
            AcreHttpServletRequest req = null;
            
            for (String[] url_mapping : urlmap) {
                
                String[] host_path = url_mapping[0].split(":", 2);
                String host_match = null;
                String path_match = null;
                
                if (host_path.length > 1) {
                    host_match = host_path[0];
                    path_match = host_path[1];
                } else {
                    path_match = host_path[0];
                }
    
                String[] hostval_parts = hostval.split(":",2);
                if (hostval_parts.length > 1) {
                    hostval = hostval_parts[0];
                    portval = ":"+hostval_parts[1];
                } else {
                    hostval = hostval_parts[0];
                }
   
                boolean qs_match = false;
                String qs = request.getQueryString();
                if (qs != null && path_match.startsWith("?")) {
                    String[] qs_parts = qs.split("&");
                    for (String a : qs_parts) {
                        if (path_match.substring(1).equals(a)) {
                            qs_match = true;
                        }
                    }
                }
                if (path_match.equals("/")) path_match = "";

                // Make sure the URL begins with the mapping, and it can end with anything as long as the mapping is there
                if ((qs_match == true || pathinfo.matches(Pattern.quote(path_match)+"(/.*)?"))
                    && check_hostname(host_match, hostval)) {
                    RequestDispatcher rd = this.servletContext.getNamedDispatcher(url_mapping[1]);
                    String hostname = (url_mapping[2] == null) ? null : url_mapping[2];
                    // trailing '.' means the hostname was already fully-qualified
                    if (hostname != null) {
                        if (hostname.endsWith(".")) {
                            hostname = hostname.substring(0,hostname.length()-1);
                        } else {
                            hostname =  hostname + "." + Configuration.Values.ACRE_HOST_SUFFIX.getValue() + portval;
                        }                        
                    }

                    req = new AcreHttpServletRequest(request, path_match, url_mapping[3], hostname);

                    String host = req.getHeader("X-Untransformed-Host");
                    float rate = Statistics.instance().getAppRate(host);
                    if ((app_thresholding && rate < max_request_rate) || !app_thresholding) {
                        rd.forward(req, res);

                        // NOTE: it is intentional that we set the "vary: accept-encoding" header
                        // even in the case where the content might not end up compressed.
                        // This is because the proxies up front need to be aware of the "possibility"
                        // of this URL having multiple states based on the value of that header
                        
                        if (res.isContentCompressible()) {
                            res.addHeader("Vary", "Accept-Encoding");
                            res.send(shouldCompress(url_mapping[1],req));
                        } else {
                            res.send(false);
                        }
                        
                        // collect the request info for the app stats
                        // NOTE: we collect only the successful requests to avoid the 
                        // case where people keep refreshing the page that says "try again later"
                        // and those requests are counted as traffic as well (even if they
                        // are not heavy to process).
                        Statistics.instance().collectRequestTime(host, start, System.currentTimeMillis());
                        
                    } else {
                        response.sendError(503);
                    }
                    
                    _logger.debug("request.end", end_log(res));
                    
                    if (access_logger.isInfoEnabled()) access_log(host, req, res);
                    
                    break;
                }
            }

        } finally {
            Statistics.instance().collectRequestTime(start, System.currentTimeMillis());
        }
    }
    
    private boolean shouldCompress(String servletName, AcreHttpServletRequest request) { 
        String ae = request.getHeader("accept-encoding");
        return (servletName.toLowerCase().indexOf("proxy") == -1 && ae != null && ae.indexOf("gzip") != -1);
    }
    
    private final static SimpleDateFormat logDateFormat = new SimpleDateFormat("dd/MMM/yyyy:HH:mm:ss Z");

    @SuppressWarnings("unchecked")
    private HashMap<String, String> start_log(HttpServletRequest request) {
        HashMap<String, String> start_log = new HashMap<String, String>();
        StringBuffer req_url = request.getRequestURL();
        String qs = request.getQueryString();
        if (qs != null) {
            req_url.append("?");
            req_url.append(qs);
        }

        start_log.put("Http.url", req_url.toString());
        start_log.put("Http.req.method", request.getMethod());
        start_log.put("client.ip", request.getRemoteAddr());

        StringBuilder sb = new StringBuilder();
        Enumeration<String> e = request.getHeaderNames();
        while (e.hasMoreElements()) {
            String hname = e.nextElement();
            String hvalue = request.getHeader(hname);
            sb.append(hname + ": " + hvalue + "\r\n");
        }
        start_log.put("Http.req.hdr", sb.toString());

        return start_log;
    }
    
    private HashMap<String, String> end_log(AcreHttpServletResponse response) {
        HashMap<String, String> end_log = new HashMap<String, String>();
        end_log.put("Http.rep.status", Integer.toString(response.getStatus()));

        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String,String> entry : response.getHeaders().entrySet()) {
            sb.append(entry.getKey());
            sb.append(": ");
            sb.append(entry.getValue());
            sb.append("\r\n");
        }
        end_log.put("Http.rep.hdr", sb.toString());

        sb = new StringBuilder();
        for (Map.Entry<String,String> entry : response.getCookies().entrySet()) {
            sb.append(entry.getKey());
            sb.append(": ");
            sb.append(entry.getValue());
            sb.append("\r\n");
        }
        end_log.put("Http.rep.cookies", sb.toString());
        
        return end_log;
    }
    
    private void access_log(String host, AcreHttpServletRequest req, AcreHttpServletResponse res) {
    
        StringBuffer buf = new StringBuffer(300);
        
        buf.append(req.getRemoteAddr());
        buf.append(" - ");
        String user = req.getRemoteUser();
        buf.append((user == null) ? "- " : user);
                
        buf.append("[");
        buf.append(logDateFormat.format(System.currentTimeMillis()));
        buf.append("] \"");
        buf.append(req.getMethod());
        buf.append(' ');
        buf.append(req.getServletPath() + req.getPathInfo());
        buf.append(' ');
        buf.append(req.getProtocol());
        buf.append("\" ");
        buf.append(res.getStatus());
        buf.append(" - "); // XXX: here should be content length of the response

        String referrer = req.getHeader("Referer");
        if (referrer == null) {
            buf.append("- ");
        } else {
            buf.append("\"");
            buf.append(referrer);
            buf.append("\" ");
        }

        String user_agent = req.getHeader("User-Agent");
        if (user_agent == null) {
            buf.append("- ");
        } else {
            buf.append("\"");
            buf.append(user_agent);
            buf.append("\"");
        }
                     
        Object[] msg = { host , buf.toString() };
        access_logger.info(msg);
    }

}
