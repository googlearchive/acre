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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

import javax.servlet.ServletInputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;

public class AcreHttpServletRequest extends HttpServletRequestWrapper {
    
    private String _hostname;
    private String[] _remapping;
    private StringBuffer _overloaded_body = new StringBuffer();

    public static class AcreServletInputStream extends ServletInputStream {
        InputStream _input;

        public AcreServletInputStream(InputStream input) {
            _input = input;
        }
        
        public int read() throws IOException {
            return this._input.read();
        }
    }

    public AcreHttpServletRequest(HttpServletRequest hsr, String remap_from, 
                                  String remap_to, String hostname) {
        super(hsr);
        setHostname(hostname);
        setMappings(remap_from, remap_to);
    }

    public void setHostname(String hostname) {
        _hostname = hostname;
    }

    public void setMappings(String from, String to) {
        _remapping = new String[] { from, to };
    }
    
    public void setParameter(String name, String value) throws UnsupportedEncodingException {
        String encoding = this.getCharacterEncoding();
        if (encoding == null) encoding = "UTF-8";
        _overloaded_body.append(URLEncoder.encode(name,encoding));
        _overloaded_body.append('=');
        _overloaded_body.append(URLEncoder.encode(value,encoding));
        _overloaded_body.append('&');
    }

    // ------------------------------------------------------------

    @Override
    public ServletInputStream getInputStream() throws IOException {
        if (_overloaded_body.length() > 0) {
            return new AcreServletInputStream(new ByteArrayInputStream(_overloaded_body
                                                                       .toString()
                                                                       .getBytes()));
        } else {
            return super.getInputStream();
        }
    }
    
    @Override
    public String getHeader(String name) {
        if (_hostname != null && name.equals("Host")) {
            return _hostname;
        } else if (_hostname != null && name.equals("X-Forwarded-Host") && super.getHeader("X-Forwarded-Host") != null) {
            return _hostname;
        } else if (name.equals("X-Untransformed-Host")) {
            String fwdhost = super.getHeader("X-Forwarded-Host");
            if (fwdhost != null) {
                if (fwdhost.indexOf(',') > -1) {
                    String[] hosts = fwdhost.split(",");
                    return hosts[0].trim();
                } else {
                    return fwdhost;
                }
            } else {
                return super.getHeader("Host");
            }
        } else {
            return super.getHeader(name);
        }
    }

    public String getRequestPathInfo() {
        return super.getPathInfo();
    }

    @Override
    public String getPathInfo() {
        String pi = super.getPathInfo();

        if (_remapping[1] != null) {
            String remap = null;
            // XXX this means query string mappings can't also include
            //     path ones... This sucks but will work for the current
            //     use case
            if (_remapping[0].startsWith("?")) {
                remap = _remapping[1] + pi;
            } else if (pi.startsWith(_remapping[0])) {
                remap = _remapping[1] + pi.substring(_remapping[0].length());
            } else {
                remap = _remapping[0] + pi;
            }
            // XXX The first two clauses here are basically the same thing, it
            // has to do with the handling of double remappings, they can
            // probably be merged, but need a bit more attention then I can
            // give right now.
            if (remap.startsWith("//")) {
                return remap.substring(1);
            } else if ((_remapping[1].length() > 1 && !(_remapping[0].startsWith("?"))) && remap.startsWith(_remapping[1]+_remapping[1])) {
                return remap.substring(_remapping[1].length());
            } else {
                return remap;
            }
        } else {
            return pi;
        }
    }
    
}
