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

import org.mozilla.javascript.ClassShutter;

import com.google.acre.Configuration;

public class AcreClassShutter implements ClassShutter {

    //private static MetawebLogger _logger = new MetawebLogger();
    
    private static final boolean ENABLED = Configuration.Values.ENABLE_CLASS_SHUTTER.getBoolean();

    public AcreClassShutter() {}
    
    public boolean visibleToScripts(String fullClassName) {

        // rhino always asks about  org, com, edu, and net so don't log them
        if (fullClassName.length() < 4) return !ENABLED;

        //_logger.debug("class_shutter.query", fullClassName);

        // XXX these need to be specifically disallowed, even if liveconnect is enabled, or
        //     json2.js will fail. This is not the optimal approach, but it gets the job done.
        if ( "org.mozilla.javascript.EcmaError".equals(fullClassName)) return false;
        if ( "org.mozilla.javascript.EvaluatorException".equals(fullClassName)) return false;
        if ( "org.mozilla.javascript.JavaScriptException".equals(fullClassName)) return false;

        return !ENABLED;
    }

}
