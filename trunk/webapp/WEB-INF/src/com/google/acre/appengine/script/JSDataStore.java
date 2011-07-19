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

import java.util.Date;

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
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Text;
import com.google.appengine.api.datastore.Transaction;

public class JSDataStore extends JSObject {
    
    private static final long serialVersionUID = -2496958331292538818L;

    private static final int STRING_SIZE_INDEXING_CUTOFF = 200;
    
    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSDataStore(scope);
    }
    
    // ------------------------------------------------------------------------------------------

    private DatastoreService _store;

    public JSDataStore() { }
    
    public JSDataStore(Scriptable scope) {
        _scope = scope;
        _store = DatastoreServiceFactory.getDatastoreService();
    }
    
    public String getClassName() {
        return "DataStore";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    public Scriptable jsFunction_begin() {
        try {
            Transaction transaction = _store.beginTransaction();
            JSDataStoreTransaction jsTransaction = new JSDataStoreTransaction(transaction,_scope);
            return jsTransaction.makeJSInstance();
        } catch (Exception e) {
            throw new JSConvertableException("Failed to initiate transaction: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public String jsFunction_key(String id, String type) {
        try {
            return KeyFactory.createKeyString(type, id);
        } catch (Exception e) {
            throw new JSConvertableException("Failed to create key with type '" + type + " and id '" + id + "': " + e.getMessage()).newJSException(_scope);
        }
    }

    public String jsFunction_explain_key(String key) {
        try {
            return stringToKey(key).toString();
        } catch (Exception e) {
            throw new JSConvertableException("Failed to explain key '" + key + ": " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public Object jsFunction_get(String obj_key, Scriptable transaction) {
        try {
            Key key = stringToKey(obj_key);
            Entity e = (transaction instanceof JSDataStoreTransaction) ? _store.get(((JSDataStoreTransaction) transaction).getWrapped(), key) : _store.get(key);
            return extract(e, _scope);
        } catch (EntityNotFoundException e) {
            return null;
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            if (message.indexOf("Invalid Key") > -1) {
                throw new JSConvertableException("'" + obj_key + "' is not a valid key, have you called acre.store.key()?").newJSException(_scope);
            } else {
                throw new JSConvertableException("Failed to get entity: " + message).newJSException(_scope);
            }
        } catch (Exception e) {
            throw new JSConvertableException("Failed to obtain object with key '" + obj_key + ": " + e.getMessage()).newJSException(_scope);
        }
    }

    public Object jsFunction_put(String kind, Scriptable obj, String id, String parent_key, Scriptable transaction) {
        try {
            Entity entity = null;
            if (id == null || "null".equals(id) || "undefined".equals(id) ) {
                if (parent_key == null || "null".equals(parent_key) || "undefined".equals(parent_key)) {
                    entity = new Entity(kind);
                } else {
                    entity = new Entity(kind, stringToKey(parent_key));
                }
            } else {
                if (parent_key == null || "null".equals(parent_key) || "undefined".equals(parent_key)) {
                    entity = new Entity(kind, id);
                } else {
                    entity = new Entity(kind, id, stringToKey(parent_key));
                }
            }
            embed(entity, obj, false);
            Key k = (transaction instanceof JSDataStoreTransaction) ? _store.put(((JSDataStoreTransaction) transaction).getWrapped(), entity) : _store.put(entity);
            return keyToString(k);
        } catch (Exception e) {
            throw new JSConvertableException("Failed to save object: " + e.getMessage()).newJSException(_scope);
        }
    }

    public Object jsFunction_update(String obj_key, Scriptable obj, Scriptable transaction) {
        try {
            Key key = stringToKey(obj_key);
            Entity entity = (transaction instanceof JSDataStoreTransaction) ? _store.get(((JSDataStoreTransaction) transaction).getWrapped(), key) : _store.get(key);
            embed(entity, obj, true);
            Key k = (transaction instanceof JSDataStoreTransaction) ? _store.put(((JSDataStoreTransaction) transaction).getWrapped(), entity) : _store.put(entity);
            return keyToString(k);
        } catch (Exception e) {
            throw new JSConvertableException("Failed to update object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public void jsFunction_remove(String obj_key, Scriptable transaction) {
        try {
            Key key = stringToKey(obj_key);
            if (transaction instanceof JSDataStoreTransaction) {
                _store.delete(((JSDataStoreTransaction) transaction).getWrapped(), key);
            } else {
                _store.delete(key);
            }
        } catch (Exception e) {
            throw new JSConvertableException("Failed to remove object: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    public Scriptable jsFunction_find(String kind, Scriptable query, Object cursor) {
        try {
            Query aequery = new Query(kind);
            compile_query("", "", query, aequery);
            PreparedQuery pq = _store.prepare(aequery);
            JSDataStoreResults results = new JSDataStoreResults(pq,cursor,_scope);
            return results.makeJSInstance();
        } catch (Exception e) {
            throw new JSConvertableException("Failed to query store: " + e.getMessage()).newJSException(_scope);
        }
    }

    public Scriptable jsFunction_find_keys(String kind, Scriptable query, Object cursor) {
        try {
            Query aequery = new Query(kind);
            compile_query("", "", query, aequery.setKeysOnly());
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
    
    private final static String METADATA = "_";
    private final static String KEY = "key";
    private final static String CREATION_TIME = "creation_time";
    private final static String LAST_MODIFIED_TIME = "last_modified_time";
    
    public static Object extract(Entity entity, Scriptable scope) throws JSONException {
        Object json = entity.getProperty(JSON_PROPERTY);
        if (json != null) {
            Object creation_time = entity.getProperty(CREATION_TIME_PROPERTY);
            Object last_modified_time = entity.getProperty(LAST_MODIFIED_TIME_PROPERTY);
            Scriptable o = (Scriptable) JSON.parse(((Text) json).getValue(), scope, false);
            Scriptable metadata = Context.getCurrentContext().newObject(scope);
            ScriptableObject.putProperty(metadata, KEY, keyToString(entity.getKey()));
            ScriptableObject.putProperty(metadata, CREATION_TIME, (creation_time instanceof Date) ? ((Date) creation_time).getTime() : creation_time);
            ScriptableObject.putProperty(metadata, LAST_MODIFIED_TIME, (last_modified_time instanceof Date) ? ((Date) last_modified_time).getTime() : last_modified_time);
            ScriptableObject.putProperty(o,METADATA,metadata);
            return o;
        } else {
            return keyToString(entity.getKey());
        }
    }
    
    public void embed(Entity entity, Scriptable obj, boolean update) throws JSONException {
        Date now = new Date();
        entity.setUnindexedProperty(JSON_PROPERTY, new Text(JSON.stringify(obj)));
        entity.setProperty(LAST_MODIFIED_TIME_PROPERTY, now);
        if (!update) {
            entity.setProperty(CREATION_TIME_PROPERTY, now);
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
                if (METADATA.equals(prop)) continue;
                
                Object value = obj.get(prop, obj);

                if (value instanceof Number && (prop.endsWith("_date") || prop.endsWith("_time"))) {
                    value = new Date(((Number) value).longValue());
                }
                
                // NOTE(SM): for some reason, sometimes Rhino returns numbers that are integers and sometimes doubles
                // since javascript only knows about doubles, let's stick to that because appengine sorting
                // is inconsistent if you use different types for the same property
                if (value instanceof Number && !(value instanceof Double)) {
                    value = new Double(((Number) value).doubleValue());
                }

                String p = path + prop;
                
                if (value instanceof String) {
                    // don't index big strings, since we won't used them as query filters anyway
                    if (((String) value).length() < STRING_SIZE_INDEXING_CUTOFF) {
                        entity.setProperty(p, value);
                    }
                } else if (value instanceof Boolean || value instanceof Number || value instanceof Date) {
                    entity.setProperty(p, value);
                } else if (value instanceof Scriptable) {
                    index_object(p + ".", (Scriptable) value, entity);
                } else {
                    //throw new JSConvertableException("Sorry, you can't save objects with null or undefined properties (" + p + ")").newJSException(_scope);
                }
            }
        } else if ("Array".equals(className)) {
            // TODO (SM): implement Array indexing
        } else {
            // this should never happen but better safe than sorry
            throw new JSConvertableException("Sorry, don't know how to index this class of object (" + className + ")").newJSException(_scope);
        }
    }

    void compile_query(String path, String context, Scriptable obj, Query query) {
        String className = obj.getClassName();
        if ("Object".equals(className)) {
            Object[] ids = obj.getIds();
            for (Object i: ids) {
                if (!(i instanceof String)) {
                    throw new JSConvertableException("All properties in queries must be strings.").newJSException(_scope);
                }
                
                String prop = (String) i;
                String origProp = prop;

                // no need to add a filter for type since 'kind' is already restricting it
                if ("type".equals(prop)) continue;
                
                if (prop.indexOf('.') > -1) {
                    throw new JSConvertableException("Sorry, but properties are not allowed to contain the '.' character").newJSException(_scope);
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

                if (value instanceof Number && (prop.endsWith("_date") || prop.endsWith("_time"))) {
                    value = new Date(((Number) value).longValue());
                }
                
                // NOTE(SM): for some reason, sometimes Rhino returns numbers that are integers and sometimes doubles
                // since javascript only knows about doubles, let's stick to that because appengine sorting
                // is inconsistent if you use different types for the same property
                if (value instanceof Number && !(value instanceof Double)) {
                    value = new Double(((Number) value).doubleValue());
                }
                
                if (value instanceof String || value instanceof Boolean || value instanceof Number) {
                    if (METADATA.equals(context)) {
                        throw new JSConvertableException("Sorry, metadata field '" + prop + "' does not exist.").newJSException(_scope);
                    } else {
                        query.addFilter(path + prop, filterOperator, value);
                    }
                } else if (value instanceof Date) {
                    if (METADATA.equals(context)) {
                        if (prop.equals(CREATION_TIME)) {
                            query.addFilter(CREATION_TIME_PROPERTY, filterOperator, value);
                        } else if (prop.equals(LAST_MODIFIED_TIME)) {
                            query.addFilter(LAST_MODIFIED_TIME_PROPERTY, filterOperator, value);
                        } else {
                            throw new JSConvertableException("Sorry, metadata field '" + prop + "' does not exist.").newJSException(_scope);
                        }
                    } else {
                        query.addFilter(path + prop, filterOperator, value);
                    }
                } else if (value instanceof Scriptable) {
                    compile_query(path + prop + ".", prop, (Scriptable) value, query);
                } else {
                    throw new JSConvertableException("Sorry, you can't have null or undefined constrains").newJSException(_scope);
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
            throw new JSConvertableException("Sorry, don't know how to query using this class of object (" + className + ")").newJSException(_scope);
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
