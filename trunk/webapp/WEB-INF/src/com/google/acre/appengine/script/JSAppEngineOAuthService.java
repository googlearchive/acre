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

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;

import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.oauth.OAuthService;
import com.google.appengine.api.oauth.OAuthServiceFactory;
import com.google.appengine.api.users.User;

public class JSAppEngineOAuthService extends JSObject {
    
    private static final long serialVersionUID = -2412042603745227113L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSAppEngineOAuthService(scope);
    }
    
    private OAuthService _oauthService;
    
    // ------------------------------------------------------------------------------------------

    public JSAppEngineOAuthService() { }
    
    public JSAppEngineOAuthService(Scriptable scope) {
        _scope = scope;
        _oauthService = OAuthServiceFactory.getOAuthService();
    }
    
    public String getClassName() {
        return "AppEngineOAuthService";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    public Scriptable jsFunction_getCurrentUser(Object scope) {
        try {
            if (scope instanceof Undefined) {
                return jsonize(_oauthService.getCurrentUser());
            } else {
                return jsonize(_oauthService.getCurrentUser(scope.toString()));
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to obtain current user name: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public boolean jsFunction_isUserAdmin() {
        try {
            return _oauthService.isUserAdmin();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to know if the user is admin: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    private Scriptable jsonize(User user) {
        Scriptable o = Context.getCurrentContext().newObject(_scope);
        o.put("id", o, user.getUserId());
        o.put("nickname", o, user.getNickname());
        o.put("email", o, user.getEmail());
        o.put("auth_domain", o, user.getAuthDomain());
        //o.put("federated_identity", o, user.getFederatedIdentity()); // don't need this for now
        return o;
    }
}
