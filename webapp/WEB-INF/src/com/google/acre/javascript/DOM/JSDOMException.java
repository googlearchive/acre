package com.google.acre.javascript.DOM;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.FunctionObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.javascript.JSObject;

public class JSDOMException extends JSObject {

    private static final long serialVersionUID = 1L;

    public int code;

    private static String[] _staticConstants = {"INDEX_SIZE_ERR", "DOMSTRING_SIZE_ERR",
        "HIERARCHY_REQUEST_ERR",  "WRONG_DOCUMENT_ERR", "INVALID_CHARACTER_ERR",
        "NO_DATA_ALLOWED_ERR", "NO_MODIFICATION_ALLOWED_ERR", "NOT_FOUND_ERR",
        "NOT_SUPPORTED_ERR", "INUSE_ATTRIBUTE_ERR", "INVALID_STATE_ERR",
        "SYNTAX_ERR", "INVALID_MODIFICATION_ERR", "NAMESPACE_ERR",
        "INVALID_ACCESS_ERR" };

    public JSDOMException() { }

    public JSDOMException(int incode, Scriptable scope) {
        code = incode;
        _scope = scope;
     }

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDOMException(((JSDOMException)args[0]).code, scope);
    }

    @SuppressWarnings("boxing")
    public static void finishInit(Scriptable scope, FunctionObject ctor, Scriptable proto) {
        int i = 1;
        for (String cnst : _staticConstants) {
            FunctionObject.defineProperty(ctor, cnst, i++, ScriptableObject.READONLY | ScriptableObject.DONTENUM);
        }
    }

    public String getClassName() {
        return "DOMException";
    }

    public int jsGet_code() {
        return code;
    }

    public void jsSet_code(int code) {
        this.code = code;
    }
}
