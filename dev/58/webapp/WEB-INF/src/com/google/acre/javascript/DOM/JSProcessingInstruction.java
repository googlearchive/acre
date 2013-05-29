package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DOMException;
import org.w3c.dom.ProcessingInstruction;

public class JSProcessingInstruction extends JSNode {

    private static final long serialVersionUID = -2049062532969785165L;

    public JSProcessingInstruction() { }

    public JSProcessingInstruction(ProcessingInstruction procins, Scriptable scope) {
        _wrapped = procins;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSProcessingInstruction(((JSProcessingInstruction)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "ProcessingInstruction";
    }

    public String jsGet_target() {
        return ((ProcessingInstruction)_wrapped).getTarget();
    }

    public String jsGet_data() {
        return ((ProcessingInstruction)_wrapped).getData();
    }

    public void jsSet_data(String data) {
        try {
            ((ProcessingInstruction)_wrapped).setData(data);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public ProcessingInstruction getWrapped() {
        return ((ProcessingInstruction)_wrapped);
    }
}
