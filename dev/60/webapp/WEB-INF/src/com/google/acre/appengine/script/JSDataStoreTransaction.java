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

import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.datastore.Transaction;

public class JSDataStoreTransaction extends JSObject {
            
    private static final long serialVersionUID = -3489974928304659714L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDataStoreTransaction(((JSDataStoreTransaction) args[0]).getWrapped(), scope);
    }
    
    public JSDataStoreTransaction() { }

    private Transaction _transaction;
    
    public JSDataStoreTransaction(Transaction transaction, Scriptable scope) {
        _transaction = transaction;
        _scope = scope;
    }
    
    public Transaction getWrapped() {
        return _transaction;
    }
    
    public String getClassName() {
        return "DataStoreTransaction";
    }
        
    // -------------------------------------------------------------

    public boolean jsFunction_is_active() {
        try {
            return _transaction.isActive();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }
    }
    
    public void jsFunction_commit() {
        try {
            _transaction.commit();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }
    }

    public void jsFunction_rollback() {
        try {
            _transaction.rollback();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }
    }

}
