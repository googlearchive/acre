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

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;

import com.google.acre.javascript.JSON;
import com.google.acre.javascript.JSONException;
import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;

public class JSJSON extends JSObject {
    private static final long serialVersionUID = -306790422514648132L;

    public JSJSON() { }

    public JSJSON(Scriptable scope) {
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, 
                                           Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSJSON(scope);
    }

    public String getClassName() {
        return "JSON";
    }

    public Scriptable jsFunction_parse(String obj) {
        try {
            return (Scriptable) JSON.parse(obj, _scope);
        } catch (JSONException e) {
            throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }
    }
    
    public String jsFunction_stringify(Object obj, Object resolver, Object space ){
    	if (obj instanceof Undefined){
    		JSConvertableException.throwNewJSException("JSON.stringify: can not stringify undefined", _scope);
    	}
    	
    	if (obj == null){
    		return "null";
    	}
    	
    	if (resolver != null && !(resolver instanceof Undefined )){
           	throw new JSConvertableException("Acre currently ignores 'resolver' in JSON.stringify()!").newJSException(_scope);
    	}
    	
    	String indent = null;
    	if (space instanceof Number){
    		int numSpaces = ((Number) space).intValue();
    		char[] spaces = new char[numSpaces];
    		for (int x=0; x<numSpaces;x++){
    			spaces[x] = ' ';
    		}
    		indent = String.valueOf(spaces);
    	} else if (space instanceof String){
    		indent = (String) space;
    	}
    	
        try {
            return JSON.stringify(obj, indent, _scope);
        } catch (JSONException e) {
        	throw new JSConvertableException(e.getMessage()).newJSException(_scope);
        }

    }
}
