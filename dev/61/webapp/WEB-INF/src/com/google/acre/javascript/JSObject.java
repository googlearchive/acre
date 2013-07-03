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

package com.google.acre.javascript;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

public class JSObject extends ScriptableObject {

    private static final long serialVersionUID = 3218033841430800117L;

    protected Scriptable _scope;

    public Scriptable makeJSInstance() {
        Object jsobj = _scope.get(getClassName(), _scope);
        Object[] args = { this };
        return ((Function)jsobj).construct(Context.getCurrentContext(), _scope, args);
    }

    public Scriptable makeJSInstance(Scriptable scope) {
        _scope = scope;
        Object jsobj = _scope.get(getClassName(), _scope);
        Object[] args = { this };
        return ((Function)jsobj).construct(Context.getCurrentContext(), _scope, args);
    }

    public Scriptable getScope() {
        return _scope;
    }

    public String getClassName() {
        return "JSObject";
    }
}
