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

package com.google.acre.util.http;

import java.net.URI;

import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;

/**
 * <code>PropFindMethod</code>, as specified in
 * <a href="http://www.webdav.org/specs/rfc4918.html#rfc.section.9.1">RFC 4918, Section 9.1</a>
 */

public class HttpPropFind extends HttpEntityEnclosingRequestBase {

    public final static String METHOD_NAME = "PROPFIND";
    
    public HttpPropFind() {
        super();
    }
    
    public HttpPropFind(final URI uri) {
        super();
        setURI(uri);
    }
    
    /**
     * @throws IllegalArgumentException if the uri is invalid. 
     */
    public HttpPropFind(final String uri) {
        super();
        setURI(URI.create(uri));
    }

    @Override
    public String getMethod() {
        return METHOD_NAME;
    }
    
}
