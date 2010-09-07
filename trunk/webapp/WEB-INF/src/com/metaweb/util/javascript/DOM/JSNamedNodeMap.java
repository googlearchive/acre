package com.metaweb.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DOMException;
import org.w3c.dom.NamedNodeMap;

import com.metaweb.util.javascript.JSObject;

public class JSNamedNodeMap extends JSObject {

    private static final long serialVersionUID = -9027644357738185448L;
    
    private Object _wrapped;

    public JSNamedNodeMap() { }

    public JSNamedNodeMap(NamedNodeMap nodemap, Scriptable scope) {
        _wrapped = nodemap;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        NamedNodeMap nodemap = ((JSNamedNodeMap)args[0]).getWrapped();
        return new JSNamedNodeMap(nodemap, scope);
    }

    public String getClassName() {
        return "NamedNodeMap";
    }

    public int jsGet_length() {
        return ((NamedNodeMap)_wrapped).getLength();
    }

    public Scriptable jsFunction_getNamedItem(String name) {
        return JSNode.makeByNodeType(((NamedNodeMap)_wrapped).getNamedItem(name), _scope);
    }

    public Scriptable jsFunction_setNamedItem(JSNode arg) {
        try {
            return JSNode.makeByNodeType(((NamedNodeMap)_wrapped).setNamedItem(arg.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_removeNamedItem(String name) {
        try {
            return JSNode.makeByNodeType(((NamedNodeMap)_wrapped).removeNamedItem(name), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_item(int index) {
        return JSNode.makeByNodeType(((NamedNodeMap)_wrapped).item(index), _scope);
    }

    public Scriptable jsFunction_getNamedItemNS(String namespaceURI, String localName) {
        return JSNode.makeByNodeType(((NamedNodeMap)_wrapped).getNamedItemNS(namespaceURI, localName), _scope);
    }

    public Scriptable jsFunction_setNamedItemNS(JSNode arg) {
        try {
            return JSNode.makeByNodeType(((NamedNodeMap)_wrapped).setNamedItemNS(arg.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_removeNamedItemNS(String namespaceURI, String localName) {
        try {
            return JSNode.makeByNodeType(((NamedNodeMap)_wrapped).removeNamedItemNS(namespaceURI, localName), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Object get(int index, Scriptable start) {
        return jsFunction_item(index);
    }

    public NamedNodeMap getWrapped() {
        return ((NamedNodeMap)_wrapped);
    }
}
