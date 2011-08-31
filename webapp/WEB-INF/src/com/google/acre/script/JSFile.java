// Copyright 2007-2010 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


package com.google.acre.script;

import java.io.File;
import java.io.FileInputStream;
import java.io.FilenameFilter;
import java.util.ArrayList;

import org.apache.commons.io.IOUtils;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.javascript.JSObject;

public class JSFile extends JSObject {

    private static final long serialVersionUID = -2872833828641940514L;
    
    private String _filename;
    private boolean _is_binary;

    public JSFile() { }

    public JSFile(Scriptable scope, String filename, Boolean is_binary) {
        _scope = scope;
        _filename = filename;
        _is_binary = is_binary.booleanValue();
    }

    public static Scriptable jsConstructor(Context cx, Object[] args,
                                           Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        try {
            return new JSFile(scope, (String) args[0], (Boolean) args[1]);
        } catch (Exception e) {
             return null;
        }
    }

    public String getClassName() {
        return "File";
    }

    public static Scriptable jsStaticFunction_files(Context cx, Scriptable thisObj,
                                              Object[] args, Function funObj) {
        String[] files;
        Scriptable scope = ScriptableObject.getTopLevelScope(funObj);

        class ArgLadenFilenameFilter implements FilenameFilter {
            private Object _matcher;
            private Scriptable _scope;
            private Scriptable _this;
            private Context _cx;

            public ArgLadenFilenameFilter(Context cx, Scriptable scope, 
                                          Scriptable thisObj, Object matcher) {
                _cx = cx;
                _scope = scope;
                _this = thisObj;
                _matcher = matcher;
            }

            public boolean accept(File dir, String fn) {
                if (_matcher instanceof Function) {
                    Object[] fnargs = new Object[] { fn };
                    return (Boolean) ((Function)_matcher).call(_cx, _scope, _this, fnargs);
                } else if (_matcher instanceof String) {
                    return fn.matches((String)_matcher);
                } else {
                    return false;
                }
            }
        }

        if (args.length == 1) {
            File dir = new File((String)args[0]);
            files = dir.list();
        } else if (args.length == 2) {
            File dir = new File((String)args[0]);
            FilenameFilter fnfilter = new ArgLadenFilenameFilter(cx, scope,
                                                                 thisObj, 
                                                                 args[1]);
            files = dir.list(fnfilter);
        } else {
            return null;
        }

        if (files == null) {
            return null;
        } else {
            ArrayList<Object> files_list = new ArrayList<Object>();
            for (String f : files) {
                files_list.add(f);
            }

            Scriptable res = cx.newArray(scope, files_list.toArray());
            return res;
        }
    }

    public static boolean jsStaticFunction_exists(String filename) {
        return new File(filename).exists();
    }

    public Object jsGet_body() {
        FileInputStream r = null;
        Object res = null;

        try {
            File f = new File(_filename);
            r = new FileInputStream(f);
            if (_is_binary == true) {
                byte[] bytes = IOUtils.toByteArray(r);
                res = new JSBinary();
                ((JSBinary)res).set_data(bytes);
                res = ((JSBinary)res).makeJSInstance(_scope);
            } else {
                res = IOUtils.toString(r, "utf-8");
            }
        } catch (java.io.IOException ioe) {
            return null;
        } finally {
            try {
                if (r != null) r.close();
            } catch (Exception e) {
                // ignore
            }
        }

        return res;
    }
    
    public boolean jsGet_dir() {
        File f = new File(_filename);
        return f.isDirectory();
    }

    public long jsGet_mtime() {
        File f = new File(_filename);
        return f.lastModified();
    }
}
