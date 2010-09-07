package com.metaweb.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.Notation;

public class JSNotation extends JSNode {
    private static final long serialVersionUID = -8149033502847579356L;

    public JSNotation() { }

    public JSNotation(Notation notation, Scriptable scope) {
        _wrapped = notation;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        Notation notation = ((JSNotation)args[0]).getWrapped();
        return new JSNotation(notation, scope);
    }

    public String getClassName() {
        return "Notation";
    }

    public String jsGet_publicId() {
        return ((Notation)_wrapped).getPublicId();
    }

    public String jsGet_systemId() {
        return ((Notation)_wrapped).getSystemId();
    }

    public Notation getWrapped() {
        return ((Notation)_wrapped);
    }
}
