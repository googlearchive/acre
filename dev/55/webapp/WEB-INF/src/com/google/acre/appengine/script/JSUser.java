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

public class JSUser extends JSObject {
    
    private static final long serialVersionUID = -6886153144904334456L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSUser(((JSUser) args[0]).getUser(), scope);
    }
    
    private User _user;
    
    // ------------------------------------------------------------------------------------------

    public JSUser() { }
    
    public JSUser(User user, Scriptable scope) {
        _scope = scope;
        _user = user;
    }
    
    public String getClassName() {
        return "User";
    }
    
    public User getUser() {
        return _user;
    }
        
    // ---------------------------------- public functions  ---------------------------------
    
    public String jsGet_user_id() {
        return _user.getUserId();
    }
    
    public String jsGet_nickname() {
        return _user.getNickname();
    }

    public String jsGet_email() {
        return _user.getEmail();
    }
    
    public String jsGet_auth_domain() {
        return _user.getAuthDomain();
    }
}
