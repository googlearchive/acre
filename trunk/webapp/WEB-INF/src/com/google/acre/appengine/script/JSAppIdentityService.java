// Copyright 2007-2011 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.acre.appengine.script;

import java.util.ArrayList;
import java.util.List;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.appidentity.AppIdentityService;
import com.google.appengine.api.appidentity.AppIdentityService.GetAccessTokenResult;
import com.google.appengine.api.appidentity.AppIdentityServiceFactory;

public class JSAppIdentityService extends JSObject {
    
    private static final long serialVersionUID = -6867434478185583492L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSAppIdentityService(scope);
    }
    
    private AppIdentityService _appIdentityService;
    
    // ------------------------------------------------------------------------------------------

    public JSAppIdentityService() { }
    
    public JSAppIdentityService(Scriptable scope) {
        _scope = scope;
        _appIdentityService = AppIdentityServiceFactory.getAppIdentityService();
    }
    
    public String getClassName() {
        return "AppIdService";
    }
    
    // ---------------------------------- public functions  ---------------------------------

    public String jsFunction_getServiceAccountName() {
        try {
            return _appIdentityService.getServiceAccountName();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to obtain service account name: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public Scriptable jsFunction_getAccessToken(String scope) {
        try {
            return jsonize(_appIdentityService.getAccessToken(iterable(scope)));
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to obtain access token: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public Scriptable jsFunction_getAccessTokenUncached(String scope) {
        try {
            return jsonize(_appIdentityService.getAccessTokenUncached(iterable(scope)));
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to obtain access token: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    private Iterable<String> iterable(String str) {
        List<String> iterable = new ArrayList<String>();
        iterable.add(str);
        return iterable;
    }
    
    private Scriptable jsonize(GetAccessTokenResult token) {
        String accessToken = token.getAccessToken();
        long expirationTime = token.getExpirationTime().getTime();
        Scriptable o = Context.getCurrentContext().newObject(_scope);
        o.put("access_token", o, accessToken);
        o.put("expiration_time", o, expirationTime);
        return o;
    }
}
