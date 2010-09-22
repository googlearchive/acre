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


package com.google.acre.servlet;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.io.FileUtils;

import com.google.util.javascript.JSON;
import com.google.util.javascript.JSONException;

public class OneTrueConfig {
	
    public OneTrueConfig() {
    }

	public String get_string_property(Map<?,?> obj, String key)
        throws JSONException, OneTrueConfigException {
        String out = null;
        if (obj.containsKey(key)) {
            Object valv = obj.get(key);
            if (valv == null || valv instanceof String) {
                out = (String) valv;
            } else {
                throw new OneTrueConfigException("This expression has type "+
                                                 "String but is here used with "+
                                                 "type Object: "+
                                                 JSON.stringify(valv));
            } 
        }
        return out;
    }

	public Map<String, String> route_as_servlet(Map<?,?> to) throws JSONException,
                                               OneTrueConfigException {
        Map<String, String> out = new HashMap<String, String>();
        String path = get_string_property(to, "path");
        String servlet = get_string_property(to, "servlet");
        if (servlet == null) {
            throw new OneTrueConfigException("No servlet supplied in route: "+
                                             JSON.stringify(to));
        }

        out.put("path", path);
        out.put("host", null);
        out.put("servlet", servlet);
        return out;
    }

    public Map<String, String> route_as_static(Map<?,?> to) throws JSONException,
                                              OneTrueConfigException {
        Map<String, String> out = new HashMap<String, String>();
        String path = get_string_property(to, "path");
        if (path == null) {
            throw new OneTrueConfigException("No path supplied in static route: "+
                                             JSON.stringify(to));
        }

        out.put("servlet", "DefaultServlet");
        out.put("host", null);
        out.put("path", path);
        return out;
    }

    public Map<String, String> route_as_script(Map<?,?> to) throws JSONException,
                                              OneTrueConfigException {
        Map<String, String> out = new HashMap<String, String>();
        String location = get_string_property(to, "location");

        String host = "";
        String path = "";

        if (location == null) {
            throw new OneTrueConfigException("No Location provided in script "+
                                             "route: "+JSON.stringify(to));
        }

        String[] path_parts = location.split("/");
        int i = 0;
        for (i = 0; i < path_parts.length-1; i++) {
            if (!(host.equals(""))) host = "."+host;
            host  = path_parts[i]+host;
        }
        path = "/"+path_parts[i];

        out.put("servlet", "DispatchServlet");
        out.put("host", host);
        out.put("path", path);
        return out;
    }

    public Map<String, String> route_as_app(Map<?,?> to) throws JSONException, OneTrueConfigException {
        Map<String, String> out = new HashMap<String, String>();
        String location = get_string_property(to, "location");
        String host = "";
        String path = "/";

        if (location == null) {
            host = null;
        } else {
            String[] path_parts = location.split("/");
            for (int i = 0; i < path_parts.length; i++) {
                if (!(host.equals(""))) host = "."+host;
                host  = path_parts[i]+host;
            }
        }

        out.put("servlet", "DispatchServlet");
        out.put("host", host);
        out.put("path", path);
        return out;
    }

    public String process_param(Map<?,?> param) throws JSONException,
                                                  OneTrueConfigException {
        if (param.containsKey("key") && param.containsKey("value")) {
            Object keyv = param.get("key");
            Object valv = param.get("value");
            if (!(keyv instanceof String) || !(valv instanceof String)) {
                throw new OneTrueConfigException("Properties key or value of "+
                                                 "param property are not "+
                                                 "strings: "+
                                                 JSON.stringify(param));
            }
            String key = (String)keyv;
            String val = (String)valv;
            return key+"="+val;
        } else {
            throw new OneTrueConfigException("Property param is missing key or "+
                                             "value properties: "+
                                             JSON.stringify(param));
        }
    }

    public List<String> process_from(List<Object> hosts_list, String from_qs,
                                     String path) throws JSONException,
                                                         OneTrueConfigException {
        List<String> out = new ArrayList<String>();

        for (Object hostv : hosts_list) {
            if (hostv != null && !(hostv instanceof String)) {
                throw new OneTrueConfigException("Host is not a string: "+
                                                 JSON.stringify(hostv));
            }
            String host = (String)hostv;
            if (host != null) {
                String px = host+":"+path+from_qs;
                out.add(px);
            } else {
                String px = path+from_qs;
                out.add(px);
            }
        }
        return out;
    }

    public List<String[]> process_rule(List<Object> hosts_list,
                                       Map<?,?> rule) throws JSONException,
                                                        OneTrueConfigException {
        List<String[]> res = new ArrayList<String[]>();
        if (rule.containsKey("from") && rule.containsKey("to")) {
            Object fromv = rule.get("from");
            Object tov = rule.get("to");
            if (!(fromv instanceof Map) || !(tov instanceof Map)) {
                throw new OneTrueConfigException("Property from or to not an "+
                                                 "object in rule "+
                                                 JSON.stringify(rule));
            }

            // host:from_path servlet hostname-"dev.freebaseapps.com" to_path
            Map<?,?> from = (Map<?,?>)fromv;
            Map<?,?> to = (Map<?,?>)tov;
            List<String> to_pathes = new ArrayList<String>();

            String from_qs = "";
            if (from.containsKey("param")) {
                Object paramv = from.get("param");
                from_qs += "?";
                if (paramv instanceof Map) {
                    from_qs += process_param((Map<?,?>)paramv);
                } else if (paramv instanceof List) {
                    int i = 0;
                    for (Object param : (List<?>)paramv) {
                        if (param instanceof Map) {
                            from_qs += process_param((Map<?,?>)param);
                            if (i != ((List<?>)paramv).size()-1) from_qs += "&";
                        } else {
                            throw new OneTrueConfigException("Property param "+
                                                             "includes invalid "+
                                                             "input: "+
                                                             JSON.stringify(paramv)
                                                             );
                        }
                        i++;
                    }
                } else {
                    throw new OneTrueConfigException("Property param includes "+
                                                     "invalid input: "+
                                                     JSON.stringify(paramv));
                }
            }

            if (from.containsKey("path")) {
                Object pathv = from.get("path");
                if (pathv instanceof String) {
                    to_pathes = process_from(hosts_list, from_qs, (String)pathv);
                } else if (pathv instanceof List) {
                    for (Object path : (List<?>)pathv) {
                        if (path instanceof String) {
                            to_pathes.addAll(process_from(hosts_list, from_qs,
                                                          (String)path));
                        } else {
                            throw new OneTrueConfigException("Path supplied is "+
                                                             "neither a string "+
                                                             "or an array: "+
                                                             JSON.stringify(pathv)
                                                             );
                        }
                    }
                } else {
                    throw new OneTrueConfigException("Path supplied is neither a "+
                                                     "string or an array: "+
                                                     JSON.stringify(pathv));
                }
            } else if (!(from_qs.equals(""))) {
                to_pathes = process_from(hosts_list, from_qs, "");
            }

            /* ---- handle to property */
            String route_as = get_string_property(to, "route_as");
            if (route_as == null) {
                throw new OneTrueConfigException("No route_as provided: "+
                                                 JSON.stringify(to));
            }

            Map<String, String> route_rule = new HashMap<String, String>();
            if (route_as.equals("servlet")) {
                route_rule = route_as_servlet(to);
            } else if (route_as.equals("static")) {
                route_rule = route_as_static(to);
            } else if (route_as.equals("script")) {
                route_rule = route_as_script(to);
            } else if (route_as.equals("app")) {
                route_rule = route_as_app(to);
            } else {
                throw new OneTrueConfigException("Not a valid route_as "+route_as);
            }
            
            for (String pth : (List<String>)to_pathes) {
                String route_path = (String)route_rule.get("path");
                /*
                if (route_as.equals("static") && !(pth.equals("/"))) {
                    String pth_only = pth.substring(pth.indexOf(":")+1).split("\\?")[0];
                    route_path = pth_only+route_path;
                    }*/
                res.add(new String[] { pth, (String)route_rule.get("servlet"), 
                                       (String)route_rule.get("host"),
                                       route_path });
            }

        } else {
            throw new OneTrueConfigException("Rule "+JSON.stringify(rule)+
                               " is missing to or from property");
        }
        return res;
    }

    @SuppressWarnings("unchecked")
	public List<String[]> handle_rule(Map<?,?> rule) 
        throws JSONException, OneTrueConfigException {
        List<String[]> res = new ArrayList<String[]>();
        if (rule.containsKey("rules") && rule.containsKey("host")) {
            Object hostv = rule.get("host");
            List<Object> hosts_list;
            if (hostv instanceof List) {
                hosts_list = (List<Object>)hostv;
            } else {
                hosts_list = new ArrayList<Object>();
                hosts_list.add(hostv);
            }

            Object rules = rule.get("rules");
            if (rules instanceof List) {
                for (Object r : (List<?>)rules) {
                    res.addAll(process_rule(hosts_list, (Map<?,?>)r));
                }
            } else {
                throw new OneTrueConfigException("Rules property "+
                                                 JSON.stringify(rules)+
                                                 " is not an array");
            }

        } else {
            throw new OneTrueConfigException("Rule "+
                                             JSON.stringify(rule)+
                                             " is missing host or rules property");
        }
        return res;
    }

    public List<String[]> handle_rules_list(List<?> rules) 
        throws JSONException, OneTrueConfigException {
        List<String[]> res = new ArrayList<String[]>();
        for (Object obj : rules) {
            if (obj instanceof Map) {
                res.addAll(handle_rule((Map<?,?>)obj));
            } else {
                throw new OneTrueConfigException("Invalid rule definition " +
                                                 JSON.stringify(obj));
            }
        }
        return res;
    }

    public static List<String[]> parse(String jsonstr) throws JSONException,
                                                       OneTrueConfigException {
        OneTrueConfig otc = new OneTrueConfig();
        
        Object parsed = JSON.parse(jsonstr);
        if (parsed instanceof List) {
            List<?> rules = (List<?>)parsed;
            int size = rules.size();
            if (size > 0) {
                return otc.handle_rules_list(rules);
            } else {
                throw new OneTrueConfigException("no rules (exiting)");
            }
        } else if (parsed instanceof Map) {
            Map<?,?> rule = (Map<?,?>)parsed;
            return otc.handle_rule(rule);
        } else {
            throw new OneTrueConfigException("No rules (exiting)");
        }
    }

    public static List<String[]> parse() throws JSONException,
                                                OneTrueConfigException {
        File cdir = new File(System.getProperty("configDir"));
        List<String[]> rules = new ArrayList<String[]>();
        for (File f : cdir.listFiles()) {
            String name = f.getName();
            if (name.startsWith("ots.") && name.endsWith(".conf")) {
                String contents = null;
                try {
                    contents = FileUtils.readFileToString(f);
                    rules.addAll(parse(contents));
                } catch (IOException e) {
                    throw new OneTrueConfigException("Error reading file: " + f);
                }
            }
        }
        return rules;
    }
}
