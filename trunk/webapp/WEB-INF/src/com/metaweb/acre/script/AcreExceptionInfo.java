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



package com.metaweb.acre.script;

import java.util.ArrayList;
import java.util.List;

import org.mozilla.javascript.EcmaError;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.RhinoException;
import org.mozilla.javascript.Scriptable;

import com.metaweb.acre.Configuration;
import com.metaweb.acre.util.exceptions.AcreThreadDeath;
import com.metaweb.util.javascript.JSON;
import com.metaweb.util.javascript.JSONException;

public class AcreExceptionInfo extends JsConvertable {
    
    private boolean HIDE_INTERNAL_JS_STACK = Configuration.Values.HIDE_ACREBOOT_STACK.getBoolean();

    public String script_name;
    public String script_app;
    public String script_id;
    public String name;
    public String message;
    public String filename;
    public int line;
    public String info_json;

    public List<AcreStackFrame> stack = new ArrayList<AcreStackFrame>();

    public AcreExceptionInfo(String sname, String app, String id, String msg, Throwable t, ScriptManager scriptManager, Scriptable _scope) {

        script_name = sname;
        script_app = app;
        script_id = id;
        name = "Error";
        message = msg;
        filename = null;
        line = 0;

        if (t instanceof RhinoException) {
            
            // RhinoException adds the source file and line number to getMessage(),
            //  which we grab separately
            RhinoException re = (RhinoException) t;
            message += ": " + re.details();

            String sourceName = re.sourceName();

            if (! sourceName.equals("")) {
                CachedScript script = scriptManager.getScriptBySourceName(sourceName);
                if (script == null) {
                    int separator = sourceName.indexOf('$'); 
                    if (separator != -1) {
                        sourceName = sourceName.substring(0,separator);
                    }
                    filename = sourceName;
                } else {
                    filename = script.getScriptName();
                }
    
                line = re.lineNumber();
                if (script != null) {
                    line = script.mapLineNumber(line);
                }
            }
        }

        // EcmaError has an associated exception name
        if (t instanceof EcmaError) {
            name = ((EcmaError) t).getName();

            // for syntax errors, don't report any stack - 
            // it's not useful and it can be confusing
            if (name.equals("SyntaxError"))
                return;
        }

        // if it's a js exception, save the ".info" property for the error script
        // the .info must be serializable as JSON so that it can be passed from
        // the request scope (where the error occurred) to the error handler
        // scope.
        if (t instanceof JavaScriptException) {
            JavaScriptException jse = (JavaScriptException) t;
            info_json = null;

            // pull out the actual object thrown in js
            Object v = jse.getValue();
            if (v instanceof Scriptable) {
                Scriptable excobj = (Scriptable) v;
                try {
                    Object info = excobj.get("info", excobj);
                    if (info != Scriptable.NOT_FOUND)
                        info_json = JSON.stringify(info, null, _scope);
                } catch (JSONException e) {
                    try {
                        info_json = JSON.stringify(e.getMessage(), null, _scope);
                    } catch (JSONException ee) {
                        info_json = "\"Internal error saving error info\"";
                    }
                }
            }
        }

        // AcreThreadDeath may be inserted by the Supervisor thread
        // using Thread.stop(), in which case we need to get the stack
        // out of the exception specially.
        StackTraceElement[] frames = null;
        if (t instanceof AcreThreadDeath) {
            AcreThreadDeath err = (AcreThreadDeath) t;
            if (err.stack != null)
                frames = err.stack;
        }

        if (frames == null)
            frames = t.getStackTrace();

        // turn java stack into an array of AcreStackFrame
        for (StackTraceElement rawframe : frames) {
            AcreStackFrame frame = new AcreStackFrame(rawframe);

            if (frame.line < 0) {
                continue;
            }
            
            CachedScript script = scriptManager.getScriptBySourceName(frame.filename);

            if (script != null) {
                frame.filename = script.getScriptName();
                frame.line = script.mapLineNumber(frame.line);
            } else if (HIDE_INTERNAL_JS_STACK) {
                // if we don't have a mapped filename for it, it was an internal script
                continue;
            } else {
                // XXX should have an array like _filenamesByHash for system
                // scripts to handle this case.  for now, drop through with the
                // ugly frame.filename...
            }

            // if we didn't get any filename information yet (i.e. not a RhinoException)
            //  then get them from the newest stack frame.
            // note that we don't remove it from the stack - the error display
            //  script can do that if it wants.
            if (filename == null) {
                filename = frame.filename;
                line = frame.line;
            }

            stack.add(frame);
        }
    }
}
