package com.google.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.CDATASection;

public class JSCDATASection extends JSText {

    private static final long serialVersionUID = 1L;

    public JSCDATASection() { }

    public JSCDATASection(CDATASection cdata, Scriptable scope) {
        _wrapped = cdata;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSCDATASection(((JSCDATASection)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "CDATASection";
    }

    public CDATASection getWrapped() {
        return ((CDATASection)_wrapped);
    }
}
