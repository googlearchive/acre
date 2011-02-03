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

import java.io.BufferedReader;
import java.io.CharArrayWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.InvocationTargetException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.codec.binary.Hex;
import org.apache.log4j.Level;
import org.mozilla.javascript.Callable;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.JavaScriptException;
import org.mozilla.javascript.RhinoException;
import org.mozilla.javascript.Script;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.AcreFactory;
import com.google.acre.Configuration;
import com.google.acre.script.AcreContextFactory.AcreContext;
import com.google.acre.script.exceptions.AcreDeadlineError;
import com.google.acre.script.exceptions.AcreInternalError;
import com.google.acre.script.exceptions.AcreScriptError;
import com.google.acre.script.exceptions.AcreThreadDeath;
import com.google.acre.script.exceptions.AcreURLFetchException;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.acre.thread.AllocationLimitedThread;
import com.google.acre.util.JSUtil;
import com.google.acre.util.Supervisor;
import com.google.util.javascript.JSON;
import com.google.util.javascript.JSONException;
import com.google.util.javascript.DOM.JSAttr;
import com.google.util.javascript.DOM.JSCDATASection;
import com.google.util.javascript.DOM.JSCharacterData;
import com.google.util.javascript.DOM.JSComment;
import com.google.util.javascript.DOM.JSDOMException;
import com.google.util.javascript.DOM.JSDOMImplementation;
import com.google.util.javascript.DOM.JSDOMParser;
import com.google.util.javascript.DOM.JSDOMParserException;
import com.google.util.javascript.DOM.JSDocument;
import com.google.util.javascript.DOM.JSDocumentFragment;
import com.google.util.javascript.DOM.JSDocumentType;
import com.google.util.javascript.DOM.JSElement;
import com.google.util.javascript.DOM.JSEntity;
import com.google.util.javascript.DOM.JSEntityReference;
import com.google.util.javascript.DOM.JSNamedNodeMap;
import com.google.util.javascript.DOM.JSNode;
import com.google.util.javascript.DOM.JSNodeList;
import com.google.util.javascript.DOM.JSNotation;
import com.google.util.javascript.DOM.JSProcessingInstruction;
import com.google.util.javascript.DOM.JSText;
import com.google.util.logging.MetawebLogger;
import com.google.util.resource.ResourceSource;

public class HostEnv extends ScriptableObject implements AnnotatedForJS {

    private static final long serialVersionUID = 4916701464804733869L;

    public static final String ACRE_QUOTAS_HEADER = "X-acre-quotas";
    
    private static MetawebLogger _logger = new MetawebLogger();
    
    private static String ACRE_METAWEB_API_ADDR = Configuration.Values.ACRE_METAWEB_API_ADDR.getValue();
    private static int ACRE_METAWEB_API_ADDR_PORT = Configuration.Values.ACRE_METAWEB_API_ADDR_PORT.getInteger();
    
    private static String ACRE_FREEBASE_SITE_ADDR = Configuration.Values.ACRE_FREEBASE_SITE_ADDR.getValue();
    private static int ACRE_FREEBASE_SITE_ADDR_PORT = Configuration.Values.ACRE_FREEBASE_SITE_ADDR_PORT.getInteger();
    
    private static String ACRE_APIARY_ADDR = Configuration.Values.ACRE_APIARY_ADDR.getValue();

    private static String ACRE_HOST_BASE = Configuration.Values.ACRE_HOST_BASE.getValue();
    private static String ACRE_HOST_DELIMITER_PATH = Configuration.Values.ACRE_HOST_DELIMITER_PATH.getValue();
    private static boolean ACRE_AUTORELOADING = Configuration.Values.ACRE_AUTORELOADING.getBoolean();
    private static boolean ACRE_DEVELOPER_MODE = Configuration.Values.ACRE_DEVELOPER_MODE.getBoolean();
    
    private static final String DEFAULT_HOST_PATH = "//default." + ACRE_HOST_DELIMITER_PATH;

    //private static boolean HIDE_INTERNAL_JS_STACK = Configuration.Values.HIDE_ACREBOOT_STACK.getBoolean();
    private static boolean ENABLE_SUPERVISOR = Configuration.Values.ACRE_SUPERVISOR_THREAD.getBoolean();

    // in order to allow error scripts to handle timeouts in the main
    // script, we extend their deadline by this many msec.
    public static final int ERROR_DEADLINE_EXTENSION = 20000;
    
    // any urlfetch should be timed out this many msec
    //  before the current request's deadline, so there
    //  is time for the script to handle the failure.
    // for this to work it must be set high enough to
    //  gracefully handle (e.g. with an error page)
    //  any connection timeouts.
    // setting this to 0 means that scripts will rarely
    //  have time to handle urlfetch connection timeouts
    //  gracefully.
    // setting this higher effectively limits the maximum
    //  re-entry depth.  this is necessary to limit the
    //  number of threads that may be occupied to handle
    //  a single request.
    // a single external request may occupy
    //  (ACRE_REQUEST_MAX_TIME / NETWORK_DEADLINE_ADVANCE) threads
    //  
    public static final int NETWORK_DEADLINE_ADVANCE = 4000;

    // when passing on a deadline to a subrequest, bring it
    //  in a little bit more than the network deadline so
    //  that it will complete with a timeout before the
    //  network deadline.  this is in addition to
    //  NETWORK_DEADLINE_ADVANCE.
    // for this to work it must be set high enough to handle
    //  the subrequest 500 response (possibly by handling an error page)
    // otherwise the urlfetch will fail with a connection timeout
    //  instead of receiving a 500.
    // setting this to 0 ought to guarantee a connection
    //  timeout when a subrequest chain runs out of resources,
    //  (since the penultimate subrequest should get a connection
    //  timeout just as the final subrequest times out).
    //  this does not seem to be the case - the final
    //  request is able to return a 500 error before
    //  the penultimate request gives up.  possibly
    //  other padding on the network timeout somewhere?
    // in any case, the fetching script will have time to handle
    //  the connection timeout if NETWORK_DEADLINE_ADVANCE is
    //  high enough.
    public static final int SUBREQUEST_DEADLINE_ADVANCE = 0; //500;

    // we prefer to avoid the supervisor thread, so delay the
    //  Thread.stop() from the "normal" deadline by this many msec.
    // this is due to concerns about the safety of Thread.stop() -
    //  we need this as a backstop for the worst case (e.g. regexps)
    //  but we would prefer to fail within the request handling thread.
    public static final int SUPERVISOR_GRACE_PERIOD = 1000;

    private static final AcreContextFactory _contextFactory = new AcreContextFactory();

    // XXX: this could be redone with individual ScriptManagers per application domain / SecurityDomain objects etc.
    // with an instance of ScriptManager per domain - the ScriptManager having a Compiler/Loader and class cache
    private static ScriptManager _scriptManager = new ScriptManager();

    private transient Context _context;
    private Scriptable _scope;

    // if this HostEnv was created to show an error page (or other internal redirect),
    // this will point at the original HostEnv.  try to avoid using this.
    @SuppressWarnings("unused")
    private HostEnv _parent_hostenv;

    @SuppressWarnings("unused")
    private transient AcreExceptionInfo _exceptionInfo; 
    
    private transient ResourceSource _resourceSource; 

    private transient Supervisor _supervisor;
    private boolean _supervised;
    
    // this is the per-request cache of packages imported
    private Map<String, Scriptable> _scriptResults = new HashMap<String, Scriptable>();

    transient AcreRequest req;
    transient AcreResponse res;

    private transient AsyncUrlfetch _async_fetch;

    long allocationLimit;

    boolean _is_open;

    static {
        ContextFactory.initGlobal(_contextFactory);
    }

    public HostEnv(ResourceSource resources, AcreRequest request, AcreResponse response, Supervisor supervisor) throws IOException {
        _resourceSource = resources;
        req = request;
        res = response;
        _supervisor = supervisor;
        _supervised = false;

        allocationLimit = Configuration.Values.ACRE_MAX_OBJECT_COUNT_PER_SCRIPT.getInteger();

        JSUtil.populateScriptable(this, (AnnotatedForJS) this);
    }

    public String getClassName() {
        return "HostEnv";
    }

    /**
     *  create a fresh request scope with rhino + acre standard objects
     */
    private Scriptable initAcreStandardObjects() {
        Scriptable scope = _context.initStandardObjects();

        try {
            ScriptableObject.defineClass(scope, JSJSON.class, false, true);
        } catch (IllegalAccessException e) {
            syslog(Level.ERROR, "hostenv.jsonobj.init.failed", "Failed to load JSON object: " + e); 
        } catch (InstantiationException e) {
            syslog(Level.ERROR, "hostenv.jsonobj.init.failed", "Failed to load JSON object: " + e); 
        } catch (InvocationTargetException e) {
            syslog(Level.ERROR, "hostenv.jsonobj.init.failed", "Failed to load JSON object: " + e); 
        }

        try {
            ScriptableObject.defineClass(scope, JSBinary.class, false, true);
        } catch (IllegalAccessException e) {
            syslog(Level.ERROR, "hostenv.binaryobj.init.failed", "Failed to load Binary object: " + e); 
        } catch (InstantiationException e) {
            syslog(Level.ERROR, "hostenv.binaryobj.init.failed", "Failed to load Binary object: " + e); 
        } catch (InvocationTargetException e) {
            syslog(Level.ERROR, "hostenv.binaryobj.init.failed", "Failed to load Binary object: " + e); 
        }
        
        try {
            ScriptableObject.defineClass(scope, JSFile.class, false, true);
        } catch (IllegalAccessException e) {
            syslog(Level.ERROR, "hostenv.fileobj.init.failed", "Failed to load File object: " + e); 
        } catch (InstantiationException e) {
            syslog(Level.ERROR, "hostenv.fileobj.init.failed", "Failed to load File object: " + e); 
        } catch (InvocationTargetException e) {
            syslog(Level.ERROR, "hostenv.fileobj.init.failed", "Failed to load File object: " + e); 
        }

        try {
            ScriptableObject.defineClass(scope, JSKeyStore.class, false, true);
        } catch (IllegalAccessException e) {
            syslog(Level.ERROR, "hostenv.keystore.init.failed", "Failed to load KeyStore object: " + e);
        } catch (InstantiationException e) {
            syslog(Level.ERROR, "hostenv.keystore.init.failed", "Failed to load KeyStore object: " + e);
        } catch (InvocationTargetException e) {
            syslog(Level.ERROR, "hostenv.keystore.init.failed", "Failed to load KeyStore object: " + e);
        }
        
        try {
            ScriptableObject.defineClass(scope, JSCache.class, false, true);
        } catch (IllegalAccessException e) {
            syslog(Level.ERROR, "hostenv.cache.init.failed", "Failed to load Cache object: " + e);
        } catch (InstantiationException e) {
            syslog(Level.ERROR, "hostenv.cache.init.failed", "Failed to load Cache object: " + e);
        } catch (InvocationTargetException e) {
            syslog(Level.ERROR, "hostenv.cache.init.failed", "Failed to load Cache object: " + e);
        }

        try {
            ScriptableObject.defineClass(scope, JSAttr.class, false, true);
            ScriptableObject.defineClass(scope, JSCDATASection.class, false, true);
            ScriptableObject.defineClass(scope, JSCharacterData.class, false, true);
            ScriptableObject.defineClass(scope, JSComment.class, false, true);
            ScriptableObject.defineClass(scope, JSDOMException.class, false, true);
            ScriptableObject.defineClass(scope, JSDOMImplementation.class, false, true);
            ScriptableObject.defineClass(scope, JSDocument.class, false, true);
            ScriptableObject.defineClass(scope, JSDocumentFragment.class, false, true);
            ScriptableObject.defineClass(scope, JSDocumentType.class, false, true);
            ScriptableObject.defineClass(scope, JSElement.class, false, true);
            ScriptableObject.defineClass(scope, JSEntity.class, false, true);
            ScriptableObject.defineClass(scope, JSEntityReference.class, false, true);
            ScriptableObject.defineClass(scope, JSNamedNodeMap.class, false, true);
            ScriptableObject.defineClass(scope, JSNode.class, false, true);
            ScriptableObject.defineClass(scope, JSNodeList.class, false, true);
            ScriptableObject.defineClass(scope, JSNotation.class, false, true);
            ScriptableObject.defineClass(scope, JSProcessingInstruction.class, false, true);
            ScriptableObject.defineClass(scope, JSText.class, false, true);
            ScriptableObject.defineClass(scope, JSDOMParser.class, false, true);
            ScriptableObject.defineClass(scope, JSDOMParserException.class, false, true);
        } catch (IllegalAccessException e) {
            syslog(Level.ERROR, "hostenv.dom.init.failed", "Failed to load DOM: " + e);
        } catch (InstantiationException e) {
            syslog(Level.ERROR, "hostenv.dom.init.failed", "Failed to load DOM: " + e);
        } catch (InvocationTargetException e) {
            syslog(Level.ERROR, "hostenv.dom.init.failed", "Failed to load DOM: " + e);
        }

        try {
            @SuppressWarnings("unchecked")
            Class<? extends Scriptable> jsDataStoreClass = (Class<? extends Scriptable>) Class.forName("com.google.acre.script.JSDataStore");

            @SuppressWarnings("unchecked")
            Class<? extends Scriptable> jsDataStoreResultsClass = (Class<? extends Scriptable>) Class.forName("com.google.acre.script.JSDataStoreResults");

            @SuppressWarnings("unchecked")
            Class<? extends Scriptable> jsDataStoreResultsIteratorClass = (Class<? extends Scriptable>) Class.forName("com.google.acre.script.JSDataStoreResultsIterator");

            try {
                ScriptableObject.defineClass(scope, jsDataStoreClass, false, true);
                ScriptableObject.defineClass(scope, jsDataStoreResultsClass, false, true);
                ScriptableObject.defineClass(scope, jsDataStoreResultsIteratorClass, false, true);
            } catch (IllegalAccessException e) {
                syslog(Level.ERROR, "hostenv.datastore.init.failed", "Failed to load DataStore object: " + e);
            } catch (InstantiationException e) {
                syslog(Level.ERROR, "hostenv.datastore.init.failed", "Failed to load DataStore object: " + e);
            } catch (InvocationTargetException e) {
                syslog(Level.ERROR, "hostenv.datastore.init.failed", "Failed to load DataStore object: " + e);
            }
        } catch (ClassNotFoundException e1) {
            syslog(Level.INFO, "hostenv.datastore.init.failed", "DataStore provider not found and will not be present");
        }

        try {
            @SuppressWarnings("unchecked")
            Class<? extends Scriptable> jsTaskQueueClass = (Class<? extends Scriptable>) Class.forName("com.google.acre.script.JSTaskQueue");

            try {
                ScriptableObject.defineClass(scope, jsTaskQueueClass, false, true);
            } catch (IllegalAccessException e) {
                syslog(Level.ERROR, "hostenv.datastore.init.failed", "Failed to load TaskQueue object: " + e);
            } catch (InstantiationException e) {
                syslog(Level.ERROR, "hostenv.datastore.init.failed", "Failed to load TaskQueue object: " + e);
            } catch (InvocationTargetException e) {
                syslog(Level.ERROR, "hostenv.datastore.init.failed", "Failed to load TaskQueue object: " + e);
            }
        } catch (ClassNotFoundException e1) {
            syslog(Level.INFO, "hostenv.taskqueue.init.failed", "TaskQueue provider not found and will not be present");
        }
        
        return scope;
    }

    // note that this may be called re-entrantly to handle error pages
    public void run() {
      
        long start = System.currentTimeMillis();
        
        Thread thread = Thread.currentThread();

        // if the supervisor is there and enabled,
        // schedule the thread to be stopped after a certain time
        if (_supervisor != null && ENABLE_SUPERVISOR) {
            _supervisor.watch(thread, req._deadline + SUPERVISOR_GRACE_PERIOD);
            _supervised = true;
        }

        // if the thread supports it, set the memory usage limit
        AllocationLimitedThread athread = null;
        if (thread instanceof AllocationLimitedThread) {
            athread = (AllocationLimitedThread) thread;
            athread.setThreadAllocationLimit(allocationLimit);
        }

        try {

            _context = _contextFactory.enterContext();
            if (_context instanceof AcreContext) {
                ((AcreContext) _context).deadline = req._deadline;
            }
            _scope = initAcreStandardObjects();

            _async_fetch = AcreFactory.getAsyncUrlfetch();
            _async_fetch.response(res);
            _async_fetch.scope(_scope);

            // let's do it!
            syslog(Level.DEBUG, "timing.pre_run", Long.toString(System.currentTimeMillis() - start) + "ms");
            bootScript();

        } catch (Exception e) {
            throw new RuntimeException(e);
        } finally {

            // if the thread supports it, clear the memory quota and log the memory costs
            if (athread != null) {
                long remains = athread.getThreadAllocationLimit();
                if (res._used_memory < 0) {
                    throw new RuntimeException("Nice try"); // this is just a paranoid check, should happen only if we get hacked
                }
                if (remains != 0 || res._used_memory > 0) {
                    long memory_used = (allocationLimit - remains) + res._used_memory;
                    int pctused = (int) ((100 * memory_used) / allocationLimit);
                    String msg = "script used " + pctused + "% of memory quota";
                    userlog("debug", msg);
                    syslog(Level.DEBUG, "hostenv.script.memory", msg);
                    res.collect("am", (float) memory_used);
                    athread.setThreadAllocationLimit(0);
                }
            }

            // if the supervisor is there and enabled, release the scheduled killer
            if (_supervised) {
                _supervisor.release(thread);
                _supervised = false;
            }

            if (_context != null) {
                Context.exit();
                _context = null;
            }
        }
    }

    public void bootScript() {
        
        long start = System.currentTimeMillis();

        req.server_host = ACRE_HOST_DELIMITER_PATH + "." + ACRE_HOST_BASE;
        req.server_host_base = ACRE_HOST_BASE;
        req.freebase_service_url = "http://" + ACRE_METAWEB_API_ADDR;
        if (ACRE_METAWEB_API_ADDR_PORT != 80) req.freebase_service_url += ":" + ACRE_METAWEB_API_ADDR_PORT;
        req.freebase_site_host = "http://" + ACRE_FREEBASE_SITE_ADDR;
        if (ACRE_FREEBASE_SITE_ADDR_PORT != 80) req.freebase_site_host += ":" + ACRE_FREEBASE_SITE_ADDR_PORT;
        req.apiary_service_url = "http://" + ACRE_APIARY_ADDR;

        _scope.put("PROTECTED_HOSTENV", _scope, this);

        this.put("ACRE_HOST_BASE", this,
                 Configuration.Values.ACRE_HOST_BASE.getValue());
        this.put("ACRE_HOST_DELIMITER_HOST", this,
                 Configuration.Values.ACRE_HOST_DELIMITER_HOST.getValue());
        this.put("ACRE_HOST_DELIMITER_PATH", this,
                 Configuration.Values.ACRE_HOST_DELIMITER_PATH.getValue());
        this.put("STATIC_SCRIPT_PATH", this,
                 Configuration.Values.STATIC_SCRIPT_PATH.getValue());
        this.put("ACRE_ALLOW_MWAUTH_HOST_SUFFIX", this,
                 Configuration.Values.ACRE_ALLOW_MWAUTH_HOST_SUFFIX.getValue());
        this.put("ACRE_MWLT_MODE_COOKIE_SCOPE", this,
                 Configuration.Values.ACRE_MWLT_MODE_COOKIE_SCOPE.getValue());
        this.put("ACRE_DEVELOPER_MODE", this, ACRE_DEVELOPER_MODE);
        this.put("DEFAULT_HOST_PATH", this, DEFAULT_HOST_PATH);

        _scope.put("ACRE_REQUEST", _scope, req.toJsObject(_scope));

        try {
            syslog(Level.DEBUG, "hostenv.script.start", "");

            // we ought to make sure acreboot has initialized before
            // throwing this error
            if (System.currentTimeMillis() > req._deadline) {
                throw new AcreDeadlineError("Request chain time quota expired");
            }

            if (_scope.has("acre", _scope)) {
                throw new RuntimeException("FATAL: bootScript() re-entered with same scope");
            }

            syslog(Level.DEBUG, "timing.pre_acreboot", Long.toString(System.currentTimeMillis() - start) + "ms");
            try {
                load_system_script("acreboot.js", _scope);
            } catch (JavaScriptException jsexc) {
                Object exit_exception_obj = this.get("AcreExitException", this);
                if (exit_exception_obj instanceof Scriptable) {
                    Object val = jsexc.getValue();
                    Scriptable exit_exception = (Scriptable) exit_exception_obj;
                    if ((val instanceof Scriptable && !exit_exception.hasInstance((Scriptable) val)) || !(val instanceof Scriptable)) {
                        renderErrorPage("JS exception", jsexc, "hostenv.script.error.jsexception");
                        return;
                    } else if (val instanceof Scriptable && exit_exception.hasInstance((Scriptable) val)) {
                        Object spath = ((Scriptable) val).get("route_to", (Scriptable) val);
                        Object skip_routes = ((Scriptable) val).get("skip_routes", (Scriptable) val);

                        if (spath instanceof String) {
                            internalRedirect((String)spath, (Boolean) skip_routes);
                            return;
                        }
                    }
                } else {
                    throw jsexc;
                }
            }

            try {
                Object finisher = this.get("finish_response", this);
                if (finisher != null) {
                    Object[] args = {};
                    // throw away result
                    ((Callable)finisher).call(_context, _scope, _scope, args);
                }
            } catch (JavaScriptException jsexc) {
                // not even AcreExitException is ok here.
                renderErrorPage("JS exception closing response", jsexc, "hostenv.script.error.jsexception");
                return;
            }

            closeResponse();

        } catch (RhinoException rexc) {
            renderErrorPage("Unhandled exception", rexc, "hostenv.script.error.jsexception");
        } catch (AcreScriptError ase) {
            renderErrorPage("Unrecoverable error: " + ase.getMessage(), ase, "hostenv.script.error.acrescripterror");
        } catch (StackOverflowError soe) {
            renderErrorPage("Stack overflow", soe, "hostenv.script.error.stackoverflowerror");
        } catch (OutOfMemoryError oome) {
            if (oome.getMessage().matches("PermGen space")) {
                reportDisaster("Unhandlable java OutOfMemoryError", oome);
                System.exit(1);
            }
            // record the fact that we have exceeded the memory quota in the regular call
            // this is done because the error page will reset the memory quota and lose
            // this information. This is needed to record the real amount of memory used.
            res._used_memory = allocationLimit;
            renderErrorPage("Memory limit exceeded", oome, "hostenv.script.error.outofmemoryerror");
        } catch (AcreThreadDeath td) {
            renderErrorPage("Execution time limit exceeded", td, "hostenv.script.error.threaddeath");
        } catch (AcreDeadlineError td) {
            renderErrorPage("Execution time limit exceeded", td, "hostenv.script.error.deadline");
        } catch (Throwable t) {
            reportDisaster("java exception reached toplevel", t);
        } finally {
            _async_fetch = null;
            // clean up after running a user script.
        }

    }

    /**
     * create a fresh request scope.
     * we re-use the old AcreRequest object after augmenting it with
     *  information about the redirect.
     * for isolation reasons we create a complete new HostEnv and
     *  js context - only the information on AcreRequest is carried through.
     *
     * NOTE it is the caller's responsibility to exit after calling this
     *  function
     *
     *  @returns the new HostEnv
     */

    public HostEnv internalRedirect(String script_path, boolean skip_routes) throws IOException {
        syslog(Level.DEBUG, "hostenv.script.internalredirect", "internal redirect to " + script_path);

        // reset the request path_info and query_string
        URL url;
        try {
            url = new URL("http:" + script_path);
        } catch (MalformedURLException e) { 
            throw new RuntimeException(e);
        }
        
        String query_string = url.getQuery();
        
        if (query_string == null) {
            query_string = "";
        }
        
        req.setPathInfo(url.getPath());
        req.setQueryString(query_string);

        // reset the response
        res.reset();

        // create a new HostEnv and populate it from this
        // we re-use the same AcreRequest
        // NOTE: keep checking for time quota for all error pages
        // that are not the default one
        HostEnv newenv = new HostEnv(_resourceSource, req, res, _supervisor);
        newenv._parent_hostenv = this;

        // modify the AcreRequest to add any additional info
        req.handler_script_path = script_path;
        req.skip_routes = skip_routes;

        // if the script is an error script, add additional time to the quota for the error script
        // to be executed. Note that urlfetches by user error scripts are restricted
        // so that this extended time does not get passed on further.
        if (req.error_info != null) {
            req._deadline += ERROR_DEADLINE_EXTENSION;
        }

        // exit the old Context (which is stored thread-local by rhino)
        if (_context != null) {
            Context.exit();
            _context = null;
        }

        // remove any supervisor watch on this thread
        //  (it will be re-established for the error page)
        if (_supervised) {
            Thread thread = Thread.currentThread();
            _supervisor.release(thread);
            _supervised = false;
        }

        // run the request using a fresh js context but the same thread
        newenv.run();

        return newenv;
    }

    /**
     * @return the global context factory of {@link AcreContextFactory} type<br>
     * initialized and set into the Rhino in the static initializer
     */
    public static ContextFactory getGlobal() {
        return _contextFactory;
    }

    public Scriptable getScope() {
        return _scope;
    }

    // ------------------------------- JavaScript Functions --------------------------------------

    @JS_Function
    public Scriptable load_system_script(String script, Scriptable scope) {
        int pathIndex = script.lastIndexOf('/');
        
        String script_name = (pathIndex == -1) ? script : script.substring(pathIndex + 1);

        //String script_id = (ACRE_AUTORELOADING) ? script + lastModifiedTime(script) : script;
        String script_id = script + lastModifiedTime(script);

        String script_id_hash = Integer.toHexString(script_id.hashCode());
                
        Scriptable newScope = load_script_from_cache(script_name, script_id_hash, scope, false);

        if (newScope == null) {
            String content = openResourceFile(script);
            newScope = load_script_from_string(content, script_name, script_id_hash, scope, null, false);
        }

        return newScope;
    }

    @JS_Function
    public Scriptable load_script_from_cache(String script_name,
                                             String content_id,
                                             Object scopearg,
                                             boolean swizzle) {

        long start = System.currentTimeMillis();
                                                 
        // because rhino won't convert js null to match a Scriptable arg on a
        // java method.
        Scriptable scope = (Scriptable) scopearg;

        // obtain the right class name from the name and content ID
        String className = CachedScript.getClassName(script_name, content_id);

        // see if we can look up the cached script by class name
        CachedScript script = _scriptManager.getScriptByClassName(className);

        if (script == null) {
            syslog4j(Level.DEBUG, "hostenv.script.load.from_cache.not_found",
                   "script_name", script_name,
                   "cache_key", className,
                   "content_id", content_id
                   );
            return null;
        } else {
            // if the script had syntax errors, the compiling process threw
            // and left the compiled script null, so we need to make sure that
            // doesn't happen

            if (script.getCompiledScript() == null) {
                syslog4j(Level.DEBUG, "hostenv.script.load.from_cache.invalid",
                       "script_name", script_name,
                       "cache_key", className,
                       "content_id", content_id
                       );
                // make sure we purge the script manager cache
                // in case the cached script wasn't properly initialized
                // to avoid leaking memory
                _scriptManager.invalidate(className);
                return null;
            }
        }

        syslog(Level.DEBUG, "timings.load_from_cache", Long.toString(System.currentTimeMillis() - start) + "ms " + className);
        syslog4j(Level.DEBUG, "hostenv.script.load.from_cache",
               "script_name", script.getScriptName(),
               "cache_key", className,
               "content_id", content_id
               );
        return execute(script, scope, swizzle);
    }

    @JS_Function
    public Scriptable load_script_from_string(String js_text,
                                              String script_name,
                                              String content_id,
                                              Object scopearg,
                                              Object linemaparg,
                                              boolean swizzle) {
        
                                                
        long start = System.currentTimeMillis();
                                                  
        // because rhino won't convert js null to match a Scriptable arg on a
        // java method.
        Scriptable scope = (Scriptable) scopearg;
        Scriptable linemap = (Scriptable) linemaparg;

        // set the script up before compiling it, so we have the linemap
        // and filename map in case of compiler errors.
        CachedScript script = new CachedScript(script_name, js_text, content_id);

        if (linemap != null) {
            Double d = (Double) linemap.get("length", linemap);
            if (d != null) {
                int nlines = d.intValue();
                int[] jlinemap = new int[nlines];
                for (int i = 0; i < nlines; i++) {
                    try {
                        d = (Double) linemap.get(i, linemap);
                        jlinemap[i] = (d != null) ? d.intValue() : 0;
                    } catch (ClassCastException e) {
                        syslog(Level.WARN, "hostenv.script.bad_linemap_entry",
                               "bad linemap entry for script " + script_name);
                        jlinemap[i] = 0;
                    }
                }
                script.setLinemap(jlinemap);
            }
        }

        // get the script (this will compile it if it wasn't done before)
        script = _scriptManager.getScript(script);

        syslog(Level.DEBUG, "timings.load_from_string", Long.toString(System.currentTimeMillis() - start) + "ms " + script_name);
        syslog(Level.DEBUG, "hostenv.script.load.from_string", "loading script '" + script.getScriptName() + "'");

        return execute(script, scope, swizzle);
    }

    @JS_Function
    public Scriptable urlOpen(String url, 
                              String method,
                              Object content, 
                              Scriptable headers,
                              boolean system, 
                              boolean log_to_user,
                              String response_encoding) {

        //System.out.println((system ? "[system] " : "") + "sync: " + url.split("\\?")[0] + " [reentries: " + req._reentries + "]");

        if (req._reentries > 1) {
            throw new JSConvertableException("Urlfetch is allowed to re-enter only once").newJSException(this);
        }
        
        if (System.currentTimeMillis() > req._deadline) {
            throw new RuntimeException("Cannot call urlfetch, the script ran out of time");
        }

        URL _url;
        try {
            _url = new URL(url);
        } catch (MalformedURLException e) {
            throw new JSURLError("Malformed URL: " + url).newJSException(this);
        }
        
        // give the subrequest a shorter deadline so this request can handle any failure
        long net_deadline = req._deadline - NETWORK_DEADLINE_ADVANCE;

        AcreFetch fetch = new AcreFetch(url, method, net_deadline, req._reentries, res, AcreFactory.getClientConnectionManager());
        
        if (headers != null) {
            Object[] ids = headers.getIds();
            for (int i = 0; i < ids.length; i++) {
                String id = ids[i].toString();

                fetch.request_headers.put(id, headers.get(id, headers).toString());
            }
        }

        fetch.request_body = content;

        String host = _url.getHost();

        // special auth treatment for api.freebase.com
        // NOTE(SM): should go away once we transition the APIs over to the google infra 
        if (host.equals(ACRE_METAWEB_API_ADDR)) {
            fetch.request_headers.put("X-Metaweb-TID", req._metaweb_tid);
            syslog(Level.DEBUG, "hostenv.urlopen.attached.tid", "Attaching X-Metaweb-TID of " + req._metaweb_tid);

            if (has("write_user", this)) {
                String write_user = (String) get("write_user", this);
                if (write_user != null) {
                    if (!fetch.request_headers.containsKey("Authorization")) {
                        fetch.request_headers.put("X-Acre-Auth", signAcreAuth(write_user));
                        syslog(Level.DEBUG, "hostenv.urlopen.attached.acre_write_user", "Request will be signed as user " + write_user);
                    }
                }
            }
        }
        
        try {
            if (response_encoding == null) response_encoding = "ISO-8859-1";
            fetch.fetch(system, response_encoding, log_to_user);
            return fetch.toJsObject(_scope);
        } catch (AcreURLFetchException e) {
            throw new JSURLError(e.getMessage()).newJSException(this);
        }
    }

    @JS_Function
    public void urlOpenAsync(String url, 
                             String method,
                             Object content,
                             Scriptable headers,
                             Double timeout_ms,
                             boolean system,
                             boolean log_to_user,
                             String response_encoding,
                             Function callback) {

        //System.out.println((system ? "[system] " : "") + "async: " + url.split("\\?")[0] + " [reentries: " + req._reentries + "]");
        
        if (_async_fetch == null) {
            throw new JSConvertableException(
                "Async Urlfetch not supported in this enviornment"
            ).newJSException(this);
        }

        if (req._reentries > 1) {
            throw new JSConvertableException("Urlfetch is allowed to re-enter only once").newJSException(this);
        }

        if (System.currentTimeMillis() > req._deadline) {
            throw new RuntimeException("Cannot call urlfetch, the script ran out of time");
        }

        // give the subrequest a shorter deadline so this request can
        // handle any failure
        long timeout = req._deadline - System.currentTimeMillis() - NETWORK_DEADLINE_ADVANCE;

        if (!timeout_ms.isNaN() && timeout_ms.longValue() < timeout) {
        	timeout = timeout_ms.longValue();
        }

        if (response_encoding == null) response_encoding = "ISO-8859-1";
         
        Map<String, String> header_map = new HashMap<String, String>();
        if (headers != null) {
            Object[] ids = headers.getIds();
            for (int i = 0; i < ids.length; i++) {
                String id = ids[i].toString();
                header_map.put(id, headers.get(id, headers).toString());
            }
        }

        URL _url;
        try {
            _url = new URL(url);
        } catch (MalformedURLException e) {
            throw new JSURLError("Malformed URL: " + url).newJSException(this);
        }
        
        String host = _url.getHost();
        
        // special auth treatment for api.freebase.com
        // NOTE(SM): should go away once we transition the APIs over to the google infra 
        if (host.equals(ACRE_METAWEB_API_ADDR)) {
            header_map.put("X-Metaweb-TID", req._metaweb_tid);
            syslog(Level.DEBUG, "hostenv.urlopen.attached.tid", "Attaching X-Metaweb-TID of " + req._metaweb_tid);

            if (has("write_user", this)) {
                String write_user = (String) get("write_user", this);
                if (write_user != null) {
                    if (!header_map.containsKey("Authorization")) {
                        header_map.put("X-Acre-Auth", signAcreAuth(write_user));
                        syslog(Level.DEBUG, "hostenv.urlopen.attached.acre_write_user", "Request will be signed as user " + write_user);
                    }
                }
            }
        }
        
        long sub_deadline = req._deadline - HostEnv.SUBREQUEST_DEADLINE_ADVANCE;
        int reentrances = req._reentries + 1;
        header_map.put(HostEnv.ACRE_QUOTAS_HEADER, "td=" + sub_deadline + ",r=" + reentrances);
        
        _async_fetch.make_request(url, method, timeout, header_map, content, system, log_to_user, response_encoding, callback);
    }

    @JS_Function
    public void async_wait(Double timeout_ms) {
        long timeout = req._deadline - System.currentTimeMillis() - NETWORK_DEADLINE_ADVANCE;

        // XXX consider throwing, or at least warning if this condition fails
        if (!timeout_ms.isNaN() && timeout_ms.longValue() < timeout) {
            timeout = timeout_ms.longValue();
        }

        _async_fetch.wait_on_result(timeout, TimeUnit.MILLISECONDS);
    }

    /**
     * Appends str to the output stream
     * NOTE: everything is ALWAYS buffered until the very end of the request 
     * handling.
     */
    @JS_Function
    public void write(Object data) throws IOException {
        if (data instanceof String) {
            res.write((String)data);
        } else if (data instanceof JSBinary) {
            res.write((JSBinary)data);
        } else {
            // NOTE: it's impossible for any other types to get here
        }
    }

    /**
     *  this is for user logging but from the java code
     */
    @SuppressWarnings("unchecked")
	@JS_Function
    public void userlog(String level, Object msg) {
        if (msg instanceof String) {
            String msg_str = (String) msg;
            msg = new ArrayList<String>();
            ((ArrayList<String>) msg).add(msg_str);
        }
        if (msg instanceof List || msg instanceof Scriptable) {
            res.log(level, msg);
        }
    }

    public void syslog4j(Level level, String event_name, Object... msgparts) {
        HashMap<String, String> msg = new HashMap<String, String>();

        String key = null;
        for (Object p : msgparts) {
            if (key == null) {
                key = (String)p;
                continue;
            }
            if (p instanceof String) {
                msg.put(key, (String)p);
            } else if (p instanceof Scriptable ||
                       p instanceof Map ||
                       p instanceof List) {
                try {
                    msg.put(key, JSON.stringify(p));
                } catch (JSONException e) {
                    msg.put(key, "INVALID JSON");
                }
            } else if (p == null) {
                msg.put(key, null);
            } else {
                msg.put(key, p.toString());
            }
            key = null;
        }
        syslog(level, event_name, msg);
    }

    /**
     *  this is for logging internal errors
     */
    @JS_Function
    public void syslog(Object level, Object event_name, Object msgarg) {

        Level lvl = null;
        if (level instanceof String) {
            lvl = Level.toLevel((String) level);
        } else if (level instanceof Level) {
            lvl = (Level) level;
        } else {
            throw new JSConvertableException("Not a valid Level")
                .newJSException(this);
        }

        if (event_name == null) event_name = "system";

        if (msgarg instanceof Scriptable) {
            HashMap<String,String> msg = new HashMap<String, String>();
            Object[] ids = ((Scriptable)msgarg).getIds();
            for (int i = 0; i < ids.length; i++) {
                Object id = ids[i];
                String key = id.toString();
                Object value = ((Scriptable) msgarg).get(key, (Scriptable) msgarg);
                if (value instanceof String) {
                    msg.put(key, (String) value);
                } else if (value == null) {
                    msg.put(key, null);
                } else {
                    msg.put(key, (String) value.toString());
                }
            }
            _logger.log(event_name.toString(), lvl, msg);
        } else {
            _logger.log(event_name.toString(), lvl, msgarg);
        }
    }

    @JS_Function
    public void start_response(int status, Scriptable headers, Scriptable cookies) {
        _is_open = true;
        res._response_status = status;

        Object[] ids = headers.getIds();
        for (int i = 0; i < ids.length; i++) {
            Object id = ids[i];
            String key = id.toString();
            Object value = headers.get(key, headers);
            res._response_headers.put(key, value.toString());

        }

        ids = cookies.getIds();
        for (int i = 0; i < ids.length; i++) {
            Object id = ids[i];
            String key = id.toString();
            Scriptable jsvalue = (Scriptable) cookies.get(key, cookies);
            AcreCookie cookie = new AcreCookie(jsvalue);
            if (cookie.name != null && !cookie.name.equals(key)) {
                throw new JSConvertableException("Cookie name mismatch: " + key + " vs " + cookie.name).newJSException(this);
            }
            cookie.name = key;
            res._response_cookies.put(key, cookie);
        }
    }

    // ------------------------------------- private methods --------------------------------------------

    private void startErrorPage() {
        // allocate new response headers so any previous start_response
        // is wiped out. this is necessary for handling startErrorPage()
        // after acre.start_response is called.
        res.reset();
        res._response_status = 500;
        res._response_headers.put("content-type", "text/plain; charset=utf-8");
    }

    private void signalAcreError(String msg) {
        try {
            res._response_headers.put("X-Acre-Error", URLEncoder.encode(msg,"UTF-8"));
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException("Unsupported encoding: UTF-8"); // this should never happen
        }
    }

    private String expandJavascriptPath(String file) {
        return "/WEB-INF/js/" + file;
    }
    
    private long lastModifiedTime(String file) {

        String path = expandJavascriptPath(file);

        try {
            return _resourceSource.getLastModifiedTime(path);
        } catch (IOException e) {
            throw new JSConvertableException("error reading resource: " + path).newJSException(this);
        }
    }
    
    private String openResourceFile(String file) {

        String path = expandJavascriptPath(file);

        InputStream in = null;
        BufferedReader reader = null;

        StringBuilder buf = new StringBuilder();

        try {
            in = _resourceSource.getResourceAsStream(path);
            if (in == null) {
                throw new JSURLError("unable to open resource: " + path).newJSException(this);
            }

            reader = new BufferedReader(new InputStreamReader(in, Charset.forName("UTF-8")));

            String line;
            while ( (line = reader.readLine()) != null) {
                buf.append(line);
                buf.append("\n");
            }
        } catch (IOException e) {
            throw new JSConvertableException("error reading resource: " + path).newJSException(this);
        } finally {
            try {
                if (reader != null) reader.close();
                if (in != null) in.close();
            } catch (IOException e) {
                throw new JSConvertableException("error closing file: " + path).newJSException(this);
            }
        }

        return buf.toString();
    }

    private void simpleReportRhinoException(String msg, RhinoException e) throws IOException {
        syslog(Level.WARN, "hostenv.script.error.rhinoexception.fallback", "JS exception " + e);
        String errmsg = "Unhandled exception in acre error handler: " + e.getMessage();
        userlog("error", errmsg);

        startErrorPage();
        signalAcreError(errmsg);
        write(errmsg);
    }

    /**
     * called for successful js responses only
     */
    private void closeResponse() throws IOException {
        if (!_is_open) {
            // this is a user error in which the user script failed to call start_response
            renderErrorPage("Error in script: acre.start_response was never called", null, "hostenv.script.start_response.not_called");
            return;
        }

        String script_path = "ACREBOOT";

        if (has("script_path", this))
            script_path = (String)get("script_path", this);

        syslog(Level.DEBUG, "hostenv.script.finish", "Done with script " + script_path);
    }

    /**
     *  This implies an internal problem in acreboot.js, since it should
     *  be handling any user errors.
     */
    private void reportDisaster(String message, Throwable exc) {
        // we hit a java exception.  all
        // bare java exception should have been trapped
        // and hidden by now, so this is a serious internal
        // error.

        try {
            syslog(Level.ERROR, "hostenv.internal.error", "Internal error in script boot: " + message);

            startErrorPage();
            signalAcreError(message);

            CharArrayWriter cw = new CharArrayWriter();
            PrintWriter pw = new PrintWriter(cw);
            exc.printStackTrace(pw);
            if (null != exc.getCause()) {
                pw.write("Caused by:\n");
                pw.write(exc.getCause().getMessage() + "\n");
                exc.getCause().printStackTrace(pw);
            }
            pw.flush();
            String excdump = cw.toString();
            syslog(Level.ERROR, "hostenv.internal.error.msg", "ACRE INTERNAL ERROR: \n" + excdump);

            write("ACRE INTERNAL ERROR -- Please Report to irc://irc.freenode.net/#freebase\n");
            write("Request Id: " + req._metaweb_tid + "\n\n");
            write(excdump + "\n");
        } catch (Throwable e) {
            syslog(Level.ERROR, "hostenv.internal.error.fatal", "Dispatch: Acre Last chance error, giving up" + exc);
            syslog(Level.ERROR, "hostenv.internal.error.fatal.failed_on", "Failed reporting the error above" + e);

            // XXX this should be replaced with an exception class that is unique to this case
            // and will never be caught.
            throw new AcreInternalError("Failed while reporting a disaster", e);
        }
    }

    // page to use for handling errors, it must be a script, not a template.
    private static final String ERROR_PAGE = "error";
    private static final String DEFAULT_ERROR_PAGE  = DEFAULT_HOST_PATH + "/" + ERROR_PAGE;

    /**
     *  render the error page using /freebase/apps/default/error
     */
    private void renderErrorPage(String message, Throwable t, String logevent) {
        String error_script_path = null;

        try {
            try {
                // uncomment to log java stack traces for js errors
                // t.printStackTrace(new PrintWriter(exc_log));

                // fetch metadata computed by acreboot.js
                // get fresh script_name, script_path, script_host_path
                String script_name = "UNKNOWN";
                String script_path = "UNKNOWN";
                String script_host_path = "UNKNOWN";
                String error_handler_path = "UNKNOWN";
                if (has("script_name", this))
                    script_name = (String)this.get("script_name", this);
                if (has("script_path", this))
                    script_path = (String)this.get("script_path", this);
                if (has("script_host_path", this))
                    script_host_path = (String)this.get("script_host_path", this);
                if (has("error_handler_path", this))
                    error_handler_path = (String)this.get("error_handler_path", this);
                    
                String log_msg = message;
                if (t != null) {
                    if (t instanceof RhinoException) {
                        log_msg += ": " + ((RhinoException) t).details();
                    } else {
                        String msg = t.getMessage();
                        if (msg != null && !"".equals(msg)) {
                            log_msg += ": " + msg;
                        }
                    }
                }

                syslog(Level.ERROR, logevent, log_msg + " [" + script_path + "]");

                // handle the error using the local error handler for the script
                // this will fall back to the default error handler if no local handler is found
                if ("UNKNOWN".equals(script_host_path) || "UNKNOWN".equals(script_name)) {
                    if (log_msg.indexOf("syntax error") > -1) {
                        reportDisaster("Syntax Error in acreboot.js", t);
                        return;
                    }

                    if (req.handler_script_path != null &&
                        req.handler_script_path.equals(DEFAULT_ERROR_PAGE)) {
                        reportDisaster("Fatal error in acreboot.js", t);
                        return;
                    }

                    syslog(Level.ERROR, logevent, "Error in acreboot.js, no error context available");
                    error_script_path = DEFAULT_ERROR_PAGE;

                    // this is a hack to handle huge request bodies, which can choke acreboot.js
                    // in the error script
                    req.request_body = "";
                } else if (req.error_info == null) {
                    // try the app's error handler or one specified by the app 
                    // using acre.response.set_error_page(path)
                    // or error_page in metadata file
                    if ("UNKNOWN".equals(error_handler_path)) {
                        error_script_path = script_host_path + "/" + ERROR_PAGE;
                    } else {
                        error_script_path = error_handler_path;
                    }
                } else {
                    // if we were handling an error in a user error handler, fall back to the system one.

                    // if there is an error in the system-wide error handler we have serious problems.
                    if (script_host_path.equals(DEFAULT_HOST_PATH)) {
                        // prevent infinite loops in error scripts
                        reportDisaster("Error while rendering default error page", t);
                        return;
                    }

                    // if it's already some other error script, force it to the default error script
                    error_script_path = DEFAULT_ERROR_PAGE;
                }

                userlog("error", log_msg);

                // pass the exception info to the error script
                req.error_info = new AcreExceptionInfo(script_path, message, t, _scriptManager, _scope);

                internalRedirect(error_script_path, true);
            } catch (RhinoException e) {
                simpleReportRhinoException("error running error script " + error_script_path, e);
            }
        } catch (Throwable e) {
            reportDisaster("Internal error in error page", e);
        }
    }

    /**
     * Execute the script and save it in the map to enable stack trace "legend" <br>
     * something <b>should</b> known about the script that we were asked to execute.<br>
     * so we remember all there was and provide access to it when the sh.t crashes.<br>
     *
     * @param script
     */
    private Scriptable execute(CachedScript script, Scriptable scope,
                               boolean swizzle) {
                                 
        long start = System.currentTimeMillis();

        String className = script.getClassName();

        // check if this script (package) has already been included
        // XXX note that the scope passed in is ignored in this case!
        // should have an assertion to make sure there's no inconsistency.
        // however, there should be no problem in practice because of how this
        // is used in acreboot:
        // - scope is non-null only for the toplevel script handling the request
        // - subsequent scripts are loaded via acre.require() with an empty scope.
        // XXX most of this function should really be in js.
        Scriptable result = _scriptResults.get(className);
        if (null != result) {
            return result;
        }

        // if no namespace was passed in, create a new "script scope" namespace
        // object
        if (swizzle == true) {
            // hook the new namespace's prototype to the request global
            // namespace.  the script will be able to reference names defined
            // in the request scope, but new names created by the script
            // will go in the script scope.
            scope.setPrototype(_scope);

            // the new scope is from a separate "file", so it is not
            // lexically enclosed by _scope.
            scope.setParentScope(null);
        }

        // save the scope-in-progress before running the script.
        // this means that if there is a recursive acre.require() call
        // it will return the incomplete scope object rather then trying
        // to create a new scope when one is already under construction.
        _scriptResults.put(className, scope);

        Script compiledScript = script.getCompiledScript();

        if (compiledScript != null) {
            compiledScript.exec(_context, scope);
        } else {
            throw new RuntimeException("cache contains invalid state for script " + script.getScriptName());
        }

        syslog(Level.DEBUG, "timings.execute", Long.toString(System.currentTimeMillis() - start) + "ms " + className);
        return scope;
    }

    @JS_Function
    public String hmac(String algorithm, String key, String data, boolean to_hex) {
        try {
            SecretKeySpec signingKey = new SecretKeySpec(key.getBytes(),
                                                         algorithm);
            Mac mac = Mac.getInstance(algorithm);
            mac.init(signingKey);

            if (to_hex) {
                return new String(Hex.encodeHex(mac.doFinal(data.getBytes())));
            } else {
                return new String(Base64.encodeBase64(mac.doFinal(data.getBytes())));
            }
        } catch (InvalidKeyException e) {
            throw new JSConvertableException("Invalid key: " +
                                             key).newJSException(this);
        } catch (NoSuchAlgorithmException e) {
            throw new JSConvertableException("Unable to load algoritm: " +
                                             algorithm).newJSException(this);
        }
    }

    // XXX to_hex should be like an enum or something, but since we only
    // care about two formats for now..
    @JS_Function
    public String hash(String algorithm, String str, boolean to_hex) {
        try {
            MessageDigest alg = MessageDigest.getInstance(algorithm);
            alg.reset();
            alg.update(str.getBytes());

            byte digest[] = alg.digest();

            if (to_hex) {
                return new String(Hex.encodeHex(digest));
            } else {
                return new String(Base64.encodeBase64(digest));
            }
        } catch (NoSuchAlgorithmException e) {
            throw new JSConvertableException("Unable to load algoritm: " +
                                             algorithm).newJSException(this);
        }
    }


    // developer-only entrypoint for triggering error handlers
    @SuppressWarnings("null")
    @JS_Function
    public String dev_test_internal(String name) {
        // the js entry point shouldn't be visible to user scripts
        // unless developer mode is enabled, but double-check it
        // here too.
        if (!ACRE_DEVELOPER_MODE) {
            return "";
        }

        if (name.equals("OutOfMemoryError")) {
            throw new OutOfMemoryError("this is an OutOfMemoryError message");
        }
        if (name.equals("StackOverflowError")) {
            throw new StackOverflowError("this is an StackOverflowError message");
        }
        if (name.equals("ThreadDeath")) {
            throw new ThreadDeath();
        }
        if (name.equals("RuntimeException")) {
            throw new RuntimeException("this is a RuntimeException message");
        }
        if (name.equals("Error")) {
            throw new Error("this is an Error message");
        }
        if (name.equals("AcreScriptError")) {
            throw new AcreScriptError("AcreScriptError - faked script was taking too long");
        }
        if (name.equals("NullPointerException")) {
            Object n = null;
            n.toString();
        }

        // not really "throw", so the different naming style is deliberate
        if (name.equals("java_infinite_loop")) {
            boolean a = true;
            while (a) {}
        }

        // quick-and-dirty reflecton of options to this function
        //  so they aren't duplicated in test code
        if (name.equals("list")) {
            return "OutOfMemoryError StackOverflowError ThreadDeath RuntimeException Error AcreScriptError NullPointerException java_infinite_loop";
        }

        // TODO add more options to test potential java failures
        //  log_spew   to try to overwhelm the log system
        // ...

        // if you add more cases, update the "list" case above too!

        return "";
    }
    
    private String signAcreAuth(String write_user) {
        String key = Configuration.Values.ACRE_AUTH_SECRET.getValue();
        Mac mac;
        try {
            mac = Mac.getInstance("HmacSHA1");
        } catch (java.security.NoSuchAlgorithmException e) {
            // XXX log failure
            return null;
        }

        try {
            SecretKeySpec sk = new SecretKeySpec(key.getBytes(), "HmacSHA1");
            mac.init(sk);
        } catch (java.security.InvalidKeyException e) {
            // XXX log failure
            return null;
        }

        // XXX should pass through _app_id as well for additional security

        byte[] hashbytes = mac.doFinal(write_user.getBytes());

        Hex hex = new Hex();
        String aauth = new String(hex.encode(hashbytes));

        return write_user + "|" + aauth;
    }    
    
}
