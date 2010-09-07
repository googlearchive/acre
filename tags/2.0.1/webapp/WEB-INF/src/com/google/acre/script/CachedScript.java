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

import org.mozilla.javascript.Script;

public class CachedScript {

    private String _source_text;
    private String _class_name;
    private String _script_name;
    private String _source_name;
    private String _app;
    private Script _compiled_script;
    private int[] linemap;

    public static String getClassName(String script_name, String content_id) {
        return toClassName(join(clean(script_name),content_id));
    }

    public static String toClassName(String name) {
        if (name.charAt(0) == '/') {
            name = name.substring(1);
        }
        return name.replace('/','.').replace("-","_$_");
    }
    
    public static String clean(String name) {
        if (name.endsWith(".js")) {
            name = name.substring(0,name.length() - ".js".length());
        }
        return name;
    }

    public static String join(String name, String id) {
        if (id != null && !"".equals(id)) {
            return name + "$" + id;
        } else {
            return name;
        }
    }
    
    public CachedScript(String script_name, String source_text, String content_id) {
        
        // XXX: this is hacky, we should not be inferring the app name 
        //      from the script name like this
        int index = script_name.lastIndexOf('/');
        if (index > -1) {
            _app = script_name.substring(0,index);
        }

        _script_name = clean(script_name);
        _source_name = join(_script_name,content_id);
        _class_name = toClassName(_source_name);

        _source_text = source_text;
    }

    public String getClassName() {
        return _class_name;
    }

    public String getScriptName() {
        return _script_name;
    }

    public String getSourceName() {
        return _source_name;
    }
    
    public String getApp() {
        return _app;
    }
    
    public String getSourceText() {
        if (_source_text == null) throw new RuntimeException("Script has been already compiled");
        return _source_text;
    }

    public Script getCompiledScript() {
        return _compiled_script;
    }

    public int[] getLinemap() {
        return linemap;
    }

    public int mapLineNumber(int line) {
        if (linemap != null && line >0 && line <= linemap.length ) {
            return linemap[line-1];
        } else {
            return line;
        }
    }

    // ----------------------------------------------------
    
    public void setCompiledScript(Script compiledScript) {
        _compiled_script = compiledScript;
        // once the script is compiled, the source can be garbage collected
        _source_text = null;
    }
    
    public void setLinemap(int[] _linemap) {
        linemap = _linemap;
    }

}
