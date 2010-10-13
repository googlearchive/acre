package com.google.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DOMException;
import org.w3c.dom.Text;

public class JSText extends JSCharacterData {
    private static final long serialVersionUID = -492351481304833268L;

    public JSText() { }

    public JSText(Text text, Scriptable scope) {
        _wrapped = text;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        Text text = ((JSText)args[0]).getWrapped();
        return new JSText(text, scope);
    }

    public String getClassName() {
        return "Text";
    }

    public Scriptable jsFunction_splitText(int offset) {
        try {
            return JSNode.makeByNodeType(((Text)_wrapped).splitText(offset), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Text getWrapped() {
        return ((Text)_wrapped);
    }
}
