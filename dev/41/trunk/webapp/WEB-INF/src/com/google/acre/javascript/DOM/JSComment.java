package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.Comment;

public class JSComment extends JSCharacterData {

    private static final long serialVersionUID = 3986856046009222637L;

    public JSComment() { }

    public JSComment(Comment comment, Scriptable scope) {
        _wrapped = comment;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSComment(((JSComment)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "Comment";
    }

    public Comment getWrapped() {
        return ((Comment)_wrapped);
    }
}
