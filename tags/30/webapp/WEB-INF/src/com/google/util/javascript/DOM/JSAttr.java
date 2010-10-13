package com.google.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.Attr;
import org.w3c.dom.DOMException;

public class JSAttr extends JSNode {

    private static final long serialVersionUID = 7158951902693038805L;

    public JSAttr() { }

    public JSAttr(Attr attr, Scriptable scope) {
        _wrapped = attr;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSAttr(((JSAttr)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "Attr";
    }

    public String jsGet_name() {
        return ((Attr)_wrapped).getName();
    }

    public boolean jsGet_specified() {
        return ((Attr)_wrapped).getSpecified();
    }

    public Scriptable jsGet_ownerElement() {
        return JSNode.makeByNodeType(((Attr)_wrapped).getOwnerElement(), _scope);
    }

    public String jsGet_value() {
        return ((Attr)_wrapped).getValue();
    }

    public void jsSet_value(String val) {
        try {
            ((Attr)_wrapped).setValue(val);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(),"",0);
        }
    }

    public Attr getWrapped() {
        return ((Attr)_wrapped);
    }
}
