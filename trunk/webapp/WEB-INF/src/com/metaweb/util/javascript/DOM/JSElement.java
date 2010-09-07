package com.metaweb.util.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DOMException;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

public class JSElement extends JSNode {

    private static final long serialVersionUID = -8360028075684545989L;

    public JSElement() { }

    public JSElement(Element element, Scriptable scope) {
        _wrapped = element;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSElement(((JSElement)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "Element";
    }

    public String jsGet_tagName() {
        return ((Element)_wrapped).getTagName();
    }

    public String jsFunction_getAttribute(String name) {
        return ((Element)_wrapped).getAttribute(name);
    }

    public void jsFunction_setAttribute(String name, String value) {
        try {
            ((Element)_wrapped).setAttribute(name, value);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public void jsFunction_removeAttribute(String name) {
        try {
            ((Element)_wrapped).removeAttribute(name);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_getAttributeNode(String name) {
        return JSNode.makeByNodeType(((Element)_wrapped).getAttributeNode(name), _scope);
    }

    public Scriptable jsFunction_setAttributeNode(JSAttr newAttr) {
        try {
            return JSNode.makeByNodeType(((Element)_wrapped).setAttributeNode(newAttr.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_removeAttributeNode(JSAttr oldAttr) {
        try {
            return JSNode.makeByNodeType(((Element)_wrapped).removeAttributeNode(oldAttr.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_getElementsByTagName(String name) {
        NodeList nodes = ((Element)_wrapped).getElementsByTagName(name);
        if (nodes != null) {
            return (new JSNodeList(nodes, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public String jsFunction_getAttributeNS(String namespaceURI, String localName) {
        return ((Element)_wrapped).getAttributeNS(namespaceURI, localName);
    }

    public void jsFunction_setAttributeNS(String namespaceURI, String qualifiedName, String value) {
        try {
            ((Element)_wrapped).setAttributeNS(namespaceURI, qualifiedName, value);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public void jsFunction_removeAttributeNS(String namespaceURI, String localName) {
        try {
            ((Element)_wrapped).removeAttributeNS(namespaceURI, localName);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_getAttributeNodeNS(String namespaceURI, String localName) {
        return JSNode.makeByNodeType(((Element)_wrapped).getAttributeNodeNS(namespaceURI, localName), _scope);
    }

    public Scriptable jsFunction_setAttributeNodeNS(JSAttr newAttr) {
        try {
            return JSNode.makeByNodeType(((Element)_wrapped).setAttributeNodeNS(newAttr.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_getElementsByTagNameNS(String namespaceURI, String localName) {
        NodeList nodes = ((Element)_wrapped).getElementsByTagNameNS(namespaceURI, localName);
        if (nodes != null) {
            return (new JSNodeList(nodes, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public boolean jsFunction_hasAttribute(String name) {
        return ((Element)_wrapped).hasAttribute(name);
    }

    public boolean jsFunction_hasAttributeNS(String namespaceURI, String localName) {
        return ((Element)_wrapped).hasAttributeNS(namespaceURI, localName);
    }

    public Element getWrapped() {
        return ((Element)_wrapped);
    }
}
