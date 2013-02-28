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

package com.google.acre.appengine.classstore;

import com.google.acre.classstore.ClassStore;
import com.google.acre.classstore.StoredClass;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.google.acre.util.CostCollector;

public class AppEngineClassStore implements ClassStore {

    private MemcacheService _cache;
    private CostCollector _costCollector;

    public AppEngineClassStore() {
        _cache = MemcacheServiceFactory.getMemcacheService("class_store");
        _costCollector = CostCollector.getInstance();
    }

    public StoredClass get(String name) {
        _costCollector.collect("amsrc").collect("amsrn");
        final long start_time = System.currentTimeMillis();

        StoredClass sc = (StoredClass) _cache.get(name);
        _costCollector.collect("amsrw", System.currentTimeMillis() - start_time);
        return sc;
        
    }

    public void set(String name, StoredClass klass) {
        _costCollector.collect("amwc").collect("amwn");
        final long start_time = System.currentTimeMillis();
        _cache.put(name, klass);
        _costCollector.collect("amww", System.currentTimeMillis() - start_time);
    }

    public StoredClass new_storedclass() {
        return new StoredClass();
    }

    public StoredClass new_storedclass(String name, byte[] code) {
        return new StoredClass(name, code);
    }
}
