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


package com.metaweb.util.logging;

import java.util.Map;
import java.util.HashMap;
import java.util.List;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.apache.log4j.MDC;
import org.apache.log4j.PropertyConfigurator;

import org.mozilla.javascript.Scriptable;

import com.metaweb.acre.Configuration;
import com.metaweb.util.javascript.JSON;
import com.metaweb.util.javascript.JSONException;

/**
 * Logging class that provides interfaces close to ME logging api so that
 * logging can be done for this service in a similar manner. 
 *
 * The actual ME logging api is not provided, mainly because its too much work 
 * to write custom loggers and appenders. What we have here are wrappers for 
 * most of the default java logger interfaces.
 * 
 * Instantiate this logger as a local instance variable in the worker:
 * 
 * <pre>
 * MetawebLogger logger = new MetawebLogger("module name");
 * </pre>
 * 
 * To do the actual logging you will need to do:
 * 
 * <pre>
 * logger.info('...', '...');
 * logger.warn('...', '...');
 * </pre>
 * 
 * We are using MDC's to pass around context information. MDC's are <a
 * href='http://logging.apache.org/log4j/docs/api/org/apache/log4j/MDC.html'>copied
 * from the parent thread</a>. In this case the MDC is used mainly to push 
 * parameters down the logger without having to write custom logging code
 * - which I really really don't want to do.
 * 
 * One of the downsides to using this approach is the loss of access to a single
 * static logger per VM instance. APIs that need to use the logger, are used by
 * the worker or its callees and do not get the thread context passed down to
 * them might need to be passed in at least the logger.
 */

public final class MetawebLogger {

    private static String _serviceName = Configuration.Values.SERVICE_NAME.getValue();
        
    static {
        String confDir = Configuration.getConfDir();
        PropertyConfigurator.configure(confDir + "/log4j.properties");
    }
    
    private Logger _logger;

    public MetawebLogger() {
        this(_serviceName);
    }

    public MetawebLogger(String logger_name) {
        _logger = Logger.getLogger(logger_name);
    }

    /**
     * Wrapped log methods to make sure that the event and level MDC variables
     * are properly setup and output
     */

    public void error(String event_name, Object message, Throwable t) {
        logActual(event_name, Level.ERROR, message, t);
    }
    
    public void error(String event_name, Object message) {
        logActual(event_name, Level.ERROR, message, null);
    }

    public void fatal(String event_name, Object message) {
        logActual(event_name, Level.FATAL, message, null);
    }

    public void warn(String event_name, Object message) {
        logActual(event_name, Level.WARN, message, null);
    }

    public void info(String event_name, Object message) {
        logActual(event_name, Level.INFO, message, null);
    }

    public void debug(String event_name, Object message) {
        logActual(event_name, Level.DEBUG, message, null);
    }

    public void trace(String event_name, Object message) {
        logActual(event_name, Level.TRACE, message, null);
    }
    
    public void log(String event_name, Level level, Object message) {
        logActual(event_name, level, message, null);
    }

    @SuppressWarnings("unchecked")
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
                    msg.put(key, "[INVALID JSON]");
                }
            } else if (p == null) {
                msg.put(key, null);
            } else {
                msg.put(key, p.toString());
            }
            key = null;
        }

        log(event_name, level, msg);
    }

    // ----------------------------------------------------------------------
    
    /**
     * Do the actual logging here by delegating the effort to the log4j modules.
     * Sets up the various volatile MDC variables which will get passed down to
     * the logging subsystem.
     * 
     * @param event_name
     *            the name of the event that is being logged
     * @param level
     *            the severity level
     * @param message
     *            the message to be logged
     * @param throwable any exceptions that are thrown
     */
    private void logActual(String event_name, Level level, Object message, Throwable throwable) {
        // It's ok to use getName here since userlogs won't bubble up
        MDC.put("LogEvent", _logger.getName() + "." + event_name);
        if (throwable != null) {
            _logger.log(level, message, throwable);
        } else {
            _logger.log(level, message);
        }
        // remove them from MDC just to be sure
        MDC.remove("LogEvent");
    }
    
}
