package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.Entity;

public class JSEntity extends JSNode {
    private static final long serialVersionUID = 9126388657284389248L;

    public JSEntity() { }

    public JSEntity(Entity entity, Scriptable scope) {
        _wrapped = entity;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        Entity entity = ((JSEntity)args[0]).getWrapped();
        return new JSEntity(entity, scope);
    }

    public String getClassName() {
        return "Entity";
    }

    public String jsGet_publicId() {
        return ((Entity)_wrapped).getPublicId();
    }

    public String jsGet_systemId() {
        return ((Entity)_wrapped).getSystemId();
    }

    public String jsGet_notationName() {
        return ((Entity)_wrapped).getNotationName();
    }

    public Entity getWrapped() {
        return ((Entity)_wrapped);
    }
}
