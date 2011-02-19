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

package com.google.util.logging;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.apache.log4j.PropertyConfigurator;
import org.mozilla.javascript.Scriptable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import com.google.acre.Configuration;
import com.google.util.javascript.JSON;
import com.google.util.javascript.JSONException;

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

    public static final byte ERROR = 0;
    public static final byte WARN = 1;
    public static final byte INFO = 2;
    public static final byte DEBUG = 3;
    public static final byte TRACE = 4;
    
    public static byte toLevel(String str) {
        if ("error".equalsIgnoreCase(str)) {
            return ERROR;
        } else if ("warn".equalsIgnoreCase(str)) {
            return WARN;
        } else if ("info".equalsIgnoreCase(str)) {
            return INFO;
        } else if ("debug".equalsIgnoreCase(str)) {
            return DEBUG;
        } else if ("trace".equalsIgnoreCase(str)) {
            return TRACE;
        } else {
            throw new RuntimeException("Sorry, don't know how to log '" + str + "' messages");
        }
    }

    static {
        String confDir = Configuration.getConfDir();
        PropertyConfigurator.configure(confDir + "/log4j.properties");
    }
    
    private static String _serviceName = Configuration.Values.SERVICE_NAME.getValue();
            
    private Logger _logger;

    public MetawebLogger() {
        this(_serviceName);
    }

    public MetawebLogger(String logger_name) {
        _logger = LoggerFactory.getLogger(logger_name);
    }

    /**
     * Wrapped log methods to make sure that the event and level MDC variables
     * are properly setup and output
     */

    public void error(String event_name, Object message, Throwable t) {
        logActual(event_name, ERROR, message, t);
    }
    
    public void error(String event_name, Object message) {
        logActual(event_name, ERROR, message, null);
    }

    public void warn(String event_name, Object message) {
        logActual(event_name, WARN, message, null);
    }

    public void info(String event_name, Object message) {
        logActual(event_name, INFO, message, null);
    }

    public void debug(String event_name, Object message) {
        logActual(event_name, DEBUG, message, null);
    }

    public void trace(String event_name, Object message) {
        logActual(event_name, TRACE, message, null);
    }
    
    public void log(String event_name, byte level, Object message) {
        logActual(event_name, level, message, null);
    }

    public void syslog4j(byte level, String event_name, Object... msgparts) {
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
    private void logActual(String event_name, byte level, Object msg_obj, Throwable throwable) {
        // It's ok to use getName here since userlogs won't bubble up
        MDC.put("LogEvent", _logger.getName() + "." + event_name);
        String message = stringify(msg_obj);
        if (throwable != null) {
            switch (level) {
                case ERROR : _logger.error(message, throwable); break;
                case WARN  : _logger.warn(message, throwable);  break;
                case INFO  : _logger.info(message, throwable);  break;
                case DEBUG : _logger.debug(message, throwable); break;
                case TRACE : _logger.trace(message, throwable); break;
            }
        } else {
            switch (level) {
                case ERROR : _logger.error(message); break;
                case WARN  : _logger.warn(message);  break;
                case INFO  : _logger.info(message);  break;
                case DEBUG : _logger.debug(message); break;
                case TRACE : _logger.trace(message); break;
            }
        }
        // remove them from MDC just to be sure
        MDC.remove("LogEvent");
    }
    
    private String stringify(Object obj) {
        if (obj instanceof String) {
            return (String) obj;
        } else if (obj instanceof Map) {
            StringBuffer b = new StringBuffer();
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) obj;
            Iterator<Map.Entry<String,Object>> i = map.entrySet().iterator();
            while(i.hasNext()) {
                Map.Entry<String,Object> entry = i.next();
                String key = entry.getKey();
                Object v = entry.getValue();
                String value = (v == null) ? "null" : v.toString();
                b.append(key);
                b.append(": ");
                b.append(value);
                if (i.hasNext()) b.append(", ");
            }
            return b.toString();
        } else {
            return "*** don't know how to serialize " + obj.getClass().getName() + " objects";
        }
    }
    
}
