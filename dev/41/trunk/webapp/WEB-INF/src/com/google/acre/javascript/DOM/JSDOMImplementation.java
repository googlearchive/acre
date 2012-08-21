package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DOMException;
import org.w3c.dom.DOMImplementation;

import com.google.acre.javascript.JSObject;

public class JSDOMImplementation extends JSObject {

    private static final long serialVersionUID = -3631842348429183888L;

    private Object _wrapped;

    public JSDOMImplementation() { }

    public JSDOMImplementation(DOMImplementation di, Scriptable scope) {
        _wrapped = di;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDOMImplementation(((JSDOMImplementation)args[0]).getWrapped(), scope);
    }

    public String getClassName() {
        return "DOMImplementation";
    }

    public boolean jsFunction_hasFeature(String feature, String version) {
        return ((DOMImplementation)_wrapped).hasFeature(feature, version);
    }

    public Scriptable createDocumentType(String qualifiedName, String publicId, String systemId) {
        try {
            return JSNode.makeByNodeType(((DOMImplementation)_wrapped).createDocumentType(qualifiedName, publicId, systemId), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable createDocument(String namespaceURI, String qualifiedName, JSDocumentType doctype) {
        try {
            return JSNode.makeByNodeType(((DOMImplementation)_wrapped).createDocument(namespaceURI, qualifiedName, doctype.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public DOMImplementation getWrapped() {
        return ((DOMImplementation)_wrapped);
    }
}
