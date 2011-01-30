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

import java.util.HashMap;
import java.util.Map;

import org.mozilla.javascript.CompilerEnvirons;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.DefiningClassLoader;
import org.mozilla.javascript.GeneratedClassLoader;
import org.mozilla.javascript.Script;
import org.mozilla.javascript.optimizer.ClassCompiler;

import com.google.acre.AcreFactory;
import com.google.acre.Configuration;
import com.google.acre.classstore.ClassStore;
import com.google.acre.classstore.StoredClass;
import com.google.acre.script.exceptions.AcreInternalError;
import com.google.util.logging.MetawebLogger;

public class ScriptManager {

    private static MetawebLogger _logger = new MetawebLogger();

    private static final int ACRE_MAX_CACHED_SCRIPT_CLASSES = Configuration.Values.ACRE_MAX_CACHED_SCRIPT_CLASSES.getInteger();

    private Map<String, CachedScript> _scriptsByClassName = new HashMap<String, CachedScript>();

    private ClassStore _class_store;
    private ClassCompiler _compiler;
    private GeneratedClassLoader _classLoader;

    public ScriptManager() {
        _compiler = createCompiler();
        _classLoader = createClassLoader();
        try {
            _class_store = AcreFactory.getClassStore();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public CachedScript getScript(CachedScript script) {

        String className = script.getClassName();
        String sourceName = script.getSourceName();

        CachedScript cachedScript = _scriptsByClassName.get(className);

        // see if we have a cached script with this class name
        // and if it contains a compiled script
        if (cachedScript != null && cachedScript.getCompiledScript() != null) {
            return cachedScript;
        }

        // script not found in cache

        // clear the cache if it gets full
        // NOTE: this is not a very intelligent replacement strategy,
        //       but there is no way in java to force the classloader
        //       to garbage collect just one class, so we need to
        //       create a new one and dispose of the old one
        if (_scriptsByClassName.size() > ACRE_MAX_CACHED_SCRIPT_CLASSES) {
            _logger.debug("script.cache", "clearing cache");
            _scriptsByClassName.clear();
            _classLoader = null;
            _classLoader = createClassLoader();
        }

        // script not found in cache, compile it and cache it
        // note that we add the script before compiling it because
        // we need the debug info from the CachedScript to display errors.
        _scriptsByClassName.put(className, script);


        // Here, check if the class is in the class store, and pass it to
        // compileScript instead of the source if available
        if (_class_store != null) {
            _logger.debug("script.cache.get.begin", className);
            StoredClass sc = _class_store.get(className);
            _logger.debug("script.cache.get.end", className);
            if (sc != null) {
                Script compiledScript =
                    compileScript(_classLoader,
                                  new Object[] { sc.name(), sc.code() });
                script.setCompiledScript(compiledScript);

                return script;
            }
        }

        // in case of a syntax error, this method will throw.
        // so we need to make sure to check if the compiledScript in the
        Script compiledScript = compileScript(_classLoader, className, sourceName, script.getSourceText());

        // the compilation was successful, so we save the instantiated script for later
        script.setCompiledScript(compiledScript);

        return script;
    }

    public CachedScript getScriptByClassName(String className) {
        return _scriptsByClassName.get(className);
    }

    public CachedScript getScriptBySourceName(String sourceName) {
        String className = CachedScript.toClassName(sourceName);
        return _scriptsByClassName.get(className);
    }

    public void invalidate(String className) {
        _scriptsByClassName.remove(className);
    }

    // ------------------------------------------------------------------------------

    private Script compileScript(GeneratedClassLoader classloader, String className, String sourceName, String js_text) {
        // XXX this returns [String0, byte[]0, ..., StringN, byte[]N], we only
        // actually class load (String0, byte[]0), possibly missing classes
        // generated by the compiler. Is this ok?
        Object[] compiled = _compiler.compileToClassFiles(js_text, sourceName, 1, className);

        if (_class_store != null) {
            StoredClass sc =
                _class_store.new_storedclass((String)compiled[0],
                                             (byte[])compiled[1]);

            synchronized (_class_store) {
                _logger.debug("script.cache.put.begin", compiled[0]);
                _class_store.set((String)compiled[0], sc);
                _logger.debug("script.cache.put.end", compiled[0]);
            }
        }

        return compileScript(classloader, compiled);
    }

    @SuppressWarnings("unchecked")
    private Script compileScript(GeneratedClassLoader classloader, Object[] compiled) {
        Script script;

        Class<Script> klacc;

        // there could be multiple requests hitting scripts that are not found in the cache
        // and need to be compiled, for that reason we need to get a lock on the classloader
        // and wait our turn to compile.
        synchronized (classloader) {
            try {
                // once we are allowed in, it could well be that the request before us
                // was for the same exact script we're about to compile, so we need to
                // make sure it's not already there in the classloader or we'll throw later
                klacc = (Class<Script>) Class.forName((String)compiled[0], false, (ClassLoader) classloader);
            } catch (ClassNotFoundException e1) {
                // if we get here, it means that the class we want to compile is not there yet
                // so we're good

                try {
                    klacc = (Class<Script>) classloader.defineClass((String) compiled[0], (byte[]) compiled[1]);
                    classloader.linkClass(klacc);
                } catch (LinkageError e) {
                    throw new AcreInternalError("Failed to instantiate a compiled script " + compiled[0] + ":\n " + e.toString(), e);
                }
            }

            // once we get here, we have the Class we wanted (which was either already there in the classloader or
            // we compiled ourselves), so we can instantiate it

            try {
                script = klacc.newInstance();
            } catch (OutOfMemoryError e) {
                // We want to specifically throw this.
                throw e;
            } catch (InstantiationException t) {
                // this is a checked exception but it's not clear when it happens
                throw new AcreInternalError("Failed to instantiate a compiled script " + compiled[0] + ":\n " + t.toString(), t);
            } catch (IllegalAccessException t) {
                // this is a checked exception but it's not clear when it happens
                throw new AcreInternalError("Failed to instantiate a compiled script " + compiled[0] + ":\n " + t.toString(), t);
            }
        }
        
        _logger.debug("script.cache.compile", compiled[0]);
        return script;
    }

    // ------------------------------------------------------------------------------

    private GeneratedClassLoader createClassLoader() {
        ContextFactory cxf = HostEnv.getGlobal();
        Context cx;
        try {
            cx = cxf.enterContext();
            return new DefiningClassLoader(cx.getApplicationClassLoader());
        } finally {
            Context.exit();
        }
    }

    private ClassCompiler createCompiler() {
        CompilerEnvirons compilerEnv = new CompilerEnvirons();
        ContextFactory cxf = HostEnv.getGlobal();
        Context cx;
        try {
            cx = cxf.enterContext();
            compilerEnv.initFromContext(cx);
            return new ClassCompiler(compilerEnv);
        } finally {
            Context.exit();
        }
    }

}
