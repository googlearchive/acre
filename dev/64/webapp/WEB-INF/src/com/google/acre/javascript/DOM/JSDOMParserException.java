package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.javascript.JSObject;

public class JSDOMParserException extends JSObject {

    private static final long serialVersionUID = 1458963046407607404L;

    public String message;
    public int lineNumber;
    public int columnNumber;

    public JSDOMParserException() { }

    public JSDOMParserException(String msg, int ln, int coln, Scriptable scope) {
        message = msg;
        lineNumber = ln;
        columnNumber = coln;
        _scope = scope;
     }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDOMParserException(((JSDOMParserException)args[0]).message, ((JSDOMParserException)args[0]).lineNumber, ((JSDOMParserException)args[0]).columnNumber, scope);
    }

    public String getClassName() {
        return "DOMParserException";
    }

    public String jsGet_message() {
        return message;
    }

    public void jsSet_message(String msg) {
        message = msg;
    }

    public int jsGet_lineNumber() {
        return lineNumber;
    }

    public int jsGet_columnNumber() {
        return columnNumber;
    }

    public String toString() {
        return "[DOMParserException error: " + message + " at line " + lineNumber + " and column " + columnNumber +"]";
    }

    public String jsFunction_toString() {
        return "[DOMParserException error: " + message + " at line " + lineNumber + " and column " + columnNumber +"]";
    }
}
