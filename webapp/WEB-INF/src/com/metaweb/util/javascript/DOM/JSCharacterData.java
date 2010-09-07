package com.metaweb.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.CharacterData;
import org.w3c.dom.DOMException;

public class JSCharacterData extends JSNode {

    private static final long serialVersionUID = -1218047215940034180L;

    public JSCharacterData() { }

    public JSCharacterData(CharacterData chardata, Scriptable scope) {
        _wrapped = chardata;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSCharacterData(((JSCharacterData)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "CharacterData";
    }

    public String jsGet_data() {
        try {
            return ((CharacterData)_wrapped).getData();
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }

    public void jsSet_data(String data) {
        try {
            ((CharacterData)_wrapped).setData(data);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }

    public int jsGet_length() {
        return ((CharacterData)_wrapped).getLength();
    }

    public String jsFunction_substringData(int offset, int count) {
        try {
            return ((CharacterData)_wrapped).substringData(offset, count);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }

    public void jsFunction_appendData(String arg) {
        try {
            ((CharacterData)_wrapped).appendData(arg);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }

    public void jsFunction_insertData(int offset, String arg) {
        try {
            ((CharacterData)_wrapped).insertData(offset, arg);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }
    
    public void jsFunction_deleteData(int offset, int count) {
        try {
            ((CharacterData)_wrapped).deleteData(offset, count);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }

    public void jsFunction_replaceData(int offset, int count, String arg) {
        try {
            ((CharacterData)_wrapped).replaceData(offset, count, arg);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }

    public CharacterData getWrapped() {
        return ((CharacterData)_wrapped);
    }
}
