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

import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Layout;
import org.apache.log4j.spi.LoggingEvent;

import com.google.acre.Configuration;
import com.google.util.TIDGenerator;

public class NetLogV3Layout extends Layout {

    private final static String _default_ciid;

    static {
        String service_name = Configuration.Values.SERVICE_NAME.getValue();
        String port = Configuration.Values.ACRE_PORT.getValue();
        String short_hostname = TIDGenerator.getShortHostname();
        
        _default_ciid = service_name + ":" + short_hostname + ":" + port;
    }

    public void activateOptions() {
    }

    private final static SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS000'Z'");
    
    
    @SuppressWarnings("unchecked")
    public String format(LoggingEvent event) {
        String tid = ((String) event.getMDC("TID"));
        String event_name = ((String) event.getMDC("LogEvent"));
        String ciid = ((String) event.getMDC("CIID"));
        if (ciid == null) {
            ciid = _default_ciid;
        }

        StringBuffer entry = new StringBuffer(256);
        entry.append("D:");
        entry.append(DATE_FORMAT.format(event.timeStamp));
        entry.append("\t");
        entry.append("E:");
        entry.append(event_name);
        entry.append("\t");
        entry.append("C:");
        entry.append(ciid);
        entry.append("\t");
        entry.append("T:");
        entry.append(tid);
        
        HashMap<String, Object> props;
        Object mesg = event.getMessage();
        if (mesg instanceof Map) {
            props = (HashMap<String, Object>) mesg;
        } else {
            props = new HashMap<String, Object>();
            props.put("Message", (mesg != null) ? mesg.toString() : "null");
        }
        
        props.put("Level", event.getLevel().toString());

        for (Map.Entry<String, Object> prop : props.entrySet() ) {
            String key = prop.getKey();
            key = key.replace("\\", "\\\\");
            key = key.replace("\r", "\\r");
            key = key.replace("\n", "\\n");
            key = key.replace("\t", "\\t");
            
            Object value_obj = prop.getValue();
            String value;
            if (value_obj == null) {
                value = "null";
            } else {
                value = value_obj.toString();
            }
            value = value.replace("\\", "\\\\");
            value = value.replace("\r", "\\r");
            value = value.replace("\n", "\\n");
            value = value.replace("\t", "\\t");

            entry.append("\t");
            entry.append(key);
            entry.append(":");
            entry.append(value);
        }
        
        entry.append("\n");
        return entry.toString();
    }

    public boolean ignoresThrowable() {
        return true;
    }
        
}
