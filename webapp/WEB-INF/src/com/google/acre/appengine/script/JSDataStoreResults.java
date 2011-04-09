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

package com.google.acre.appengine.script;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;

import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.datastore.Cursor;
import com.google.appengine.api.datastore.FetchOptions;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.QueryResultIterator;

public class JSDataStoreResults extends JSObject {
        
    private static final long serialVersionUID = 529101157247378231L;

    private PreparedQuery _result;
    private Object _cursor;
    private QueryResultIterator<?> _iterator;
    private int _count = -1;
    
    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDataStoreResults(((JSDataStoreResults) args[0]).getResult(), ((JSDataStoreResults) args[0]).getCursor(), scope);
    }
    
    public JSDataStoreResults() { }
    
    public JSDataStoreResults(Object result, Object cursor, Scriptable scope) {
        _result = (PreparedQuery) result;
        _cursor = cursor;
        _scope = scope;
    }
    
    public Object getResult() {
        return _result;
    }

    public Object getCursor() {
        return _cursor;
    }
    
    public QueryResultIterator<?> getIterator() {
        if (_iterator == null) {
            if (_cursor != null && !(_cursor instanceof Undefined)) {
                FetchOptions fetchOptions = FetchOptions.Builder.withStartCursor(Cursor.fromWebSafeString(_cursor.toString()));
                _iterator = ((PreparedQuery) _result).asQueryResultIterator(fetchOptions);
            } else {
                FetchOptions fetchOptions = FetchOptions.Builder.withDefaults();
                _iterator = ((PreparedQuery) _result).asQueryResultIterator(fetchOptions);
            }
        }
        return _iterator;
    }
        
    public int getCount() {
        if (_count == -1) {
            System.out.println("1");
            if (_cursor != null && !(_cursor instanceof Undefined)) {
                FetchOptions fetchOptions = FetchOptions.Builder.withStartCursor(Cursor.fromWebSafeString(_cursor.toString()));
                _count = ((PreparedQuery) _result).countEntities(fetchOptions);
            } else {
                FetchOptions fetchOptions = FetchOptions.Builder.withDefaults();
                System.out.println("3aa: " + _result);
                _count = ((PreparedQuery) _result).countEntities(fetchOptions);
            }
        }
        return _count;
    }

    public String getClassName() {
        return "DataStoreResults";
    }

    // -------------------------------------------------------------
    
    public Object jsFunction_as_iterator() {
        try {
            JSDataStoreResultsIterator resultIterator = new JSDataStoreResultsIterator(getIterator(),_scope);
            return resultIterator.makeJSInstance();
        } catch (Exception e) {
            throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }
    }
    
    public int jsFunction_get_count() {
        try {
            return getCount();
        } catch (Exception e) {
            throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }
    }

    public Object jsFunction_get_cursor() {
        try {
            return getIterator().getCursor().toWebSafeString();
        } catch (Exception e) {
            throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }
    }
    
}
