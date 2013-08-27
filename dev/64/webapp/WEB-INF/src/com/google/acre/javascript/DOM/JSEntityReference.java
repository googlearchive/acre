package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.EntityReference;

public class JSEntityReference extends JSNode {

    private static final long serialVersionUID = 8033439087317035407L;

    public JSEntityReference() { }

    public JSEntityReference(EntityReference entref, Scriptable scope) {
        _wrapped = entref;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        EntityReference entref = ((JSEntityReference)args[0]).getWrapped();
        return new JSEntityReference(entref, scope);
    }

    public String getClassName() {
        return "EntityReference";
    }

    public EntityReference getWrapped() {
        return ((EntityReference)_wrapped);
    }
}
