package com.metaweb.util.javascript.DOM;

import javax.xml.parsers.DocumentBuilderFactory;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DOMException;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

public class JSDocument extends JSNode {

    private static final long serialVersionUID = 4518158334015139097L;

    public JSDocument() { }

    public JSDocument(Document doc, Scriptable scope) {
        _wrapped = doc;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        Document doc = null;
        if (args.length == 0) {
            try {
                doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
            } catch (Exception e) {
                /// XXX throw a JS exception if this fails...
            }
        } else {
            doc = ((JSDocument)args[0]).getWrapped();
        }
        return new JSDocument(doc, scope);
    }

    public String getClassName() {
        return "Document";
    }

    public Scriptable jsGet_doctype() {
        return JSNode.makeByNodeType(((Document)_wrapped).getDoctype(), _scope);
    }

    public Scriptable jsGet_implementation() {
        return (new JSDOMImplementation(((Document)_wrapped).getImplementation(), _scope)).makeJSInstance();

    }

    public Scriptable jsGet_documentElement() {
        return JSNode.makeByNodeType(((Document)_wrapped).getDocumentElement(), _scope);
    }

    public Scriptable jsFunction_createElement(String tagName) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).createElement(tagName), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_createDocumentFragment() {
        return JSNode.makeByNodeType(((Document)_wrapped).createDocumentFragment(), _scope);
    }

    public Scriptable jsFunction_createTextNode(String data) {
        return JSNode.makeByNodeType(((Document)_wrapped).createTextNode(data), _scope);
    }

    public Scriptable jsFunction_createComment(String data) {
        return JSNode.makeByNodeType(((Document)_wrapped).createComment(data), _scope);
    }

    public Scriptable jsFunction_createCDATASection(String data) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).createCDATASection(data), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_createProcessingInstruction(String target, String data) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).createProcessingInstruction(target, data), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_createAttribute(String name) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).createAttribute(name), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_createEntityReference(String name) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).createEntityReference(name), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_getElementsByTagName(String tagName) {
        NodeList nodes = ((Document)_wrapped).getElementsByTagName(tagName);
        if (nodes != null) {
            return (new JSNodeList(nodes, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public Scriptable jsFunction_importNode(JSNode importedNode, Boolean deep) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).importNode(importedNode.getWrapped(), deep), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_createElementNS(String namespaceURI, String qualifiedName) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).createElementNS(namespaceURI, qualifiedName), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_createAttributeNS(String namespaceURI, String qualifiedName) {
        try {
            return JSNode.makeByNodeType(((Document)_wrapped).createAttributeNS(namespaceURI, qualifiedName), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_getElementsByTagNameNS(String namespaceURI, String localName) {
        NodeList nodes = ((Document)_wrapped).getElementsByTagNameNS(namespaceURI, localName);
        if (nodes != null) {
            return (new JSNodeList(nodes, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public Scriptable jsFunction_getElementById(String elementId) {
        return JSNode.makeByNodeType(((Document)_wrapped).getElementById(elementId), _scope);
    }

    public Document getWrapped() {
        return ((Document)_wrapped);
    }
}
