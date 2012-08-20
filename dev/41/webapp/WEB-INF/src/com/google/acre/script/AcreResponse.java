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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.mozilla.javascript.Scriptable;

import com.google.acre.Configuration;
import com.google.acre.javascript.JSON;
import com.google.acre.javascript.JSONException;
import com.google.acre.servlet.AcreHttpServletResponse;
import com.google.acre.util.CostCollector;

public class AcreResponse extends JSConvertable {

    private static final int MAX_LOG_SIZE = Configuration.Values.ACRE_MAX_LOGS_SIZE.getInteger();
    
    private AcreHttpServletResponse _response;
    
    public long _used_memory = 0;
    
    private long _creation_time = System.currentTimeMillis();
    
    private String _metaweb_tid;
    private int _logtype;
    private String _log_level;
    public boolean _has_binary = false;
    private CostCollector _costCollector;

    public int _response_status;
    public List<List<Object>> _logs;
    public HashMap<String, String> _response_headers = new HashMap<String, String>();
    public HashMap<String, AcreCookie> _response_cookies = new HashMap<String, AcreCookie>();

    public AcreResponse(AcreHttpServletResponse response, int logtype, String log_level) {
        _response = response;
        if (logtype != 0) {
            _logs = new ArrayList<List<Object>>();
            _logtype = logtype;
            _log_level = log_level;
        }
        _costCollector = CostCollector.getInstance();
    }
    
    public void reset() {
        _response_cookies = new HashMap<String, AcreCookie>();
        _response_headers = new HashMap<String, String>();
        _response.reset();
    }

    public void setTID(String tid) {
        _metaweb_tid = tid;
    }
     
    public void write(String data) throws IOException {
        _response.getByteArrayOutput().write(data.getBytes("UTF-8"));
    }

    public void write(JSBinary data) throws IOException {
        _response.getByteArrayOutput().write(data.get_data());
        _has_binary = true;
    }
    
    public void addMissingHeader(String key, String value) {
        // This actually works because user set headers are normalized to lowercase, but
        // in general this is a bad way to check for something without case-sensitivity. ;)
        if (!_response_headers.containsKey(key) && !_response_headers.containsKey(key.toLowerCase())) {
            _response.setHeader(key, value);
        }
    }
       
    public void log(String level, Object messages) {
        if (isLogAllowed(level)) {
            Map<String, Object> metadata = new HashMap<String, Object>();
            if ("info".equals(level) || level == null || "".equals(level)) {
                level = "INFO";
            }

            metadata.put("Type", level.toUpperCase());
            metadata.put("Time", System.currentTimeMillis());

            ArrayList<Object> msg = new ArrayList<Object>();
            msg.add(metadata);
            msg.add(messages);
            _logs.add(msg);
        }
    }
    
    public void userlog4j(String level, String event_name, Object... msgparts) {
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

        ArrayList<Object> logmsg = new ArrayList<Object>();
        logmsg.add(event_name);
        logmsg.add(msg);

        log(level, logmsg);
    }

    boolean isLogAllowed(String level) {
        if (_logtype == 0) return false;
        // NOTE null level means, tell me if I'm allowed to log in general
        if (level == null) return true;

        level = level.toLowerCase();
        if ("log".equals(level)) level = "debug"; // firephp uses level "log" to mean "debug"
        if (_log_level == null || "debug".equals(_log_level)) return true; // if no level is specified, all goes thru
        if ("info".equals(_log_level)) {
            return !level.equals("debug");
        } else if ("warn".equals(_log_level)) {
            return level.equals("warn") || level.equals("error");
        } else if ("error".equals(_log_level)) {
            return level.equals("error");
        } else {
            return false;
        }
    }

    private static final String keyPrefix = "X-Wf-1-1-1-";
    public void setFirePHPHeaders() {
        if ((_logtype & AcreRequest._LOG_FirePHP) != 0) {
            _response.setHeader("X-Wf-Protocol-1","http://meta.wildfirehq.org/Protocol/JsonStream/0.2");
            _response.setHeader("X-Wf-1-Plugin-1", "http://meta.firephp.org/Wildfire/Plugin/FirePHP/Library-FirePHPCore/0.2.0");
            _response.setHeader("X-Wf-1-Structure-1", "http://meta.firephp.org/Wildfire/Structure/FirePHP/FirebugConsole/0.1");

            int counter = 0;
            int index = 0;

            int maxLength = 5000;

            //boolean truncated = false;
            Iterator<List<Object>> it = _logs.iterator();
            
            while (it.hasNext()) {
                String log;
                try {
                    log = JSON.stringify(it.next());
                } catch (JSONException e) {
                    throw new RuntimeException(e);
                }
                int totalLength = log.length();

                for (int i = 0; i < totalLength; i += maxLength) {
                    StringBuilder value = new StringBuilder();
                    String header_name = keyPrefix + index++;    
                    if (i == 0) {
                        value.append(Integer.toString(totalLength));
                    }
                    value.append('|');
                    value.append(log, i, (i + maxLength < totalLength) ?
                                 i + maxLength : totalLength);
                    value.append('|');
                    if (i + maxLength < totalLength) {
                        value.append('\\');
                    }
                    // truncated message is 90 chars, so give a little bit of
                    // leg room
                    counter += header_name.length() + value.length() + 4 + 150;
                    if (counter >= MAX_LOG_SIZE) {
                        truncated_logs(index);
                        return;
                    }
                    _response.setHeader(header_name, value.toString());
                }
            }
        }
    }

    public void truncated_logs(int index) {
        ArrayList<String> msg = new ArrayList<String>();
        msg.add("Logs Truncated [exceeded maximum allowed size]");
        log("WARN", msg);

        String header_name = keyPrefix + index;
        try {
            String jval = JSON.stringify(_logs.get(_logs.size() - 1));
            StringBuilder value = new StringBuilder();
            value.append(Integer.toString(jval.length()));
            value.append('|');
            value.append(jval);
            value.append('|');
            _response.setHeader(header_name, value.toString());
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }

    }

    // note that the pattern in UrlUtil.java is incorrect.
    // XXX this is duplicated in AcreFetch.java too
    private static Pattern _CONTENT_TYPE_CHARSET =
        Pattern.compile("^([^;]+); charset=['\"]?([^;'\"]+)['\"]?");
    private static final SimpleDateFormat _DATE_FORMAT =
        new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz");

    public void finish() throws IOException {
        _response.setStatus(_response_status);
        
        String expires = null;

        for (Map.Entry<String,String> header : _response_headers.entrySet()) {
            String key = header.getKey();
            String value = header.getValue();
            // XXX should suppress cookie headers?

            if ("content-type".equalsIgnoreCase(key)) {
                // make sure we set an explicit charset=UTF-8 for text/* only
                Matcher m = _CONTENT_TYPE_CHARSET.matcher(value);
                if (!m.find() && value.startsWith("text/")) {
                    value = value + "; charset=UTF-8";
                }
                _response.setContentType(value);
            } else if ("content-length".equalsIgnoreCase(key) ||
                       "date".equalsIgnoreCase(key) ||
                       "server".equalsIgnoreCase(key) ||
                       "connection".equalsIgnoreCase(key)) {
                // ignore user-provided Content-Length (which we generate), 
                // Date, Server and Connection header
            } else if ("expires".equalsIgnoreCase(key)) {
                // This was being clobbered by addCookie()
                // a few lines down (ACRE-1778), so now we
                // wait until after that to copy it into
                // the response.
                expires = value;
            } else {
                _response.setHeader(key, value);
            }
        }

        // fill in standard Acre headers
        String curdt = _DATE_FORMAT.format(new Date());
        _response.setHeader("Date", curdt);
        _response.setHeader("Server", "Acre-" +
                            Configuration.Values.ACRE_VERSION.getValue());

        // Add some cache related headers only if we had a positive response
        if (_response_status == 200) {
            // XXX is this needed?
            addMissingHeader("Last-Modified", curdt);
        }
        
        if (_metaweb_tid != null) {
            _response.setHeader("X-Metaweb-TID", _metaweb_tid);
        }

        for (Map.Entry<String,AcreCookie> cookie : _response_cookies.entrySet()) {
            AcreCookie c = cookie.getValue();
            // This calls javax.servlet.http.HttpServletResponse:addCookie(),
            // which sets the "Expires" header to "Thu, 01 Jan 1970 00:00:00 GMT".
            _response.addCookie(c.toServletCookie());
        }

        if (expires != null) {
            // Now it is safe to set this.
            _response.setHeader("Expires", expires);
        }

        setFirePHPHeaders();

        byte[] json_res = generate_json_response();
        if (json_res != null) {
            ByteArrayOutputStream output = _response.getByteArrayOutput();
            output.reset();
            output.write(json_res);
            // Force the response content-type
            _response.setContentType("text/plain");
        }
        
        _costCollector.collect("at", System.currentTimeMillis() - _creation_time);
        _response.setHeader("x-metaweb-cost", _costCollector.getCosts());
    }
    
    public byte[] generate_json_response() throws UnsupportedEncodingException {
        if ((_logtype & AcreRequest._LOG_JSONBODY) != 0) {
            HashMap<String, Object> out = new HashMap<String, Object>();
            if (!_has_binary) {
                out.put("body", _response.getByteArrayOutput().toString("UTF-8"));
            } else {
                // XXX do something here...
                out.put("body", null);
            }
            out.put("headers", _response_headers);
            out.put("status", _response_status);
            // XXX _logs is a list of strings, should be the useful json
            //     instead
            out.put("logs", _logs);
            try {
                String json_out = JSON.stringify(out);
                return json_out.getBytes("UTF-8");
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
        return null;
    }

}
