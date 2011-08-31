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

import com.google.acre.AcreFactory;
import com.google.acre.cache.Cache;
import com.google.acre.javascript.JSObject;

public class JSCache extends JSObject {
    
    private static final long serialVersionUID = 7556102890015508964L;

    private static Cache _cache;

    static {
        try {
            _cache = AcreFactory.getCache();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String getClassName() {
        return "Cache";
    }

    public String jsFunction_get(String key) {
        return _cache.get(key);
    }

    public void jsFunction_put(String key, String value, Double expires) {
        if (!(expires.isNaN())) {
            _cache.put(key, value, expires.longValue());
        } else {
            _cache.put(key, value);
        }
    }

    public String jsFunction_delete(String key) {
        return _cache.delete(key);
    }

}
