package com.metaweb.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.NodeList;

import com.metaweb.util.javascript.JSObject;

public class JSNodeList extends JSObject {

    private static final long serialVersionUID = -6538188524200220002L;

    private Object _wrapped;

    public JSNodeList() { }

    public JSNodeList(NodeList nodelist, Scriptable scope) {
        _wrapped = nodelist;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        NodeList nodelist = ((JSNodeList)args[0]).getWrapped();
        return new JSNodeList(nodelist, scope);
    }

    public String getClassName() {
        return "NodeList";
    }

    public int jsGet_length() {
        return ((NodeList)_wrapped).getLength();
    }

    public Scriptable jsFunction_item(int index) {
        return JSNode.makeByNodeType(((NodeList)_wrapped).item(index), _scope);
    }

    public Object get(int index, Scriptable start) {
        return jsFunction_item(index);
    }

    public NodeList getWrapped() {
        return ((NodeList)_wrapped);
    }
}
