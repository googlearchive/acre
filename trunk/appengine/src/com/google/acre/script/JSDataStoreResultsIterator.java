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

import java.util.Iterator;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.datastore.Entity;
import com.google.util.javascript.JSObject;

public class JSDataStoreResultsIterator extends JSObject {
        
    private static final long serialVersionUID = -704340676845729749L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDataStoreResultsIterator(((JSDataStoreResultsIterator) args[0]).getWrapped(), scope);
    }
    
    public JSDataStoreResultsIterator() { }

    private Object _iterator;
    
    public JSDataStoreResultsIterator(Object iterator, Scriptable scope) {
        _iterator = iterator;
        _scope = scope;
    }
    
    public Object getWrapped() {
        return _iterator;
    }
    
    public String getClassName() {
        return "DataStoreResultsIterator";
    }
        
    // -------------------------------------------------------------

    @SuppressWarnings("rawtypes")
    public boolean jsFunction_has_next() {
        try {
            return ((Iterator) _iterator).hasNext();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("" + e.getMessage()).newJSException(_scope);
        }
    }

    @SuppressWarnings("rawtypes")
    public Scriptable jsFunction_next() {
        try {
            return JSDataStore.extract((Entity) ((Iterator) _iterator).next(),_scope);
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("" + e.getMessage()).newJSException(_scope);
        }
    }
    
}
