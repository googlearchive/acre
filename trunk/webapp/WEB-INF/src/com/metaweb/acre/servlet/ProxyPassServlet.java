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


package com.metaweb.acre.servlet;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Enumeration;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpHost;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.client.params.AllClientPNames;
import org.apache.http.client.params.CookiePolicy;
import org.apache.http.entity.InputStreamEntity;
import org.apache.http.impl.client.DefaultHttpClient;

import com.metaweb.acre.Configuration;

public class ProxyPassServlet extends HttpServlet {

    /**
     * Serialization UID.
     */
    private static final long serialVersionUID = -820796179800905600L;

    /**
     * Key for redirect location header.
     */
    private static final String STRING_LOCATION_HEADER = "Location";
    /**
     * Key for content type header.
     */
    //private static final String STRING_CONTENT_TYPE_HEADER_NAME = "Content-Type";

    /**
     * Key for content length header.
     */
    private static final String STRING_CONTENT_LENGTH_HEADER_NAME = "Content-Length";
    /**
     * Key for host header
     */
    private static final String STRING_HOST_HEADER_NAME = "Host";
    /**
     * The directory to use to temporarily store uploaded files
     */
    //private static final File FILE_UPLOAD_TEMP_DIRECTORY = new File(System.getProperty("java.io.tmpdir"));
    
    /**
     * The host to which we are proxying metaweb api requests
     */
    private String metawebAPIHost;
    /**
     * The port on the proxy host to which we are proxying metaweb api requests.
     */
    private int metawebAPIPort;
    /**
     * The (optional) path on the proxy host to which we are proxying metaweb api requests.
     */
    private String metawebAPIPath;
    /**
     * The maximum size for uploaded files in bytes.
     */
    //private int maxFileUploadSize;
    /**
     * The host:port description (composed from the individual parameters)
     */
    private String metawebAPIHostAndPort;
    
    /**
     * Initialize the <code>ProxyServlet</code>
     * @param servletConfig The Servlet configuration passed in by the servlet conatiner
     */
    public void init(ServletConfig servletConfig) {
        this.metawebAPIHost = Configuration.Values.ACRE_METAWEB_API_ADDR.getValue();
        this.metawebAPIPort = Configuration.Values.ACRE_METAWEB_API_ADDR_PORT.getInteger();
        this.metawebAPIPath = Configuration.Values.ACRE_METAWEB_API_PATH.getValue();
        //this.maxFileUploadSize = Configuration.Values.MAX_FILE_UPLOAD_SIZE.getInteger();
        
        if (this.metawebAPIPort == 80) {
            this.metawebAPIHostAndPort = this.metawebAPIHost;
        } else {
            this.metawebAPIHostAndPort = this.metawebAPIHost + ":" + this.metawebAPIPort;
        }        
    }
    
    /**
     * Performs an HTTP GET request
     * @param httpServletRequest The {@link HttpServletRequest} object passed
     *                            in by the servlet engine representing the
     *                            client request to be proxied
     * @param httpServletResponse The {@link HttpServletResponse} object by which
     *                             we can send a proxied response to the client 
     */
    public void doGet (HttpServletRequest httpServletRequest,
                       HttpServletResponse httpServletResponse)
            throws IOException, ServletException {
        HttpGet getMethodProxyRequest = new HttpGet(this.getProxyURL(httpServletRequest));
        setProxyRequestHeaders(httpServletRequest, getMethodProxyRequest);
        this.executeProxyRequest(getMethodProxyRequest, httpServletRequest,
                                 httpServletResponse);
    }
    
    /**
     * Performs an HTTP POST request
     * @param httpServletRequest The {@link HttpServletRequest} object passed
     *                            in by the servlet engine representing the
     *                            client request to be proxied
     * @param httpServletResponse The {@link HttpServletResponse} object by which
     *                             we can send a proxied response to the client 
     */
    public void doPost(HttpServletRequest httpServletRequest,
                       HttpServletResponse httpServletResponse)
            throws IOException, ServletException {
        HttpPost postMethodProxyRequest =
            new HttpPost(this.getProxyURL(httpServletRequest));

        setProxyRequestHeaders(httpServletRequest, postMethodProxyRequest);
        this.handleStandardPost(postMethodProxyRequest, httpServletRequest);
        this.executeProxyRequest(postMethodProxyRequest, httpServletRequest,
                                 httpServletResponse);
    }
    
    
    /**
     * Sets up the given {@link PostMethod} to send the same standard POST
     * data as was sent in the given {@link HttpServletRequest}
     * @param postMethodProxyRequest The {@link PostMethod} that we are
     *                                configuring to send a standard POST request
     * @param httpServletRequest The {@link HttpServletRequest} that contains
     *                            the POST data to be sent via the {@link PostMethod}
     */    
    private void handleStandardPost(HttpPost postMethodProxyRequest, 
                                    HttpServletRequest hsr) 
        throws IOException {
        HttpEntity re = new InputStreamEntity(hsr.getInputStream(),
                                                 hsr.getContentLength());
        postMethodProxyRequest.setEntity(re);
    }
    
    /**
     * Executes the {@link HttpMethod} passed in and sends the proxy response
     * back to the client via the given {@link HttpServletResponse}
     * @param httpMethodProxyRequest An object representing the proxy request to be made
     * @param httpServletResponse An object by which we can send the proxied
     *                             response back to the client
     * @throws IOException Can be thrown by the {@link HttpClient}.executeMethod
     * @throws ServletException Can be thrown to indicate that another error has occurred
     */
    private void executeProxyRequest(HttpRequestBase httpMethodProxyRequest,
                                     HttpServletRequest httpServletRequest,
                                     HttpServletResponse httpServletResponse)
        throws IOException, ServletException {
        DefaultHttpClient client = new DefaultHttpClient();
        client.getParams().setParameter(AllClientPNames.COOKIE_POLICY,
                                        CookiePolicy.BROWSER_COMPATIBILITY);

        String proxy_host = Configuration.Values.HTTP_PROXY_HOST.getValue();
        Integer proxy_port = null;
        if (!(proxy_host.length() == 0)) {
            proxy_port = Configuration.Values.HTTP_PROXY_PORT.getInteger();
            HttpHost proxy = new HttpHost(proxy_host, proxy_port, "http");
            client.getParams().setParameter(AllClientPNames.DEFAULT_PROXY, proxy);
        }

        // Execute the request
        HttpResponse res =  client.execute(httpMethodProxyRequest);
        int rescode = res.getStatusLine().getStatusCode();

        // Pass response headers back to the client
        Header[] headerArrayResponse = res.getAllHeaders();
        for(Header header : headerArrayResponse) {
            httpServletResponse.addHeader(header.getName(), header.getValue());
        }
        
        // Check if the proxy response is a redirect
        // The following code is adapted from org.tigris.noodle.filters.CheckForRedirect
        // Hooray for open source software
        if(rescode >= 300 && rescode < 304) {
            String stringStatusCode = Integer.toString(rescode);
            String stringLocation = httpMethodProxyRequest
                .getFirstHeader(STRING_LOCATION_HEADER).getValue();
            if(stringLocation == null) {
                    throw new ServletException("Recieved status code: " + stringStatusCode +
                                               " but no " +  STRING_LOCATION_HEADER +
                                               " header was found in the response");
            }
            // Modify the redirect to go to this proxy servlet rather that the proxied host
            String stringMyHostName = httpServletRequest.getServerName();
            if(httpServletRequest.getServerPort() != 80) {
                stringMyHostName += ":" + httpServletRequest.getServerPort();
            }
            stringMyHostName += httpServletRequest.getContextPath();
            httpServletResponse
                .sendRedirect(stringLocation.replace(this.metawebAPIHostAndPort + 
                                                     this.metawebAPIPath,
                                                     stringMyHostName));
            return;
        } else if(rescode == 304) {
            // 304 needs special handling.  See:
            // http://www.ics.uci.edu/pub/ietf/http/rfc1945.html#Code304
            // We get a 304 whenever passed an 'If-Modified-Since'
            // header and the data on disk has not changed; server
            // responds w/ a 304 saying I'm not going to send the
            // body because the file has not changed.
            httpServletResponse.setIntHeader(STRING_CONTENT_LENGTH_HEADER_NAME, 0);
            httpServletResponse.setStatus(304);
            return;
        }
        
        httpServletResponse.setStatus(rescode);

        InputStream instream = new BufferedInputStream(res.getEntity()
                                                       .getContent());
        OutputStream outstream = httpServletResponse.getOutputStream();
        IOUtils.copy(instream, outstream);
        instream.close();
    }
    
    /**
     * Retreives all of the headers from the servlet request and sets them on
     * the proxy request
     * 
     * @param httpServletRequest The request object representing the client's
     *                            request to the servlet engine
     * @param httpMethodProxyRequest The request that we are about to send to
     *                                the proxy host
     */
    @SuppressWarnings("unchecked")
    private void setProxyRequestHeaders(HttpServletRequest httpServletRequest, HttpRequestBase httpMethodProxyRequest) {
        // Get an Enumeration of all of the header names sent by the client
        Enumeration enumerationOfHeaderNames = httpServletRequest.getHeaderNames();
        while(enumerationOfHeaderNames.hasMoreElements()) {
            String stringHeaderName = (String) enumerationOfHeaderNames.nextElement();
            if(stringHeaderName.equalsIgnoreCase(STRING_CONTENT_LENGTH_HEADER_NAME))
                continue;
            // As per the Java Servlet API 2.5 documentation:
            //      Some headers, such as Accept-Language can be sent by clients
            //      as several headers each with a different value rather than
            //      sending the header as a comma separated list.
            // Thus, we get an Enumeration of the header values sent by the client
            Enumeration enumerationOfHeaderValues = httpServletRequest.getHeaders(stringHeaderName);
            while(enumerationOfHeaderValues.hasMoreElements()) {
                String stringHeaderValue = (String) enumerationOfHeaderValues.nextElement();
                // In case the proxy host is running multiple virtual servers,
                // rewrite the Host header to ensure that we get content from
                // the correct virtual server
                if(stringHeaderName.equalsIgnoreCase(STRING_HOST_HEADER_NAME)){
                    stringHeaderValue = this.metawebAPIHostAndPort;
                }
                // Set the same header on the proxy request
                httpMethodProxyRequest.addHeader(stringHeaderName,
                                                 stringHeaderValue);
            }
        }
    }
    
    // Accessors
    private String getProxyURL(HttpServletRequest httpServletRequest) {
        // Set the protocol to HTTP
        String stringProxyURL = "http://" + this.metawebAPIHostAndPort;
        // Check if we are proxying to a path other that the document root
        if("USE_SERVLET_PATH".equals(this.metawebAPIPath)) {
            //if proxy path is set to USE_SERVLET_PATH - use the servlet path
            stringProxyURL += httpServletRequest.getServletPath();
        } else { 
            stringProxyURL += this.metawebAPIPath;
        }
        
        // Handle the path given to the servlet
        if (httpServletRequest.getPathInfo() != null)
            stringProxyURL += httpServletRequest.getPathInfo();
        
        // Handle the query string
        if(httpServletRequest.getQueryString() != null) {
            stringProxyURL += "?" + httpServletRequest.getQueryString();
        }
        return stringProxyURL;
    }
    
}
