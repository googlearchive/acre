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

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;

import com.google.acre.javascript.JSObject;
/**
 *  Superclass for Java objects that can be converted to JS objects.
 *
 *  These are handy for generating statically typed structures in
 *  Java that must be turned into JS objects later on.
 */
public class JsConvertable {

    // XXX TODO:
    //   handle arrays as well as HashMaps
    //   fromJsObject() - for parsing dicts sent from js
    //   a subclass JsConvertableException which has a throwJsException() method
    //   subclasses of that for Acre exceptions that are intended for catching in js.

    public Scriptable toJsObject(Scriptable scope) {
        return toJsObject(scope, null);
    }
    /*
    static public Object _convertDynamic(Scriptable scope, Object value) {
        // we have no static type info here, so conversion rules are a little
        // different from when there is a typed java field.
        // - based on instanceof rather than isAssignableFrom
        if (value instanceof JsConvertable) {
            return ((JsConvertable) value).toJsObject(scope);
        } else {
            return value;
        }
    }
    */

    static public Object _convertStatic(Scriptable scope, Object value, Class<?> vclass) {
        Context cx = Context.getCurrentContext();

        if (vclass == null) {
            vclass = value.getClass();
        }

        if (String.class.isAssignableFrom(vclass) || vclass.isPrimitive()) {
            return value;
        } else if (JsConvertable.class.isAssignableFrom(vclass)) {
            if (value == null) {
                return null;
            }
            return ((JsConvertable)value).toJsObject(scope);
        } else if (value instanceof String) {
            return value;
        } else if (value instanceof JSObject) {
            return ((JSObject)value).makeJSInstance(scope);
        } else if (value instanceof Date) {
            return cx.newObject(scope, "Date", new Object[] { ((Date)value).getTime() });

        // XXX share these with convertDynamic
        } else if (value instanceof Map) {
            Scriptable o = cx.newObject(scope);
            Map<?,?> map = (Map<?,?>) value;
            for (Map.Entry<?,?> entry : map.entrySet()) {
                o.put((String) entry.getKey(), o, _convertStatic(scope, entry.getValue(), null));
            }
            return o;
        } else if (value instanceof List) {
            List<?> list = (List<?>) value;
            Scriptable o = cx.newArray(scope, list.size());
            int vindex = 0;
            for (Object item : list) {
                o.put(vindex++, o, _convertStatic(scope, item, null));
            }
            return o;
        } else {
            //System.err.println("skipping field  " + name + (vclass.isPrimitive() ? "prim" : "  " ) + vclass.getName());
            // XXX should return undefined?
            return null;
        }
    }

    public Scriptable toJsObject(Scriptable scope, Scriptable existing_obj) {
        Context cx = Context.getCurrentContext();
        Class<? extends JsConvertable> clazz = getClass();

        Scriptable obj = existing_obj;
        if (obj == null) {
            obj = cx.newObject(scope);
        }

        for (Field f : clazz.getFields()) {
            if ((f.getModifiers() & Modifier.PUBLIC) == 0) {
                continue;
            }

            if (f.isSynthetic()) {
                continue;
            }

            String name = f.getName();
            if (name.charAt(0) == '_') {
                continue;
            }

            try {
                Class<?> vclass = f.getType();
                Object value = f.get(this);

                //System.err.println("JSConv " + name + "  " + vclass.getName() + "   " + (value == null ? "null" : ""));

                Object jsval = _convertStatic(scope, value, vclass);
                obj.put(name, obj, jsval);
            } catch (IllegalAccessException e) {
                throw new RuntimeException("JSConvert " + name + "  failed - IllegalAccessException");
            }

        }        
        
        return obj;
    }
}
