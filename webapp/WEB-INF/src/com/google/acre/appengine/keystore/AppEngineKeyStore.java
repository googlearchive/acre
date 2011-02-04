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

package com.google.acre.appengine.keystore;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.acre.keystore.KeyStore;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Query;

public class AppEngineKeyStore implements KeyStore {
    
    private static KeyStore _singleton;
    
    public static synchronized KeyStore getKeyStore() {
        if (_singleton == null) {
            _singleton = new AppEngineKeyStore();
        }
        return _singleton;
    }

    private DatastoreService _datastore;

    private AppEngineKeyStore() {
        _datastore = DatastoreServiceFactory.getDatastoreService();
    }

    public void put_key(String keyname, String appid, String token, String secret) {
        Entity key = new Entity("Key");
        key.setProperty("name", keyname);
        key.setProperty("appid", appid);
        key.setUnindexedProperty("token", token);
        if (secret != null) {
            key.setUnindexedProperty("secret", secret);
        }
        _datastore.put(key);
    }

    public void put_key(String keyname, String appid, String token) {
         put_key(keyname, appid, token, null);
    }

    public void delete_key(String keyname, String appid) {
        Query query = new Query("Key");
        query.addFilter("name", Query.FilterOperator.EQUAL, keyname);
        query.addFilter("appid", Query.FilterOperator.EQUAL, appid);
        for (Entity key : _datastore.prepare(query).asIterable()) {
            _datastore.delete(key.getKey());
        }
        return;
    }

    public String[] get_key(String keyname, String appid) {
        Query query = new Query("Key");
        query.addFilter("name", Query.FilterOperator.EQUAL, keyname);
        query.addFilter("appid", Query.FilterOperator.EQUAL, appid);
        for (Entity key : _datastore.prepare(query).asIterable()) {
            String token = (String) key.getProperty("token");
            String secret = (String) key.getProperty("secret");
            return new String[] { token, secret };
        }
        return null;
    }

    public List<Map<String,String>> get_full_keys(String appid) {
        List<Map<String,String>> res = new ArrayList<Map<String,String>>();

        Query query = new Query("Key");
        query.addFilter("appid", Query.FilterOperator.EQUAL, appid);
        for (Entity key : _datastore.prepare(query).asIterable()) {
            Map<String,String> map = new HashMap<String,String>();
            map.put("key_id", (String) key.getProperty("name"));
            map.put("token",  (String) key.getProperty("token"));
            map.put("secret", (String) key.getProperty("secret"));
            res.add(map);
        }

        return res;
    }

    public List<String> get_keys(String appid) {
        List<String> res = new ArrayList<String>();
            
        Query query = new Query("Key");
        query.addFilter("appid", Query.FilterOperator.EQUAL, appid);
        for (Entity key : _datastore.prepare(query).asIterable()) {
            res.add((String) key.getProperty("name"));
        }

        return res;
    }
}
