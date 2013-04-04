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

import com.google.acre.javascript.JSObject;
import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

public class JSUserService extends JSObject {
    
    private static final long serialVersionUID = 7486414326795708828L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSUserService(scope);
    }
    
    private UserService _userService;
    
    // ------------------------------------------------------------------------------------------

    public JSUserService() { }
    
    public JSUserService(Scriptable scope) {
        _scope = scope;
        _userService = UserServiceFactory.getUserService();
    }
    
    public String getClassName() {
        return "UserService";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    public String jsFunction_createLogoutURL(String url) {
        return _userService.createLogoutURL(url);
    }

    public String jsFunction_createLoginURL(String url) {
        return _userService.createLoginURL(url);
    }

    public boolean jsFunction_isUserLoggedIn() {
        return _userService.isUserLoggedIn();
    }
    
    public boolean jsFunction_isUserAdmin() {
        return _userService.isUserAdmin();
    }
    
    public Scriptable jsFunction_getCurrentUser() {
        User user = _userService.getCurrentUser();
        if (user != null) {
            JSUser jsUser = new JSUser(user, _scope);
            return jsUser.makeJSInstance();
        } else {
            return null;
        }
    }
}
