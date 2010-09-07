package com.metaweb.util.javascript.DOM;

import java.lang.reflect.Constructor;
import java.util.HashMap;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.FunctionObject;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.Attr;
import org.w3c.dom.CDATASection;
import org.w3c.dom.Comment;
import org.w3c.dom.DOMException;
import org.w3c.dom.Document;
import org.w3c.dom.DocumentFragment;
import org.w3c.dom.DocumentType;
import org.w3c.dom.Element;
import org.w3c.dom.Entity;
import org.w3c.dom.EntityReference;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.NodeList;
import org.w3c.dom.Notation;
import org.w3c.dom.ProcessingInstruction;
import org.w3c.dom.Text;

import com.metaweb.util.javascript.JSObject;

public class JSNode extends JSObject {

    private static final long serialVersionUID = 5887926692160582969L;

    protected Object _wrapped;

    private static HashMap<Integer, Class<?>[]> nodemap;

    private static String[] _staticConstants = { "ELEMENT_NODE", "ATTRIBUTE_NODE",
        "TEXT_NODE", "CDATA_SECTION_NODE", "ENTITY_REFERENCE_NODE", "ENTITY_NODE",
        "PROCESSING_INSTRUCTION_NODE", "COMMENT_NODE", "DOCUMENT_NODE",
        "DOCUMENT_TYPE_NODE", "DOCUMENT_FRAGMENT_NODE", "NOTATION_NODE" };

    static {
        nodemap = new HashMap<Integer, Class<?>[]>();
        nodemap.put(1, new Class[] {JSElement.class, Element.class});
        nodemap.put(2, new Class[] {JSAttr.class, Attr.class});
        nodemap.put(3, new Class[] {JSText.class, Text.class});
        nodemap.put(4, new Class[] {JSCDATASection.class, CDATASection.class});
        nodemap.put(5, new Class[] {JSEntityReference.class, EntityReference.class});
        nodemap.put(6, new Class[] {JSEntity.class, Entity.class});
        nodemap.put(7, new Class[] {JSProcessingInstruction.class, ProcessingInstruction.class});
        nodemap.put(8, new Class[] {JSComment.class, Comment.class});
        nodemap.put(9, new Class[] {JSDocument.class, Document.class});
        nodemap.put(10, new Class[] {JSDocumentType.class, DocumentType.class});
        nodemap.put(11, new Class[] {JSDocumentFragment.class, DocumentFragment.class});
        nodemap.put(12, new Class[] {JSNotation.class, Notation.class});
    }

    public JSNode() { }

    public JSNode(org.w3c.dom.Node node, Scriptable scope) {
        _wrapped = node;
        _scope = scope;
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSNode(((JSNode)args[0]).getWrapped(), scope);
    }

    public static void finishInit(Scriptable scope, FunctionObject ctor, Scriptable proto) {
        int i = 1;
        for (String cnst : _staticConstants) {
            FunctionObject.defineProperty(ctor, cnst, i++, ScriptableObject.READONLY | ScriptableObject.DONTENUM);
        };
    }

    public static Scriptable makeByNodeType(org.w3c.dom.Node node, Scriptable scope) {
        if (node == null) return null;
        int i = node.getNodeType();
        Class<?>[] clses = nodemap.get(i);

        Class<?>[] params = { clses[1], Scriptable.class };
        Object[] args = { node, scope };
        try {
            Constructor<?> ctor = clses[0].getConstructor(params);
            JSObject ins = (JSObject)ctor.newInstance(args);
            return ins.makeJSInstance();
        } catch (Exception e) {
            /// XXX deal with me correctly
            throw new JavaScriptException("blah","",0);
        }
    }

    public String getClassName() {
        return "Node";
    }

    public String jsGet_nodeName() {
        return ((org.w3c.dom.Node)_wrapped).getNodeName();
    }

    public String jsGet_nodeValue() {
        try {
            return ((org.w3c.dom.Node)_wrapped).getNodeValue();
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            jse.jsSet_code(e.code);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public void jsSet_nodeValue(String val) {
        try {
            ((org.w3c.dom.Node)_wrapped).setNodeValue(val);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public int jsGet_nodeType() {
        return ((org.w3c.dom.Node)_wrapped).getNodeType();
    }

    public Scriptable jsGet_parentNode() {
        return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).getParentNode(), _scope);
    }

    public Scriptable jsGet_childNodes() {
        NodeList nodes = ((org.w3c.dom.Node)_wrapped).getChildNodes();
        if (nodes != null) {
            return (new JSNodeList(nodes, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public Scriptable jsGet_firstChild() {
        return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).getFirstChild(), _scope);
    }

    public Scriptable jsGet_lastChild() {
        return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).getLastChild(), _scope);
    }

    public Scriptable jsGet_previousSibling() {
        return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).getPreviousSibling(), _scope);
    }

    public Scriptable jsGet_nextSibling() {
        return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).getNextSibling(), _scope);
    }

    public Scriptable jsGet_attributes() {
        NamedNodeMap map = ((org.w3c.dom.Node)_wrapped).getAttributes();
        if (map != null) {
            return (new JSNamedNodeMap(map, _scope)).makeJSInstance();
        } else {
            return null;
        }
    }

    public Scriptable jsGet_ownerDocument() {
        return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).getOwnerDocument(), _scope);
    }

    public String jsGet_namespaceURI() {
        return ((org.w3c.dom.Node)_wrapped).getNamespaceURI();
    }

    public String jsGet_prefix() {
        return ((org.w3c.dom.Node)_wrapped).getPrefix();
    }

    public void jsSet_prefix(String val) {
        try {
            ((org.w3c.dom.Node)_wrapped).setPrefix(val);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public String jsGet_localName() {
        return ((org.w3c.dom.Node)_wrapped).getLocalName();
    }

    public Scriptable jsFunction_insertBefore(JSNode newChild, Object refChild) {
        try {
            if (refChild != null) {
                return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).insertBefore(newChild.getWrapped(), ((JSNode)refChild).getWrapped()), _scope);
            } else {
                return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).insertBefore(newChild.getWrapped(), null), _scope);
            }
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_replaceChild(JSNode newChild, JSNode refChild) {
        try {
            return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).replaceChild(newChild.getWrapped(), refChild.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_removeChild(JSNode oldChild) {
        try {
            return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).removeChild(oldChild.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public Scriptable jsFunction_appendChild(JSNode newChild) {
        try {
            return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).appendChild(newChild.getWrapped()), _scope);
        } catch (DOMException e) {
            JSDOMException jse = new JSDOMException(e.code, _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }

    public boolean jsFunction_hasChildNodes() {
        return ((org.w3c.dom.Node)_wrapped).hasChildNodes();
    }

    public Scriptable jsFunction_cloneNode(boolean deep) {
        return JSNode.makeByNodeType(((org.w3c.dom.Node)_wrapped).cloneNode(deep), _scope);
    }

    public void jsFunction_normalize() {
        ((org.w3c.dom.Node)_wrapped).normalize();
    }

    public boolean jsFunction_isSupported(String feature, String version) {
        return ((org.w3c.dom.Node)_wrapped).isSupported(feature, version);
    }

    public boolean jsFunction_hasAttributes() {
        return ((org.w3c.dom.Node)_wrapped).hasAttributes();
    }

    public String jsFunction_getUserData(String key) {
        if (key.equals("lineNumber")) {
            return ((String)((org.w3c.dom.Node)_wrapped).getUserData(key));
        } else if (key.equals("node_id")) {
            return "node_" + Integer.toString(((org.w3c.dom.Node) _wrapped).hashCode());
        } else {
            return null;
        }
    }

    public org.w3c.dom.Node getWrapped() {
        return ((org.w3c.dom.Node)_wrapped);
    }
}
