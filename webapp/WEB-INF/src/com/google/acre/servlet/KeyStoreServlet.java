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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.acre.Configuration;
import com.google.acre.util.KeyStore;
import com.google.util.javascript.JSON;
import com.google.util.javascript.JSONException;
import com.google.util.logging.MetawebLogger;

/**
 * <p>This Servlet implements a web service on top of the KeyStore that allows
 * external applications to save a particular token/secret pair 
 * for a given application.</p>
 * 
 * <p>Note that this service is write only by design.</p>
 */
public class KeyStoreServlet extends HttpServlet {

    public static final String KEY_STORE = "keystore";
    
    private static final long serialVersionUID = -526354280010592746L;
    
    protected static final MetawebLogger _logger = new MetawebLogger();

    protected transient KeyStore _store;
    
    private static final boolean CHECK_SSL = false;
    private static final boolean CHECK_METAWEB_REQUEST = true;

    private static final String METHOD_ARG = "method";
    private static final String NAME_ARG = "name";
    private static final String APPID_ARG = "appid";
    private static final String TOKEN_ARG = "token";
    private static final String SECRET_ARG = "secret";

    private static final int NAME_ARG_MAX_LENGTH = 256;
    private static final int TOKEN_ARG_MAX_LENGTH = 1024 * 2;
    private static final int SECRET_ARG_MAX_LENGTH = 1024 * 2;
    
    private static final String SSL_HEADER = "X-Metaweb-SSL";
    private static final String OLD_REQUEST_HEADER = "X-Metaweb-Request";
    private static final String NEW_REQUEST_HEADER = "X-Requested-With";

    private final Pattern GUID_pattern = Pattern.compile("#.*");

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        String keystore_class = 
            Configuration.Values.ACRE_KEYSTORE_CLASS.getValue();
        try {
            Class<?> cls = Class.forName(keystore_class);
            Method method = cls.getMethod("getKeyStore", new Class[0]);
            _store = (KeyStore)method.invoke(null, new Object[0]);
        } catch (Exception e) {
            throw new ServletException("Error initializing the key store", e);
        }
    }

    /**
     * <p>GET returns you the list of keys associated with this app.</p>
     * 
     * <p>The accepted parameters are:
     * <ul>
     *  <li><b>appid</b> - the ID of the application that you want to query</li>
     * </ul>
     */
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
     
        Map<String,Object> m = new HashMap<String,Object>();

        // get the TID from the request (this should have been set by the TIDFilter)
        String tid = (String) request.getAttribute("X-Metaweb-TID");
        if (tid != null) {
            m.put("transation_id", tid);
        }

        String appid = request.getParameter(APPID_ARG);
        
        if (appid == null) {
            sendError(m, response, 400, "Request must come with a '" + APPID_ARG + "' parameter. ");
            return;
        } else if ("".equals(appid)) {
            sendError(m, response, 400, "Request came with an empty '" + APPID_ARG + "' parameter, have you urlencoded the # char in the GUID?");
        }
        
        sendKeys(m, appid, response);
    }
    
    /**
     * <p>The write-only interface is done thru POST.</p>
     * 
     * <p>The accepted parameters are:
     * <ul>
     *  <li><b>name</b> - the name of the key to store</li>
     *  <li><b>appid</b> - the application ID that will have read access to this key</li>
     *  <li><b>token</b> - the token for this key</li>
     *  <li><b>secret</b> - the secret for this key</li>
     * </ul>
     */
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        Map<String,Object> m = new HashMap<String,Object>();

        // get the TID from the request (this should have been set by the TIDFilter)
        String tid = (String) request.getAttribute("X-Metaweb-TID");
        if (tid != null) {
            m.put("transation_id", tid);
        }
        
        String appid = request.getParameter(APPID_ARG);

        if (appid == null) {
            sendError(m, response, 400, "Request must come with a '" + APPID_ARG + "' parameter. ");
        } else if (!GUID_pattern.matcher(appid).matches()) {
            sendError(m, response, 400, "The application ID '" + appid + "' is not a valid Freebase GUID. ");
        } else {

            String method = request.getParameter(METHOD_ARG);
            if (method == null) method = "POST";
            method = method.toUpperCase();

            if ("POST".equals(method) || "DELETE".equals(method) || "LIST".equals(method)) {
                
                // check to see if the request came from a secure connection (since we have secrets passing thru here)
                if (CHECK_SSL) {
                    String overSSL = request.getHeader(SSL_HEADER);
                    if (overSSL == null) {
                        sendError(m, response, 400, "Call didn't arrive from the end-user thru a secure channel so we can't accept it [header '" + SSL_HEADER + "' wasn't set in the HTTP request]");
                        return;
                    }
                }
                
                // check to see if the request come from a legitimate source (this is mostly done to avoid some types of XSS)
                if (CHECK_METAWEB_REQUEST) {
                    String oldMetawebRequest = request.getHeader(OLD_REQUEST_HEADER);
                    String newMetawebRequest = request.getHeader(NEW_REQUEST_HEADER);
                    if (oldMetawebRequest == null && newMetawebRequest == null) {
                        sendError(m, response, 400, "This service won't process requests that don't have either the header '" + NEW_REQUEST_HEADER + "'(preferred) or '" + OLD_REQUEST_HEADER + "' set [for security reasons].");
                        return;
                    }
                }
                
                Cookie auth_cookie = null;
                Cookie[] cookies = request.getCookies();
                if (cookies != null) {
                    for (Cookie c : cookies) {
                        if (c.getName().equals("metaweb-user")) {
                            auth_cookie = c;
                        }
                    }
                }
                
                if (auth_cookie == null) {
                    sendError(m, response, 401, "Unauthorized - Request must come with a 'metaweb-user' cookie set.");
                } else if (!userAuthorized(request, response, appid, auth_cookie)) {
                    sendError(m, response, 401, "Unauthorized - The credentials contained in the 'metaweb-user' cookie supplied were not valid.");
                } else {
                    if ("LIST".equals(method)) {
                        
                        try {
                            m.put("keys", _store.get_full_keys(appid));
                            m.put("status","200 OK");
                            m.put("code", "/api/status/ok");
                            sendJSON(response, m);
                        } catch (Exception e) {
                            sendError(m, response, 500, "Error while listing the full keys for app '" + appid + "': " + e.getMessage());
                        }
                    
                    } else {

                        String name = request.getParameter(NAME_ARG);
                        
                        if (name == null) {
                            sendError(m, response, 400, "Request must come with a '" + NAME_ARG + "' parameter. ");
                        } else if (name.length() > NAME_ARG_MAX_LENGTH) {
                            sendError(m, response, 400, "The key name must be less than " + NAME_ARG_MAX_LENGTH + "' chars long. ");
                        } else {
                            
                            if ("POST".equals(method)) {
                        
                                String token = request.getParameter(TOKEN_ARG);
                                String secret = request.getParameter(SECRET_ARG);
                        
                                // if we're here, we mean the request is kosher, so let's check if all the required parameters are present
                                
                                if (token == null) {
                                    sendError(m, response, 400, "Request must come with a '" + TOKEN_ARG + "' parameter. ");
                                } else if (secret == null) {
                                    sendError(m, response, 400, "Request must come with a '" + SECRET_ARG + "' parameter. ");
                                } else {
                                    
                                    // if we're here, it means that all parameters are set, so now we need to check if they are reasonable
                                    
                                    if (token.length() > TOKEN_ARG_MAX_LENGTH) {
                                        sendError(m, response, 400, "The key token must be less than " + TOKEN_ARG_MAX_LENGTH + "' chars long. ");
                                    } else if (token.length() > SECRET_ARG_MAX_LENGTH) {
                                        sendError(m, response, 400, "The key secret must be less than " + NAME_ARG_MAX_LENGTH + "' chars long. ");
                                    } else {
                        
                                        // if we get here, all parameters are reasonable, so let's do our job
                                        
                                        try {
                                            _store.put_key(name, appid, token, secret);
                                        } catch (Exception e) {
                                            sendError(m, response, 500, "Error while storing the key: " + e.getMessage());
                                            return;
                                        }
                                        
                                        // if we get here, everything went fine, so we log the result and return OK
                                        
                                        _logger.debug("keystore", "Adding key '" + name + "' for app '" + appid + "' [token: " + token + "]");
                                        
                                        m.put("status","200 OK");
                                        m.put("code", "/api/status/ok");
                                        sendJSON(response, m);
                                    }
                                }
                                
                            } else if ("DELETE".equals(method)) {
                    
                                // if we get here, all parameters are reasonable, so let's do our job
                                
                                try {
                                    _store.delete_key(name, appid);
                                } catch (Exception e) {
                                    sendError(m, response, 500, "Error while deleting the key: " + e.getMessage());
                                    return;
                                }
                                
                                // if we get here, everything went fine, so we log the result and return OK
                                
                                _logger.debug("keystore", "Removing key '" + name + "' for app '" + appid);
                                
                                m.put("status","200 OK");
                                m.put("code", "/api/status/ok");
                                sendJSON(response, m);
                            }
                        }
                    }
                }
            } else if ("GET".equals(method)) {
                sendKeys(m, appid, response);
            } else {
                sendError(m, response, 400, "Method '" + method + "' not supported.");
            }
        }
    }
    
    private boolean userAuthorized(HttpServletRequest request, HttpServletResponse response, String appid, Cookie auth_cookie) {

        if (appid == null) {
            _logger.debug("keystore", "Application ID is not available");
            return false;
        }
        
        if (auth_cookie == null) {
            _logger.debug("keystore", "Authorization cookie is not available");
            return false;
        }

        _logger.error("keystore", "Checking authorization for app '" + appid + "' auth_cookie: " + auth_cookie.getValue());
        
        try {
            RequestDispatcher rd = getServletContext().getNamedDispatcher("DispatchServlet");
            
            AcreHttpServletRequest req = (AcreHttpServletRequest) request;
            req.setHostname("local." + Configuration.Values.ACRE_HOST_DELIMETER_PATH.getValue() + "." + Configuration.Values.ACRE_HOST_BASE.getValue());
            req.setMappings("/acre/keystore", "/admin_check");

            req.setParameter("app_guid", appid.substring(1));
            req.setParameter("metaweb_user", auth_cookie.getValue());
            
            AcreHttpServletResponse res = (AcreHttpServletResponse) response;
            
            rd.forward(req, res);

            int status = res.getStatus();
            
            ByteArrayOutputStream output = res.getByteArrayOutput();
            _logger.debug("keystore", "Status: " + status + " Result: " + output.toString());
            
            res.reset();
            
            return (status == 200);
        } catch (UnsupportedEncodingException e) {
            _logger.debug("keystore", "UnsupportedEncodingException: " + e.getMessage());
            return false;
        } catch (ServletException e) {
            _logger.debug("keystore", "ServletException: " + e.getMessage());
            return false;
        } catch (IOException e) {
            _logger.debug("keystore", "IOException: " + e.getMessage());
            return false;
        }
    }

    private void sendKeys(Map<String,Object> result, String appid, HttpServletResponse response) throws IOException {
        try {
            result.put("keys", _store.get_keys(appid));
            result.put("status","200 OK");
            result.put("code", "/api/status/ok");
            sendJSON(response, result);
        } catch (Exception e) {
            sendError(result, response, 500, "Error while reading the keys for app '" + appid + "': " + e.getMessage());
        }
    }

    private void sendError(Map<String,Object> m, HttpServletResponse response, int code, String msg) throws IOException {
        List<Object> messages = new ArrayList<Object>(1);
        Map<String,Object> message = new HashMap<String,Object>();
        messages.add(message);
        
        message.put("code", "/api/status/error/input/invalid");
        message.put("message", msg);
        
        switch (code) {
            case 400:
                m.put("status", Integer.toString(code) + " Bad Request");
                break;
            case 401:
                m.put("status", Integer.toString(code) + " Unauthorized");
                break;
            case 500:
            default:
                m.put("status", "500 Internal Server Error");
        }
        
        m.put("code", "/api/status/error");
        m.put("messages", messages);
        
        sendJSON(response, m);
    }
    
    private void sendJSON(HttpServletResponse response, Object payload) throws IOException {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("text/plain");
        ByteArrayOutputStream output =
            ((AcreHttpServletResponse)response).getByteArrayOutput();
        try {
            output.write(JSON.stringify(payload).getBytes("UTF-8"));
        } catch (JSONException e) {
            _logger.debug("keystore", "JSONException: " + e.getMessage());
        }
    }
}
