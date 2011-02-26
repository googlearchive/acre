package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DocumentFragment;

public class JSDocumentFragment extends JSNode {

    private static final long serialVersionUID = 856164948930243365L;

    public JSDocumentFragment() { }

    public JSDocumentFragment(DocumentFragment docfrag, Scriptable scope) {
        _wrapped = docfrag;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDocumentFragment(((JSDocumentFragment)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "DocumentFragment";
    }

    public DocumentFragment getWrapped() {
        return ((DocumentFragment)_wrapped);
    }
}
