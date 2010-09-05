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

import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Map;
import java.util.TreeMap;
import java.util.zip.GZIPOutputStream;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

public class AcreHttpServletResponse extends HttpServletResponseWrapper {

    public static class AcreServletOutputStream extends ServletOutputStream {

        ServletOutputStream stream;
        int length = 0;
        
        public AcreServletOutputStream(ServletOutputStream original) {
            this.stream = original;
        }
        
        public void write(int b) throws IOException {
            this.stream.write(b);
            length++;
        }
                
        public int getContentLength() {
            return length;
        }
    }
    
    int status = 0;
    String encoding = "UTF-8";
    String content_type = "text/plain";
    Map<String,String> headers = new TreeMap<String,String>();
    Map<String,String> cookies = new TreeMap<String,String>();
    
    ServletOutputStream stream = null;
    ByteArrayOutputStream byteoutput = null;
    
    public AcreHttpServletResponse(HttpServletResponse hsr) {
        super(hsr);
    }

    @Override
    public void setStatus(int sc) {
        super.setStatus(sc);
        this.status = sc;
    }

    @Override
    public void setStatus(int sc, String sm) {
         super.setStatus(sc, sm);
         this.status = sc;
    }
        
    @Override
    public void setCharacterEncoding(String e) {
        super.setCharacterEncoding(e);
        encoding = e;
    }

    @Override
    public void setIntHeader(String name, int value) {
        setHeader(name, Integer.toString(value));
    }
    
    @Override
    public void addIntHeader(String name, int value) {
        addHeader(name, Integer.toString(value));
    }
    
    @Override
    public void setDateHeader(String name, long date) {
        super.setDateHeader(name, date);
        headers.put(name,Long.toString(date));
    }
    
    @Override
    public void addDateHeader(String name, long date) {
        super.addDateHeader(name, date);
        String value = Long.toString(date);
        if (headers.containsKey(name)) {
            value = headers.get(name) + ", " + value;
        }
        headers.put(name, value);
    }
    
    @Override
    public void addCookie(Cookie cookie) {
        super.addCookie(cookie);
        cookies.put(cookie.getName(), cookie.getValue());
    }
    
    @Override
    public void setHeader(String name, String value) {
        super.setHeader(name, value);
        headers.put(name, value);
    }
    
    @Override
    public void addHeader(String name, String value) {
        super.addHeader(name, value);
        if (headers.containsKey(name)) {
            value = headers.get(name) + ", " + value;
        }
        headers.put(name, value);
    }
    
    @Override
    public void setContentLength(int len) {
        super.setContentLength(len);
    }
    
    @Override
    public void setContentType(String type) {
        super.setContentType(type);
        content_type = type;
    }
        
    @Override
    public void reset() {
        super.reset();
        super.resetBuffer();
        byteoutput = null;
        stream = null;
    }
    
    @Override
    public ServletOutputStream getOutputStream() throws IOException {
        if (stream == null) {
            stream = new AcreServletOutputStream(super.getOutputStream());
        }
        return stream;
    }  

    public ByteArrayOutputStream getByteArrayOutput() {
        if (byteoutput == null) {
            byteoutput = new ByteArrayOutputStream();
        }
        return byteoutput;
    }

    // --------------------------------------------------------------------------
    
    public int getStatus() {
        return this.status;
    }
    
    public void send(boolean compress) throws IOException {
        try {
            if (byteoutput != null) {
                if (compress) {
                    ByteArrayOutputStream gziped_bs = new ByteArrayOutputStream();
                    BufferedOutputStream buff_bs = 
                        new BufferedOutputStream(new GZIPOutputStream(gziped_bs));
                    byteoutput.writeTo(buff_bs);
                    byteoutput = gziped_bs;
                    buff_bs.close();
                    gziped_bs.close();
                    this.addHeader("Content-Encoding", "gzip");
                }

                OutputStream output = super.getOutputStream();
                this.setContentLength(byteoutput.size());
                byteoutput.writeTo(output);
                output.flush();
                output.close();
            } else {
                AcreServletOutputStream output =
                    (AcreServletOutputStream)this.getOutputStream();
                output.flush();
                output.close();
            }

            this.flushBuffer();
        } catch (ArrayIndexOutOfBoundsException e) {
            // XXX(SM): Jetty has a fixed buffer for headers and it might be
            // possible that if the user script logs too much content, such
            // buffer might be exhausted and this exception is thrown at this
            // point. Unfortunately, Jetty has a bug the prevents us from
            // generating a  sane HTTP response when this happens
            // (see http://jira.codehaus.org/browse/JETTY-874 )

            throw new IOException("Too much content in the response headers. Try logging less in your script.");
        }
    }

    public Map<String,String> getHeaders() {
        return headers;
    }

    public Map<String,String> getCookies() {
        return cookies;
    }

    public boolean isContentCompressible() {
        // XXX(SM): is this enough?
        return !(content_type.startsWith("image/"));
    }
}
