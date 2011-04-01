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

package com.google.acre.appengine.script;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.javascript.JSON;
import com.google.acre.javascript.JSONException;
import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Text;
import com.google.appengine.api.datastore.Transaction;

public class JSDataStore extends JSObject {
    
    private static final long serialVersionUID = -2496958331292538818L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDataStore(scope);
    }
    
    // ------------------------------------------------------------------------------------------

    private DatastoreService _store;
    private Transaction _transaction;

    public JSDataStore() { }
    
    public JSDataStore(Scriptable scope) {
        _scope = scope;
        _store = DatastoreServiceFactory.getDatastoreService();
    }
    
    public String getClassName() {
        return "DataStore";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    public void jsFunction_begin() {
        if (_transaction != null) {
            throw new JSConvertableException("A transaction has already been established").newJSException(_scope);
        }
        try {
            _transaction = _store.beginTransaction();
        } catch (Exception e) {
            throw new JSConvertableException("Failed to initiate transaction: " + e.getMessage()).newJSException(_scope);
        }
    }

    public void jsFunction_commit() {
        if (_transaction == null) {
            throw new JSConvertableException("There is no transaction to commit, have you called acre.store.begin() first?").newJSException(_scope);
        }
        try {
            _transaction.commit();
        } catch (Exception e) {
            throw new JSConvertableException("Failed to commit transaction: " + e.getMessage()).newJSException(_scope);
        }
        _transaction = null; // remove transaction even after failure or we won't be able to create another one
    }

    public void jsFunction_rollback() {
        if (_transaction == null) {
            throw new JSConvertableException("There is no transaction to roll back, have you called acre.store.begin() first?").newJSException(_scope);
        }
        try {
            if (_transaction.isActive()) {
                _transaction.rollback();
            }
        } catch (Exception e) {
            throw new JSConvertableException("Failed to roll back transaction: " + e.getMessage()).newJSException(_scope);
        }
        _transaction = null; // remove transaction even after failure or we won't be able to create another one
    }
    
    public Scriptable jsFunction_get(String app_id, String obj_key) {
        try {
            Key key = stringToKey(obj_key);
            return extract(_store.get(_transaction, key), _scope);
        } catch (Exception e) {
            throw new JSConvertableException("Failed to obtain object with id '" + obj_key + ": " + e.getMessage()).newJSException(_scope);
        }
    }

    public Object jsFunction_put(String app_id, Scriptable obj, String name, String parent_key) {
        try {
            Entity entity = null;
            if (name == null || "null".equals(name) || "undefined".equals(name) ) {
                if (parent_key == null || "null".equals(parent_key) || "undefined".equals(parent_key)) {
                    entity = new Entity(app_id);
                } else {
                    entity = new Entity(app_id, stringToKey(parent_key));
                }
            } else {
                if (parent_key == null || "null".equals(parent_key) || "undefined".equals(parent_key)) {
                    entity = new Entity(app_id, name);
                } else {
                    entity = new Entity(app_id, name, stringToKey(parent_key));
                }
            }
            embed(entity, obj, false);
            Key k = _store.put(_transaction, entity);
            return keyToString(k);
        } catch (Exception e) {
            e.printStackTrace();
            throw new JSConvertableException("Failed to save object: " + e.getMessage()).newJSException(_scope);
        }
    }

    public Object jsFunction_update(String app_id, String obj_key, Scriptable obj) {
        try {
            Key key = stringToKey(obj_key);
            Entity entity = _store.get(_transaction, key);
            embed(entity, obj, true);
            Key k = _store.put(_transaction, entity);
            return keyToString(k);
        } catch (Exception e) {
            throw new JSConvertableException("Failed to update object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public void jsFunction_remove(String app_id, String obj_key) {
        try {
            Key key = stringToKey(obj_key);
            _store.delete(_transaction, key);
        } catch (Exception e) {
            throw new JSConvertableException("Failed to remove object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public Scriptable jsFunction_find(String app_id, Scriptable query, Object cursor) {
        try {
            Query aequery = new Query(app_id);
            compile_query("", query, aequery);
            PreparedQuery pq = _store.prepare(aequery);
            JSDataStoreResults results = new JSDataStoreResults(pq,cursor,_scope);
            return results.makeJSInstance();
        } catch (Exception e) {
            throw new JSConvertableException("Failed to query store: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    // -------------------------------------------------------------------------------------------------------------
    
    private final static String JSON_PROPERTY = "@#@JSON@#@";
    private final static String CREATION_TIME_PROPERTY = "@#@CREATION_TIME@#@";
    private final static String LAST_MODIFIED_TIME_PROPERTY = "@#@LAST_MODIFIED_TIME@#@";
    
    public static Scriptable extract(Entity entity, Scriptable scope) throws JSONException {
        Object json = entity.getProperty(JSON_PROPERTY);
        Object creation_time = entity.getProperty(CREATION_TIME_PROPERTY);
        Object last_modified_time = entity.getProperty(LAST_MODIFIED_TIME_PROPERTY);
        Scriptable o = (Scriptable) JSON.parse(((Text) json).getValue(), scope, false);
        Scriptable metadata = Context.getCurrentContext().newObject(scope);
        ScriptableObject.putProperty(metadata, "key", keyToString(entity.getKey()));
        ScriptableObject.putProperty(metadata, "creation_time", creation_time);
        ScriptableObject.putProperty(metadata, "last_modified_time", last_modified_time);
        ScriptableObject.putProperty(o,"_",metadata);
        return o;
    }
    
    public void embed(Entity entity, Scriptable obj, boolean update) throws JSONException {
        long now = System.currentTimeMillis();
        entity.setUnindexedProperty(JSON_PROPERTY, new Text(JSON.stringify(obj)));
        entity.setUnindexedProperty(LAST_MODIFIED_TIME_PROPERTY, now);
        if (!update) {
            entity.setUnindexedProperty(CREATION_TIME_PROPERTY, now);
        }
        index_object("", obj, entity);
    }

    // -------------------------------------------------------------------------------------------------------------

    static Object get_key_name(Key key) {
        return (key.getName() != null) ? key.getName() : key.getId();
    }
    
    Key get_key(String app_id, Object obj_id) {
        Key key = null;
        if (obj_id instanceof String) {
            key = KeyFactory.createKey(app_id, (String) obj_id);
        } else if (obj_id instanceof Number) {
            key = KeyFactory.createKey(app_id, ((Number) obj_id).intValue());
        } else {
            throw new JSConvertableException("obj IDs can only be strings or numbers").newJSException(_scope);
        }
        return key;
    }
    
    void index_object(String path, Scriptable obj, Entity entity) {
        String className = obj.getClassName();
        if ("Object".equals(className)) {
            Object[] ids = obj.getIds();
            for (Object i: ids) {
                if (!(i instanceof String)) {
                    // this should never happen but just to be sure
                    throw new JSConvertableException("All properties in objects must be strings.").newJSException(_scope);
                }
                
                String prop = (String) i;
                
                if (prop.indexOf('.') > -1) {
                    throw new JSConvertableException("Sorry, but properties are not allowed to contain the '.' character").newJSException(_scope);
                }
    
                // '_' is a reserved property that contains the object metadata. If it's passed to us we need to ignore it
                if (prop.equals("_")) continue;
                
                Object value = obj.get(prop, obj);
                
                // NOTE(SM): for some reason, sometimes Rhino returns numbers that are integers and sometimes doubles
                // since javascript only knows about doubles, let's stick to that because appengine sorting
                // is inconsistent if you use different types for the same property
                if (value instanceof Number && !(value instanceof Double)) {
                    value = new Double(((Number) value).doubleValue());
                }
                
                if (value instanceof String || value instanceof Boolean || value instanceof Number) {
                    entity.setProperty(path + prop, value);
                } else if (value instanceof Scriptable) {
                    index_object(path + prop + ".", (Scriptable) value, entity);
                } else {
                    //throw new JSConvertableException("Sorry, you can't save objects with null or undefined properties (" + path + prop + ")").newJSException(_scope);
                }
            }
        } else if ("Array".equals(className)) {
            // TODO (SM): implement Array indexing
        } else {
            // this should never happen but better safe than sorry
            throw new JSConvertableException("Sorry, don't know how to index this type of object (" + className + ")").newJSException(_scope);
        }
    }

    void compile_query(String path, Scriptable obj, Query query) {
        String className = obj.getClassName();
        if ("Object".equals(className)) {
            Object[] ids = obj.getIds();
            for (Object i: ids) {
                if (!(i instanceof String)) {
                    throw new JSConvertableException("All properties in queries must be strings.").newJSException(_scope);
                }
                
                String prop = (String) i;
                String origProp = prop;
                
                if (prop.indexOf('.') > -1) {
                    throw new JSConvertableException("Sorry, but properties are not allowed to contain the '.' character").newJSException(_scope);
                }

                if (prop.equals("_")) {
                    throw new JSConvertableException("Sorry, but property '_' is reserved and your objects can't contain it").newJSException(_scope);
                }
                
                FilterOperator filterOperator = Query.FilterOperator.EQUAL;
    
                if (prop.endsWith("<")) {
                    prop = prop.substring(0,prop.length() - 1);
                    filterOperator = Query.FilterOperator.LESS_THAN;
                } else if (prop.endsWith("<=")) {
                    prop = prop.substring(0,prop.length() - 2);
                    filterOperator = Query.FilterOperator.LESS_THAN_OR_EQUAL;
                } if (prop.endsWith(">")) {
                    prop = prop.substring(0,prop.length() - 1);
                    filterOperator = Query.FilterOperator.GREATER_THAN;
                } else if (prop.endsWith(">=")) {
                    prop = prop.substring(0,prop.length() - 2);
                    filterOperator = Query.FilterOperator.GREATER_THAN_OR_EQUAL;
                } else if (prop.endsWith("!=")) {
                    prop = prop.substring(0,prop.length() - 2);
                    filterOperator = Query.FilterOperator.NOT_EQUAL;
                } else if (prop.endsWith("|=")) {
                    // TODO (SM): implement the "|=" operator since appengine supports the IN filteroperator
                    throw new JSConvertableException("Sorry, the '|=' operator is not yet supported").newJSException(_scope);
                }
                
                Object value = obj.get(origProp, obj);

                // NOTE(SM): for some reason, sometimes Rhino returns numbers that are integers and sometimes doubles
                // since javascript only knows about doubles, let's stick to that because appengine sorting
                // is inconsistent if you use different types for the same property
                if (value instanceof Number && !(value instanceof Double)) {
                    value = new Double(((Number) value).doubleValue());
                }
                
                if (value instanceof String || value instanceof Boolean || value instanceof Number) {
                    query.addFilter(path + prop, filterOperator, value);
                } else if (value instanceof Scriptable) {
                    compile_query(path + prop + ".",(Scriptable) value,query);
                } else {
                    throw new JSConvertableException("Sorry, you can't have null or underfined constrains").newJSException(_scope);
                    // NOTE(SM): I suspect this is going to be hard to digest for people used to MQL where 'null' basically means
                    // to constraint by the existence of that property. Since appengine does not support querying for objects that
                    // have a property defined, no matter its value, this is going to be hard to do efficiently.
                    // If you know a way, by all means, let me know and I'll be happy to implement it.
                }
            }
        } else if ("Array".equals(className)) {
            // TODO (SM): implement Array selection
            throw new JSConvertableException("Sorry, Array selection is not supported yet").newJSException(_scope);
        } else {
            // this should never happen but better safe than sorry
            throw new JSConvertableException("Sorry, don't know how to index this type of object (" + className + ")").newJSException(_scope);
        }
    }
    
    static String keyToString(Key key) {
        String str = KeyFactory.keyToString(key); 
        return str;
    }
    
    static Key stringToKey(String str) {
        return KeyFactory.stringToKey(str);
    }
}
