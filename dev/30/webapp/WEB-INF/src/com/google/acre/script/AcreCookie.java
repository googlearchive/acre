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

import javax.servlet.http.Cookie;

import org.apache.http.cookie.ClientCookie;
import org.apache.http.impl.cookie.BasicClientCookie;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;

/**
 *
 *  This class represents an HTTP cookie and tries to allow conversion
 *  between the various libraries that all need cookies.
 *
 *  Note that this class is used to represent both request cookies
 *  (Cookie: header) and response cookies (Set-Cookie: header).
 *  Request cookies contain only "name" and "value".
 *  Unfortunately the irrelevant options may show up in the
 *  generated JS cookie object acre.request.cookies.
 *
 *  mood: Pfeffernuesseschmerz (the sadness of reading cookie specifications)
 */
public class AcreCookie extends JsConvertable {
    public String name;
    public String value;
    public String domain;
    public String path;

    // "false" is equivalent to not specified
    public boolean secure;

    // the default is max-age=-1 which means don't send a max-age attribute.
    // missing max-age indicates a sesssion cookie.
    // max-age=0 means clear the cookie
    public int max_age;

    public AcreCookie(String cookie_name, String cookie_value) {
        name = cookie_name;
        value = cookie_value;
        max_age = -1;
    }

    public AcreCookie(String cookie_name, String cookie_value, String cookie_domain, String cookie_path,
            boolean cookie_secure, int cookie_max_age) {
        name = cookie_name;
        value = cookie_value;
        domain = cookie_domain;
        path = cookie_path;
        secure = cookie_secure;
        max_age = cookie_max_age;
    }

    public AcreCookie(Cookie servlet_cookie) {
        // (String domain, String name, String value, String path, Date expires, boolean secure) 
        name = servlet_cookie.getName();
        value = servlet_cookie.getValue();
        domain = servlet_cookie.getDomain();
        path = servlet_cookie.getPath();
        secure = servlet_cookie.getSecure();
        max_age = servlet_cookie.getMaxAge();
    }

    public AcreCookie(org.apache.http.cookie.Cookie c) {
        name = c.getName();
        value = c.getValue();
        secure = c.isSecure();
        domain = c.getDomain();
        path = c.getPath();
        max_age = -1;
        // XXX translate into max-age?
        // c.getExpiryDate();
    }

    public AcreCookie(Scriptable jscookie) {
        Object v = jscookie.get("name", jscookie);
        if (v != Scriptable.NOT_FOUND)
            name = v.toString();

        v = jscookie.get("value", jscookie);
        if (v != null && v != Scriptable.NOT_FOUND)
            value = v.toString();

        v = jscookie.get("domain", jscookie);
        if (v != null && v != Scriptable.NOT_FOUND)
            domain = v.toString();

        v = jscookie.get("path", jscookie);
        if (v != null && v != Scriptable.NOT_FOUND)
            path = v.toString();

        v = jscookie.get("secure", jscookie);
        if (v != null && v != Scriptable.NOT_FOUND)
            secure = Context.toBoolean(v);

        v = jscookie.get("max_age", jscookie);
        if (v != null && v != Scriptable.NOT_FOUND)
            max_age = (int) Context.toNumber(v);
        else
            max_age = -1;
    }

    public Cookie toServletCookie() {
        Cookie c = new Cookie(name, value);
        c.setPath(path);
        c.setMaxAge(max_age);
        if (domain != null)
            c.setDomain(domain);
        c.setSecure(secure);
        return c;
    }

    public ClientCookie toClientCookie() {
        BasicClientCookie c = new BasicClientCookie(name, value);
        c.setDomain(domain);
        c.setPath(path);
        c.setSecure(secure);
        //c = new org.apache.commons.httpclient.Cookie(domain, name, value, path, max_age, secure);
        return c;
    }
}
