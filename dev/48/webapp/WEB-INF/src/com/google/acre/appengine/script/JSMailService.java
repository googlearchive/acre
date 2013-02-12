// Copyright 2007-2011 Google, Inc.

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
import org.mozilla.javascript.NativeArray;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import com.google.acre.javascript.JSObject;
import com.google.acre.script.exceptions.JSConvertableException;
import com.google.appengine.api.mail.MailService;
import com.google.appengine.api.mail.MailService.Message;
import com.google.appengine.api.mail.MailServiceFactory;

public class JSMailService extends JSObject {
    
    private static final long serialVersionUID = 33767007410685378L;

    public static Scriptable jsConstructor(Context cx, Object[] args, Function ctorObj, boolean inNewExpr) {
        Scriptable scope = ScriptableObject.getTopLevelScope(ctorObj);
        return new JSMailService(scope);
    }
    
    private MailService _mailService;
    
    // ------------------------------------------------------------------------------------------

    public JSMailService() { }
    
    public JSMailService(Scriptable scope) {
        _scope = scope;
        _mailService = MailServiceFactory.getMailService();
    }
    
    public String getClassName() {
        return "MailService";
    }
    
    // ---------------------------------- public functions  ---------------------------------
    
    /**
     * The obj argument must be a js object and have this shape (all properties are optional):
     * 
     *  {
     *    "subject" : "...",
     *    "sender" : "sender@domain.com",
     *    "to"  : [ "receiver1@domain.com" , "receiver2@domain.com" ],
     *    "cc"  : [ "receiver1@domain.com" , "receiver2@domain.com" ],
     *    "bcc" : [ "receiver1@domain.com" , "receiver2@domain.com" ],
     *    "reply_to" : "...",
     *    "text_body" : "...",
     *    "html_body" : "..."
     *  }
     */
    public void jsFunction_send(Scriptable obj) {
        try {
            _mailService.send(getMessage(obj));
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to send message: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    /**
     * The obj argument must have the same shope as the "send" method
     */
    public void jsFunction_send_admins(Scriptable obj) {
        try {
            _mailService.sendToAdmins(getMessage(obj));
        } catch (java.lang.Exception e) {
            throw new JSConvertableException("Failed to send message to admins: " + e.getMessage()).newJSException(_scope);
        }
    }
    
    private Message getMessage(Scriptable obj) {
        String className = obj.getClassName();
        if ("Object".equals(className)) {
            Message message = new MailService.Message();
            Object[] ids = obj.getIds();
            for (Object i: ids) {
                if (!(i instanceof String)) {
                    throw new JSConvertableException("All properties in objects must be strings.").newJSException(_scope);
                }
                String p = (String) i;
                Object v = obj.get(p,obj);
                if ("subject".equals(p)) {
                    if (v instanceof String) { 
                        message.setTo((String) v);
                    } else {
                        throw new JSConvertableException("'to' property must contain a string or an array of strings").newJSException(_scope);
                    }
                } else if ("sender".equals(p)) {
                    if (v instanceof String) { 
                        message.setSender((String) v);
                    } else {
                        throw new JSConvertableException("'sender' property must contain a string").newJSException(_scope);
                    }
                } else if ("text_body".equals(p)) {
                    if (v instanceof String) { 
                        message.setTextBody((String) v);
                    } else {
                        throw new JSConvertableException("'sender' property must contain a string").newJSException(_scope);
                    }
                } else if ("html_body".equals(p)) {
                    if (v instanceof String) { 
                        message.setHtmlBody((String) v);
                    } else {
                        throw new JSConvertableException("'sender' property must contain a string").newJSException(_scope);
                    }
                } else if ("reply_to".equals(p)) {
                    if (v instanceof String) { 
                        message.setReplyTo((String) v);
                    } else {
                        throw new JSConvertableException("'reply_to' property must contain a string").newJSException(_scope);
                    }
                } else if ("to".equals(p)) {
                    if (v instanceof String) { 
                        message.setTo((String) v);
                    } else if (v instanceof NativeArray) {
                        NativeArray array = (NativeArray) v;
                        for (int j = 0; j < array.getLength(); j++) {
                            Object vv = array.get(j, array);
                            if (vv instanceof String) {
                                message.setTo((String) vv);
                            } else {
                                throw new JSConvertableException("'to' property must contain an array of strings").newJSException(_scope);
                            }
                        }
                    } else {
                        throw new JSConvertableException("'to' property must contain a string (instead is a " + v.getClass().getName() + ")").newJSException(_scope);
                    }
                } else if ("cc".equals(p)) {
                    if (v instanceof String) { 
                        message.setCc((String) v);
                    } else if (v instanceof NativeArray) {
                        NativeArray array = (NativeArray) v;
                        for (int j = 0; j < array.getLength(); j++) {
                            Object vv = array.get(j, array);
                            if (vv instanceof String) {
                                message.setCc((String) vv);
                            } else {
                                throw new JSConvertableException("'cc' property must contain an array of strings").newJSException(_scope);
                            }
                        }
                    } else {
                        throw new JSConvertableException("'cc' property must contain a string (instead is a " + v.getClass().getName() + ")").newJSException(_scope);
                    }
                } else if ("bcc".equals(p)) {
                    if (v instanceof String) { 
                        message.setBcc((String) v);
                    } else if (v instanceof NativeArray) {
                        NativeArray array = (NativeArray) v;
                        for (int j = 0; j < array.getLength(); j++) {
                            Object vv = array.get(j, array);
                            if (vv instanceof String) {
                                message.setBcc((String) vv);
                            } else {
                                throw new JSConvertableException("'bcc' property must contain an array of strings").newJSException(_scope);
                            }
                        }
                    } else {
                        throw new JSConvertableException("'bcc' property must contain a string (instead is a " + v.getClass().getName() + ")").newJSException(_scope);
                    }
                } else {
                    throw new JSConvertableException("parameter '" + p + "' is not recognized").newJSException(_scope);
                }
            }
            return message;
        } else {
            throw new JSConvertableException("Param must be an object").newJSException(_scope);
        }
    }
}
