package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.DocumentType;
import org.w3c.dom.NamedNodeMap;

public class JSDocumentType extends JSNode {

    private static final long serialVersionUID = -2353584034625720159L;

    public JSDocumentType() { }

    public JSDocumentType(DocumentType doctype, Scriptable scope) {
        _wrapped = doctype;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        DocumentType doctype = ((JSDocumentType)args[0]).getWrapped();
        return new JSDocumentType(doctype, scope);
    }

    public String getClassName() {
        return "DocumentType";
    }

    public String jsGet_name() {
        return ((DocumentType)_wrapped).getName();
    }

    public Scriptable jsGet_entities() {
        NamedNodeMap map = ((DocumentType)_wrapped).getEntities();
        if (map != null) {
            return (new JSNamedNodeMap(map, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public Scriptable jsGet_notations() {
        NamedNodeMap map = ((DocumentType)_wrapped).getNotations();
        if (map != null) {
            return (new JSNamedNodeMap(map, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public String jsGet_publicId() {
        return ((DocumentType)_wrapped).getPublicId();
    }

    public String jsGet_systemId() {
        return ((DocumentType)_wrapped).getSystemId();
    }

    public String jsGet_internalSubset() {
        return ((DocumentType)_wrapped).getInternalSubset();
    }

    public DocumentType getWrapped() {
        return ((DocumentType)_wrapped);
    }
}
