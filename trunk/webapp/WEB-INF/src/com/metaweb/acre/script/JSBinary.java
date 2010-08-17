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


package com.metaweb.acre.script;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.metaweb.util.javascript.JSObject;

public class JSBinary extends JSObject {

    private static final long serialVersionUID = -2803361365041388459L;
    private byte[] _data;

    public JSBinary() {
        _data = new byte[] {};
    }

    public JSBinary(Scriptable scope) {
        super();
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args,
                                           Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        JSBinary ret = new JSBinary(scope);
        ret.set_data(((JSBinary)args[0]).get_data());
        return ret;
    }

    public String getClassName() {
        return "Binary";
    }

    public int jsGet_size() {
        return _data.length;
    }

    public void set_data(byte[] data) {
        _data = data;
    }

    public byte[] get_data() {
        return _data;
    }

}
