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

package com.google.acre;

import java.io.File;
import java.io.FileInputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.Map.Entry;

/**
 * Centralized configuration facility.
 */
public class Configuration implements ConfigurationMBean {

    public static final String CONFIG_FILE = "configDir";

    private static final String SANDBOX_SITE = "www.sandbox-freebase.com";
    private static final String SANDBOX_API  = "api.sandbox-freebase.com";
    private static final String DEFAULT_HOST = "0.0.0.0";
    private static final String DEFAULT_HOSTNAME = "localhost";
    private static final String DEFAULT_PORT = "8115";
    private static final String DEFAULT_NAME = "acre";

    public static enum Values {
        
        // strings
        ACRE_LOG_LEVEL("FINE"),
        ACRE_VERSION("[default]"),
        ACRE_HOST(DEFAULT_HOST),
        ACRE_WEBAPP("webapp"),
        ACRE_WEBAPP_ROOT("/"),
        ACRE_HOST_BASE(DEFAULT_HOSTNAME),
        ACRE_HOST_DELIMITER_HOST("host"),
        ACRE_HOST_DELIMITER_PATH("dev"),
        ACRE_SERVICE_ADDR(DEFAULT_HOSTNAME + ":" + DEFAULT_PORT), 
        ACRE_METAWEB_API_ADDR(SANDBOX_API), 
        ACRE_FREEBASE_SITE_ADDR(SANDBOX_SITE),
        ACRE_APPEDITOR_HOST("acre.freebase.com"),
        ACRE_METAWEB_API_PATH("USE_SERVLET_PATH"), 
        JS_LOGGER_NAME("acre.userlog"),
        ACCESS_LOG_LOGGER_NAME("acre.accesslog"),
        ACRE_TEMPSTORE_DIR("_logs/"), 
        ACRE_GMETRIC_CMD("gmetric"), 
        SERVICE_NAME(DEFAULT_NAME),
        
        ACRE_SQL_DRIVER("com.mysql.jdbc.Driver"),
        ACRE_SQL_USER("acre"),
        ACRE_SQL_TABLE("acre_keystore"),
        STATIC_SCRIPT_PATH("scripts/"),

        APPENGINE_REMOTE_APP_HOST,
        APPENGINE_REMOTE_APP_PATH("/remote_api"),
        APPENGINE_REMOTE_USERNAME,
        APPENGINE_REMOTE_PASSWORD,
        
        // booleans
        ACRE_SUICIDE("false"), 
        ENABLE_CLASS_SHUTTER("true"), 
        GENERATE_JS_DEBUG_INFO("true"), 
        HIDE_ACREBOOT_STACK("false"), 
        ACRE_AUTORELOADING("false"),
        ACRE_LIMIT_EXECUTION_TIME("true"),
        ACRE_APP_THRESHOLDING("false"),
        ACRE_DEVELOPER_MODE("false"),
        ACRE_TRUSTED_MODE("false"),
        ACRE_REMOTE_REQUIRE("true"),
        APPENGINE_REMOTING("false"),
        
        // numbers
        ACRE_PORT(DEFAULT_PORT), 
        ACRE_MAX_CACHED_SCRIPT_CLASSES("1000"), 
        ACRE_METAWEB_API_ADDR_PORT("80"), 
        ACRE_FREEBASE_SITE_ADDR_PORT("80"),
        ACRE_POOL_CORE_THREADS("10"), // lowest amount of available threads in the pool
        ACRE_POOL_MAX_THREADS("500"), // max amount of concurrently running threads
        ACRE_POOL_MAX_QUEUE("5000"), // max size of waiting queue
        ACRE_POOL_IDLE_TIME("30"), // in sec, time an idle thread remains in the pool before being GCed
        ACRE_CONNECTOR_ACCEPTORS("2"), // how many threads will asynchronously accept HTTP requests
        ACRE_CONNECTOR_MAX_IDLE_TIME("30000"), // in ms, time the server will wait for the request to finish
        ACRE_CONNECTOR_LOW_RESOURCE_CONNECTIONS("5000"), // number of concurrent connections to trigger low resources
        ACRE_CONNECTOR_LOW_RESOURCE_MAX_IDLE_TIME("5000"), // in ms , time server will wait for requests to finish when in low resources
        ACRE_CONNECTOR_HEADER_BUFFER_SIZE("65526"), // (64k - 10) how many bytes jetty should allocate for request and response headers 
                                                    // WARNING: squid has a limit to 64k so we can't do more than that
        ACRE_MAX_LOGS_SIZE("25000"), // how many bytes of the header buffer we should allow to be used for logs (keep some room for the other HTTP headers and cookies)
        ACRE_SCANNER_PERIOD("1"), // in seconds, period the scanner will look for changed files to restart the webapp (if enabled)
        ACRE_SUICIDE_LIFETIME("86400"), // 24h in seconds, how long acre will wait before committing suicide (if enabled)
        ACRE_MAX_OBJECT_COUNT_PER_SCRIPT("40000000"), 
        MAX_FILE_UPLOAD_SIZE("5000000"), // in bytes
        ACRE_SQL_TABLE_VERSION("1"),
        ACRE_MAX_REQUEST_RATE("100.0"), // in req/sec
        ACRE_REQUEST_MAX_TIME("30000"), // in ms
        ACRE_URLFETCH_TIMEOUT("30000"), // in ms, used only if ACRE_LIMIT_EXECUTION_TIME is false
        ACRE_MAX_ASYNC_CONNECTIONS("10"),

        // googleapis
        ACRE_GOOGLEAPIS_HOST,
        ACRE_GOOGLEAPIS_FREEBASE,
        ACRE_GOOGLEAPIS_KEY,

        // Compilation mode (interepreted/compiled) flag
        ACRE_COMPILER_OPTIMIZATION_LEVEL("0"),

        // port to use when connecting to a remote appengine
        APPENGINE_REMOTE_APP_PORT("443"),

        // values that are better without defaults because they could expose security-sensitive info
        ACRE_SQL,
        ACRE_SQL_PASSWORD,
        HTTP_PROXY_HOST, 
        HTTP_PROXY_PORT;

        private String defaultValue = null;

        Values(String... strings) {
            defaultValue = optionalParam(strings, null);
        }

        public String getValue() {
            String value = Configuration.get(name());
            if (value == null) {
                value = defaultValue;
            }
            return value;
        }

        public boolean getBoolean() {
            String val = getValue();
            return ("T".equals(val) || "TRUE".equalsIgnoreCase(val));
        }

        public int getInteger() {
            String val = getValue();
            try {
                return Integer.parseInt(val);
            } catch (NumberFormatException e) {
                throw new RuntimeException("Could not parse '" + val + "' as an integer number.");
            }
        }

        public float getFloat() {
            String val = getValue();
            try {
                return Float.parseFloat(val);
            } catch (NumberFormatException e) {
                throw new RuntimeException("Could not parse '" + val + "' as a floating point number.");
            }
        }
        
        private <T> T optionalParam(T[] params, T defaultValue) {
            if (params != null && params.length == 1) {
                return params[0];
            } else {
                return defaultValue;
            }
        }
    }

    private static String _configDir;
    private Map<String, String> _params = new HashMap<String, String>();

    static Configuration _instance;

    public static String getConfDir() {
        return _configDir;
    }

    static {
        _configDir = System.getProperty(CONFIG_FILE);
        _instance = new Configuration();
        load(_configDir, _instance);
    }

    static void load(String dir, Configuration conf) {
        // load properties from disk
        File file = new File(dir, "acre.properties");
        try {
            FileInputStream is = new FileInputStream(file);
            Properties props = new Properties();
            props.load(is);
            is.close();

            Set<Entry<Object, Object>> sets = props.entrySet();
            for (Entry<Object, Object> e : sets) {
                conf.put((String) e.getKey(), ((String) e.getValue()).trim());
            }

        } catch (Exception e) {
            throw new RuntimeException("Reading configuration " + file + " failed", e);
        }
        
        // overwrite with properties passed to the JVM at runtime
        Set<Map.Entry<Object,Object>> props = System.getProperties().entrySet();
        for (Map.Entry<Object,Object> p : props) {
            conf.put((String) p.getKey(), ((String) p.getValue()).trim());
        }
    }

    static String get(String name) {
        return _instance._params.get(name);
    }

    public static boolean isAppEngine() {
        return (_instance._params.get("com.google.appengine.runtime.version") != null);
    }
    
    void put(String name, String value) {
        _params.put(name, value);
    }
    
    public String getConfiguration(String name) {
        return Configuration.get(name);
    }
}
