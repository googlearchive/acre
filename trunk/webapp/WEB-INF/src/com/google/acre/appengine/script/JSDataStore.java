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
import com.google.util.javascript.JSON;
import com.google.util.javascript.JSONException;
import com.google.util.javascript.JSObject;

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
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to initiate transaction: " + e.getMessage()).newJSException(_scope);
        }
    }

    public void jsFunction_commit() {
        if (_transaction == null) {
            throw new JSConvertableException("There is no transaction to commit, have you called acre.store.begin() first?").newJSException(_scope);
        }
        try {
            _transaction.commit();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to commit transaction: " + e.getMessage()).newJSException(_scope);
        }
        _transaction = null; // remove transaction even after failure or we won't be able to create another one
    }

    public void jsFunction_rollback() {
        if (_transaction == null) {
            throw new JSConvertableException("There is no transaction to commit, have you called acre.store.begin() first?").newJSException(_scope);
        }
        try {
            _transaction.rollback();
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to roll back transaction: " + e.getMessage()).newJSException(_scope);
        }
        _transaction = null; // remove transaction even after failure or we won't be able to create another one
    }
    
    public Scriptable jsFunction_get(String app_id, String obj_id) {
        try {
            Key key = KeyFactory.stringToKey(obj_id);
            String kind = key.getKind();
            if (kind.equals(app_id)) {
                return extract(_store.get(_transaction, key), _scope);
            } else {
                throw new JSConvertableException("Security violation: you can't read data that belongs to another app.").newJSException(_scope);
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to obtain object with id '" + obj_id + ": " + e.getMessage()).newJSException(_scope);
        }
    }

    public String jsFunction_put(String app_id, Scriptable obj) {
        try {
            Entity entity = new Entity(app_id);
            embed(entity, obj);
            Key key = _store.put(_transaction, entity);
            return KeyFactory.keyToString(key);
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to save object: " + e.getMessage()).newJSException(_scope);
        }
    }

    public String jsFunction_update(String app_id, String obj_id, Scriptable obj) {
        try {
            Key key = KeyFactory.stringToKey(obj_id);
            String kind = key.getKind();
            if (kind.equals(app_id)) {
                Entity entity = _store.get(_transaction, key);
                embed(entity, obj);
                Key key2 = _store.put(_transaction, entity);
                return KeyFactory.keyToString(key2);
            } else {
                throw new JSConvertableException("Security violation: you can't read data that belongs to another app.").newJSException(_scope);
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to update object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public void jsFunction_remove(String app_id, String obj_id) {
        try {
            Key key = KeyFactory.stringToKey(obj_id);
            String kind = key.getKind();
            if (kind.equals(app_id)) {
                _store.delete(_transaction, key);
            } else {
                throw new JSConvertableException("Security violation: you can't read data that belongs to another app.").newJSException(_scope);
            }
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to remove object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public Scriptable jsFunction_find(String app_id, Scriptable query) {
        try {
            Query aequery = new Query(app_id);
            compile_query("", query, aequery);
            PreparedQuery pq = _store.prepare(aequery);
            JSDataStoreResults results = new JSDataStoreResults(pq,_scope);
            return results.makeJSInstance();
        } catch (java.lang.Exception e) {
            e.printStackTrace();
            throw new JSConvertableException("Failed to query store: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    // -------------------------------------------------------------------------------------------------------------
    
    private final static String JSON_PROPERTY = "@#@JSON@#@";
    
    public static Scriptable extract(Entity entity, Scriptable scope) throws JSONException {
        Object json = entity.getProperty(JSON_PROPERTY);
        Scriptable o = (Scriptable) JSON.parse(((Text) json).getValue(), scope, false);
        Scriptable metadata = Context.getCurrentContext().newObject(scope);
        ScriptableObject.putProperty(metadata, "id", KeyFactory.keyToString(entity.getKey()));
        ScriptableObject.putProperty(o,"_",metadata);
        return o;
    }
    
    public void embed(Entity entity, Scriptable obj) throws JSONException {
        entity.setUnindexedProperty(JSON_PROPERTY, new Text(JSON.stringify(obj)));
        index_object("", obj, entity);
    }

    // -------------------------------------------------------------------------------------------------------------

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
                    throw new JSConvertableException("Sorry, you can't save objects with null or underfined properties (" + path + prop + ")").newJSException(_scope);
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
}
