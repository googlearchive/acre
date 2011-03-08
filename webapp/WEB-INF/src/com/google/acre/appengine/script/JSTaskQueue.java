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

package com.google.acre.appengine.script;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.taskqueue.Queue;
import com.google.appengine.api.taskqueue.QueueFactory;
import com.google.appengine.api.taskqueue.TaskOptions;
import com.google.appengine.api.taskqueue.TaskOptions.Builder;

public class JSTaskQueue extends JSObject {
    
    private static final long serialVersionUID = -1263167057274434063L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSTaskQueue(scope);
    }
    
    private Queue _queue;
    
    // ------------------------------------------------------------------------------------------

    public JSTaskQueue() { }
    
    public JSTaskQueue(Scriptable scope) {
        _scope = scope;
        _queue = QueueFactory.getDefaultQueue();
    }
    
    public String getClassName() {
        return "TaskQueue";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    /**
     * The obj argument must be a js object and have this shape (all properties are optional):
     * 
     *  {
     *    "name" : "...",
     *    "countdown" : millis,
     *    "eta" : millis,
     *    "url" : "...",
     *    "method" : "...",
     *    "payload" : "...",
     *    "payload_encoding " : "...", // (defaults to UTF-8)
     *    "headers" : {
     *       "name" : "value"
     *       ...
     *    },
     *    "params" : {
     *       "name" : "value",
     *       ...
     *    }
     *  }
     *  
     *  "eta" and "countdown" are mutually exclusive.
     */
    public void jsFunction_add(Scriptable obj) {
        try {
            TaskOptions task = Builder.withDefaults();
            String className = obj.getClassName();
            if ("Object".equals(className)) {
                Object[] ids = obj.getIds();
                for (Object i: ids) {
                    if (!(i instanceof String)) {
                        throw new JSConvertableException("All properties in objects must be strings.").newJSException(_scope);
                    }
                    String p = (String) i;
                    Object v = obj.get(p,obj);
                    if ("url".equals(p)) {
                        if (v instanceof String) { 
                            task = task.url((String) v);
                        } else {
                            throw new JSConvertableException("'url' property must contain a string").newJSException(_scope);
                        }
                    } else if ("name".equals(p)) {
                        if (v instanceof String) { 
                            task = task.taskName((String) v);
                        } else {
                            throw new JSConvertableException("'name' property must contain a string").newJSException(_scope);
                        }
                    } else if ("method".equals(p)) {
                        if (v instanceof String) {
                            task = task.method(TaskOptions.Method.valueOf((String) v));
                        } else {
                            throw new JSConvertableException("'method' property must contain a string").newJSException(_scope);
                        }
                    } else if ("payload".equals(p)) {
                        if (v instanceof String) {
                            String encoding = "UTF-8";
                            if (obj.has("payload_encoding", obj)) {
                                Object e = obj.get("payload_encoding", obj);
                                if (e instanceof String) {
                                    encoding = (String) e;
                                } else {
                                    throw new JSConvertableException("'property-encoding' property must contain a string").newJSException(_scope);
                                }
                            }
                            task = task.payload((String) v, encoding);
                        } else {
                            throw new JSConvertableException("'method' property must contain a string").newJSException(_scope);
                        }
                    } else if ("payload_encoding".equals(p)) {
                        // ignore (it's asked for directly above)
                    } else if ("countdown".equals(p)) {
                        if (v instanceof Number) {
                            task = task.countdownMillis(((Number) v).longValue());
                        } else {
                            throw new JSConvertableException("'countdown' property must contain a number").newJSException(_scope);
                        }
                    } else if ("eta".equals(p)) {
                        if (v instanceof Number) {
                            task = task.etaMillis(((Number) v).longValue());
                        } else {
                            throw new JSConvertableException("'countdown' property must contain a number").newJSException(_scope);
                        }
                    } else if ("headers".equals(p)) {
                        if (v instanceof Scriptable && "Object".equals(((Scriptable) v).getClassName())) {
                            Scriptable o = (Scriptable) v;
                            Object[] ids2 = o.getIds();
                            for (Object ii: ids2) {
                                if (!(ii instanceof String)) {
                                    throw new JSConvertableException("All properties in objects must be strings.").newJSException(_scope);
                                }
                                String pp = (String) ii;
                                Object vv = o.get(pp,obj);
                                if (vv instanceof String) {
                                    task = task.header(pp, (String) vv);
                                } else {
                                    throw new JSConvertableException("Headers values can only be strings").newJSException(_scope);
                                }
                            }
                        } else {
                            throw new JSConvertableException("'headers' property must contain an object").newJSException(_scope);
                        }
                    } else if ("params".equals(p)) {
                        if (v instanceof Scriptable && "Object".equals(((Scriptable) v).getClassName())) {
                            Scriptable o = (Scriptable) v;
                            Object[] ids2 = o.getIds();
                            for (Object ii: ids2) {
                                if (!(ii instanceof String)) {
                                    throw new JSConvertableException("All properties in objects must be strings.").newJSException(_scope);
                                }
                                String pp = (String) ii;
                                Object vv = o.get(pp,obj);
                                if (vv instanceof String) {
                                    task = task.param(pp, (String) vv);
                                } else {
                                    throw new JSConvertableException("Params values can only be strings").newJSException(_scope);
                                }
                            }
                        } else {
                            throw new JSConvertableException("'params' property must contain an object").newJSException(_scope);
                        }
                    } else {
                        throw new JSConvertableException("parameter '" + p + "' is not recognized").newJSException(_scope);
                    }
                }
                _queue.add(task);
            } else {
                throw new JSConvertableException("Task param must be an object").newJSException(_scope);
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to add task: " + e.getMessage()).newJSException(_scope);
        }
    }
    
}
