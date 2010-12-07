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



package com.google.acre.script.exceptions;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;

import com.google.acre.script.HostEnv;
import com.google.acre.script.JsConvertable;


//
//
//  XXX UNTESTED!   but hopefully better than the current exception mess
//
//  note that this is not a subclass of java.lang.Throwable.
//  nor is it a subclass of Scriptable.
//
//

public class JSConvertableException extends JsConvertable {
    public String message;
    final protected static String error_constructor = "Error";

    public static void throwNewJSException(String error_message, Scriptable scope){
    	JSConvertableException jsce = new JSConvertableException(error_message);
    	JavaScriptException jse = jsce.newJSException(scope);
    	throw jse;
    }
    
    public JSConvertableException(String error_message) {
        message = error_message;
    }

    public Scriptable toJSError(Scriptable scope) {
        Context cx = Context.getCurrentContext();
        String[] args = { message };

        Scriptable obj = cx.newObject(scope, error_constructor, args);
        return toJsObject(scope, obj);
    }

    public JavaScriptException newJSException(HostEnv he) {
        Context cx = Context.getCurrentContext();
        String[] args = { message };

        Scriptable scope = he.getScope();

        // We pass HostEnv here because the exceptions are attached
        // to it to shadow them
        Scriptable obj = cx.newObject(he, error_constructor, args);
        toJsObject(scope, obj);

        // ACRE_INTERNAL is a bogus source file name, 0 is line number
        return new JavaScriptException(obj, "ACRE_INTERNAL", 0);
    }

    public JavaScriptException newJSException(Scriptable scope) {
        Scriptable obj = toJSError(scope);

        // ACRE_INTERNAL is a bogus source file name, 0 is line number
        return new JavaScriptException(obj, "ACRE_INTERNAL", 0);
    }

}
