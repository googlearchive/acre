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

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.script.AnnotatedForJS;
import com.google.acre.script.JS_Function;
import com.google.acre.script.exceptions.AcreInternalError;

public class JSUtil {
    
    private static Map<Class<? extends AnnotatedForJS>, String[]> funcCache = new HashMap<Class<? extends AnnotatedForJS>, String[]> ();

    public static ScriptableObject makeBasicScriptable(AnnotatedForJS annotatedObj) {
        ScriptableObject jsobj = (ScriptableObject)Context.getCurrentContext().newObject(annotatedObj.getScope());
        populateScriptable(jsobj, annotatedObj);
        return jsobj;
    }
    
    public static void populateScriptable(ScriptableObject targetJSsobj, AnnotatedForJS srcAnnotatedObj) {
    	Class<? extends AnnotatedForJS> clazz = srcAnnotatedObj.getClass();
        try {
            // let's cache all the relevant METHOD names for this class
            String [] methodNames = funcCache.get(clazz);
            if (methodNames == null) {
                Method[] methods = clazz.getDeclaredMethods();
                Collection<String> names = new ArrayList<String>();
                for (Method m : methods) {
                    JS_Function jsf = m.getAnnotation(JS_Function.class);
                    if (jsf != null) {
                        names.add(m.getName());
                    }
                }
                methodNames = new String[names.size()];
                int i = 0;
                for (String name : names) { methodNames[i++] = name; } 
                funcCache.put(clazz, methodNames);
            } 
            
            if (methodNames.length > 0) {
                targetJSsobj.defineFunctionProperties(methodNames, targetJSsobj.getClass(), 0 );
            }
            
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new AcreInternalError("populateScriptable Failed", e);
        }
        
    }
}
