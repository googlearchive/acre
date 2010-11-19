package com.google.util.javascript.DOM;

import org.apache.xerces.parsers.DOMParser;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

import com.google.util.DOM.LineCountingHTMLParser;
import com.google.util.DOM.LineCountingXMLParser;
import com.google.util.javascript.JSObject;

public class JSDOMParser extends JSObject {
    
    private static final long serialVersionUID = 6017350835497684395L;

    private transient DOMParser _htmlParser;
    private transient DOMParser _xmlParser;
    private transient DOMParser _xmlParserWithNamespaces;

    public JSDOMParser() { }

    public JSDOMParser(Scriptable scope) throws Exception {
        _scope = scope;
        _xmlParser = new LineCountingXMLParser(false);
        _xmlParserWithNamespaces = new LineCountingXMLParser(true);
        _htmlParser = new LineCountingHTMLParser();
    }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        try {
            return new JSDOMParser(scope);
        } catch (Exception e) {
            throw new JavaScriptException(e, "", 0);
        }
    }

    public String getClassName() {
        return "DOMParser";
    }
    
    public Scriptable jsFunction_parse_file(String path, String mode) throws Exception {
        return parse(new InputSource(new java.io.FileInputStream(path)),mode);
    }

    public Scriptable jsFunction_parse_string(String str, String mode) throws Exception {
        return parse(new InputSource(new java.io.StringReader(str)),mode);
    }

    protected Scriptable parse(InputSource source, String mode) throws Exception {
        try {
            if ("html".equalsIgnoreCase(mode)) {
                _htmlParser.parse(source);
            } else {
                _xmlParser.parse(source);
            }
        } catch (org.xml.sax.SAXParseException e) {
            JSDOMParserException jse = new JSDOMParserException(e.getMessage(), e.getLineNumber(), e.getColumnNumber(), _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
        
        if ("html".equalsIgnoreCase(mode)) {
            Document doc = _htmlParser.getDocument();
            doc.normalizeDocument();
            return JSNode.makeByNodeType(_htmlParser.getDocument(), _scope);
        } else {
            Document doc = _xmlParser.getDocument();
            doc.normalizeDocument();
            return JSNode.makeByNodeType(_xmlParser.getDocument(), _scope);
        }
    }
    
    public Scriptable jsFunction_parse_ns_file(String path, String mode) throws Exception {
        return parse_ns(new InputSource(new java.io.FileInputStream(path)),mode);
    }

    public Scriptable jsFunction_parse_ns_string(String str, String mode) throws Exception {
        return parse_ns(new InputSource(new java.io.StringReader(str)),mode);
    }

    protected Scriptable parse_ns(InputSource source, String mode) throws Exception {
        try {
            if ("html".equalsIgnoreCase(mode)) {
                throw new RuntimeException("namespace-aware mode works only for XML");
            } else {
                _xmlParserWithNamespaces.parse(source);
                Document doc = _xmlParserWithNamespaces.getDocument();
                doc.normalizeDocument();
                return JSNode.makeByNodeType(_xmlParser.getDocument(), _scope);
            }
        } catch (org.xml.sax.SAXParseException e) {
            JSDOMParserException jse = new JSDOMParserException(e.getMessage(), e.getLineNumber(), e.getColumnNumber(), _scope);
            throw new JavaScriptException(jse.makeJSInstance(), "", 0);
        }
    }
}
