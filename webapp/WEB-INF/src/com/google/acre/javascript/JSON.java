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


package com.google.acre.javascript;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.mozilla.javascript.Callable;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.NativeArray;
import org.mozilla.javascript.NativeJavaObject;
import org.mozilla.javascript.NativeObject;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;

/**
 * JavaScript encoder and decoder that works with Rhino native objects.
 * The .encode() method also accepts Java List and Map classes.
 */
public class JSON {

    private static final long serialVersionUID = 8762880254093633049L;

    public JSON() { }
    
    private enum TokenType { object, array, stringValue, numberValue, booleanValue, nullValue }

    /**
     * Encodes an object to a JSON String.
     *
     * @param o
     * @return the encoded object
     */
    public static String stringify(Object o) throws JSONException {
        return stringify(o,null, null);
    }
    
    /**
     * Encodes an object to a JSON String.
     *
     * @param o the object to encode
     * @param space the amount to indent (either as string or as number of spaces)
     * @return the encoded object
     */
    public static String stringify(Object o, String indent, Scriptable scope) throws JSONException {
        if ("null".equals(indent)) indent = null;
        StringBuffer sb = new StringBuffer(512);
        encode(null, o, sb, "", indent, scope);
        return sb.toString();
    }

    /**
     * Decodes a JSON String to Rhino native objects.
     *
     * @param s
     * @return the decoded Rhino native object
     * @throws IOException
     */
    public static Object parse(String s, Scriptable scope,
                               Boolean want_java) throws JSONException {
        Object res;
        Input in = new Input(s);
        consumeWhitespace(in);
        //if (in.peek() !=  '{' && in.peek() != '[') throw new JSONException(in.generateError("A JSON payload must begin with an object or array"));
        res = decodeReader(in, scope, want_java);
        // Trailing space is probably non-compliant, but enough input has it that we probably
        // should chew it up.
        consumeWhitespace(in);
        if (in.read() != -1) throw new JSONException(in.generateError("trailing data in input"));
        return res;
    }

    public static Object parse (String s, Scriptable scope) throws JSONException {
        return parse(s, scope, false);
    }

    public static Object parse(String s) throws JSONException {
        return parse(s, null, true);
    }

    ////////////////////////// Encoder Methods //////////////////////////////

    @SuppressWarnings("unchecked")
    private static void encode(String key, Object o, StringBuffer sb, String gap, String indent, Scriptable scope) throws JSONException {
        if (o == null) {
            sb.append("null");
        } else if (o instanceof Undefined) {
            // XXX(SM): in EcmaScript 3.1, when an Undefined is encountered, both the key and the value should be omitted,
            // but we can't currently do this without rewriting the whole thing, so this is the best we can do right now.
            sb.append("null");
        } else if (o instanceof NativeJavaObject) {
            encode(key, ((NativeJavaObject) o).unwrap(), sb, gap, indent, scope);
        } else if (o instanceof List) {
            encodeList(key, (List<Object>) o, sb, gap, indent, scope);
        } else if (o instanceof Map) {
            encodeMap(key, (Map<Object,Object>) o, sb, gap, indent, scope);
        } else if (o instanceof Number) {
            encodeNumber((Number) o, sb);
        } else if (o instanceof Boolean) {
            sb.append(o.toString());
        } else if (o instanceof String) {
            encodeString((String) o, sb);
        } else if (o instanceof NativeArray) {
            encodeArray(key, (NativeArray) o, sb, gap, indent, scope);
        } else if (o instanceof ScriptableObject) {
            ScriptableObject so = (ScriptableObject) o;
            String className = so.getClassName();
            Object toJSON = so.get("toJSON", scope);
            if (toJSON != Scriptable.NOT_FOUND && toJSON instanceof Callable) {
                Context cx = Context.getCurrentContext();
                Object[] args = { key };
                sb.append((String) ((Callable) toJSON).call(cx, scope, scope, args)); 
            } else if ("Date".equals(className)) {  
                encodeDate((Scriptable) o, sb);
            } else if (o instanceof NativeObject) {
                encodeObject(key, (NativeObject) o, sb, gap, indent, scope);
            } else {
                encode(key, so.getDefaultValue(null), sb, gap, indent, scope);
            }
        } else {
            encodeString((String) o.toString(), sb); // XXX: do we ever get here?
        }
    }

    private static void encodeList(String key, List<Object> l, StringBuffer sb, String gap, String indent, Scriptable scope) throws JSONException {
        sb.append('[');
        int size = l.size();
        if (indent != null && size > 0) sb.append("\n");
        String new_gap = (indent != null && l.size() > 0) ? gap + indent : gap;
        for (Iterator<Object> iterator = l.iterator(); iterator.hasNext();) {
            sb.append(new_gap);
            encode(key, iterator.next(), sb, new_gap, indent, scope);
            if (iterator.hasNext()) {
                sb.append(",");
            }
            if (indent != null) sb.append("\n");
        }
        if (indent != null && size > 0) sb.append(gap);
        sb.append(']');
    }

    private static void encodeArray(String key, NativeArray ar, StringBuffer sb, String gap, String indent, Scriptable scope) throws JSONException {
        sb.append('[');
        long size = ar.getLength();
        if (indent != null && size > 0) sb.append("\n");
        String new_gap = (indent != null && size > 0) ? gap + indent : gap;
        for (int i = 0; i < size; i++) {
            sb.append(new_gap);
            encode(key, ar.get(i, ar), sb, new_gap, indent, scope);
            if (i < ar.getLength() - 1) {
                sb.append(",");
            }
            if (indent != null) sb.append("\n");
        }
        if (indent != null && size > 0) sb.append(gap);
        sb.append(']');
    }

    private static void encodeMap(String key, Map<Object,Object> m, StringBuffer sb, String gap, String indent, Scriptable scope) throws JSONException  {
        sb.append('{');
        int size = m.size();
        if (indent != null && size > 0) sb.append("\n");
        String new_gap = (indent != null && m.size() > 0) ? gap + indent : gap;
        for (Iterator<Map.Entry<Object,Object>> iterator = m.entrySet().iterator(); iterator.hasNext();) {
            sb.append(new_gap);
            Map.Entry<Object,Object> entry = iterator.next();
            String local_key = entry.getKey().toString();
            encodeString(local_key, sb);
            if (indent == null) {
                sb.append(':');
            } else {
                sb.append(" : ");
            }
            encode(local_key, entry.getValue(), sb, new_gap, indent, scope);
            if (iterator.hasNext()) {
                sb.append(",");
            }
            if (indent != null) sb.append("\n");
        }
        if (indent != null && size > 0) sb.append(gap);
        sb.append('}');
    }

    private static void encodeObject(String key, NativeObject o, StringBuffer sb, String gap, String indent, Scriptable scope) throws JSONException  {
        sb.append('{');
        Object[] ids = o.getIds();
        if (indent != null && ids.length > 0) sb.append("\n");
        String new_gap = (indent != null && ids.length > 0) ? gap + indent : gap;
        boolean visable = false;
        for (int i = 0; i < ids.length; i++) {

            Object id = ids[i];
            String local_key = ids[i].toString();

            Object value = (id instanceof Number) ? o.get(((Number)id).intValue(), o) : o.get(id.toString(), o);
            if (value instanceof Callable) {
                continue;
            } else if (value == Scriptable.NOT_FOUND) {
                continue;
            } else if (value == Context.getUndefinedValue()) {
                continue;
            }

            if (visable) {
                sb.append(",");
                if (indent != null) sb.append("\n");
            }
            sb.append(new_gap);

            visable = true;

            encodeString(local_key, sb);
            if (indent == null) {
                sb.append(':');
            } else {
                sb.append(" : ");
            }

            encode(local_key, value, sb, new_gap, indent, scope);
        }
        if (indent != null && ids.length > 0) {
            sb.append("\n");
            sb.append(gap);
        }
        sb.append('}');
    }

    private static void encodeString(String s, StringBuffer sb) throws JSONException  {
        sb.append('"');
        for(int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch(c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default: sb.append(c);
            }
        }
        sb.append('"');
    }
    
    private static void encodeDate(Scriptable s, StringBuffer sb) throws JSONException  {
        sb.append('"');
        sb.append(getDateFragment(s,"getUTCFullYear"));
        sb.append('-');
        pad(getDateFragment(s,"getUTCMonth") + 1,sb);
        sb.append('-');
        pad(getDateFragment(s,"getUTCDate"),sb);
        sb.append('T');
        pad(getDateFragment(s,"getUTCHours"),sb);
        sb.append(':');
        pad(getDateFragment(s,"getUTCMinutes"),sb);
        sb.append(':');
        pad(getDateFragment(s,"getUTCSeconds"),sb);
        sb.append('Z');
        sb.append('"');
    }
    
    private static void encodeNumber(Number n, StringBuffer sb) {
        double d = n.doubleValue();
        long l = n.longValue();
        if (d - l > 1e-8 || l - d > 1e-8) {
            sb.append(n.toString());
        } else {
            sb.append(Long.toString(l));
        }
    }

    private static int getDateFragment(Scriptable s, String fragment) {
        int out = 0;
        Object v = ScriptableObject.getProperty(s, fragment);
        if (v instanceof Function) {
            Function fun = (Function) v;
            Context cx = Context.enter();
            v = fun.call(cx, fun.getParentScope(), s, ScriptRuntime.emptyArgs);
            if (v != null) {
                if (v instanceof Double) {
                    out = (int) ((Double) v).doubleValue();
                }
            }
        }
        return out;
    }
    
    private static void pad(int value, StringBuffer sb) {
        if (value < 10) sb.append('0');
        sb.append(value);
    }
    
    ////////////////////////// Decoder Methods //////////////////////////////

    private static Object decodeReader(Input in, Scriptable scope, Boolean want_java) throws JSONException {
        consumeWhitespace(in);
        int i = in.peek();
        TokenType type = getTokenType((char)i);
        if (type == null) throw new JSONException(in.generateError("invalid value"));
        switch (type) {
            case array: return decodeArray(in, scope, want_java);
            case object: return decodeObject(in, scope, want_java);
            case stringValue: return decodeString(in);
            case numberValue: return decodeNumber(in);
            case booleanValue: return decodeBoolean(in);
            case nullValue: return decodeNull(in);
            default: throw new JSONException(in.generateError("invalid value"));
        }
    }

    private static Object decodeNull(Input in) throws JSONException {
        int[] ar = new int[4];
        ar[0] = in.read();
        ar[1] = in.read();
        ar[2] = in.read();
        ar[3] = in.read();

        if((ar[0] == 'N' || ar[0] == 'n') &&
           (ar[1] == 'U' || ar[1] == 'u' || ar[1] == 'o' || ar[1] == 'O') &&
           (ar[2] == 'L' || ar[2] == 'l' || ar[2] == 'n' || ar[2] == 'N') &&
           (ar[3] == 'L' || ar[3] == 'l' || ar[3] == 'e' || ar[3] == 'E')) return null;
        else throw new JSONException(in.generateError("invalid null value"));
    }

    private static Boolean decodeBoolean(Input in) throws JSONException {
        int i = in.read();
        switch (i) {
            case 't':
            case 'T':
                if(in.read() == 'r' && in.read() == 'u' && in.read() == 'e') return Boolean.TRUE;
                else break;
            case 'f':
            case 'F':
                if(in.read() == 'a' && in.read() == 'l' && in.read() == 's' && in.read() == 'e') return Boolean.FALSE;
                else break;
        }
        throw new JSONException(in.generateError("invalid boolean value"));
    }

    private static Number decodeNumber(Input in) throws JSONException {

        boolean integer = true;
        boolean inNumber = true;
        boolean sign_set = false;
        boolean in_exponent = false;
        boolean isa_number = true;

        StringBuffer number = new StringBuffer();
        int i;
        while(inNumber) {
            i = in.peek();
            switch(i) {
                case '0':
                    //if ((number.length() == 0) && (in.lookahead() != '.') && (Character.toLowerCase(in.lookahead()) != 'e') && (in.lookahead() != ',') && (in.lookahead() != ' ') && (in.lookahead() != '}') && (in.lookahead() != ']')) throw new IOException(in.generateError("Leading zeros are not allowed"));
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    isa_number = true;
                    number.append((char)i);
                    in.read();
                    break;
                case '+':
                case '-':
                    if(number.length() != 0) integer = false;
                    if(number.length() != 0 && !in_exponent) throw new JSONException(in.generateError("+ and - can only be used following an exponent"));
                    if (in_exponent && sign_set) throw new JSONException(in.generateError("the sign of the exponent has already been set"));
                    sign_set = true;
                    isa_number = false;
                    number.append((char)i);
                    in.read();
                    break;
                case 'e':
                case 'E':
                    in_exponent = true;
                    sign_set = false;
                    number.append((char)i);
                    in.read();
                    break;
                case '.':
                    integer = false;
                    isa_number = false;
                    number.append((char)i);
                    in.read();
                    break;
                default:
                    if (!isa_number) throw new JSONException(in.generateError("numbers must end with an integer"));
                    inNumber = false;
            }
        }
        
        return (integer) ? Long.valueOf(number.toString()) : Double.valueOf(number.toString());
    }

    private static String decodeString(Input in) throws JSONException {
        int start = in.read();
        if(start != '\'' && start != '"') throw new JSONException(in.generateError("invalid string value"));
        boolean inString = true;
        StringBuffer sb = new StringBuffer();
        while(inString) {
            int i = in.read();
            if (i < 0) throw new JSONException(in.generateError("invalid string value"));
            switch(i) {
                case '\\':
                    int esc = in.read();
                    switch(esc) {
                        case '\'':
                            sb.append('\'');
                            break;
                        case '\"':
                            sb.append('\"');
                            break;
                        case '\\':
                            sb.append('\\');
                            break;
                        case '/':
                            sb.append('/');
                            break;
                        case 'b':
                            sb.append('\b');
                            break;
                        case 'f':
                            sb.append('\f');
                            break;
                        case 'n':
                            sb.append('\n');
                            break;
                        case 'r':
                            sb.append('\r');
                            break;
                        case 't':
                            sb.append('\t');
                            break;
                        case 'u':
                            sb.append(getUnicodeChar(in));
                            break;
                        default:
                            throw new JSONException(in.generateError("invalid escape sequence"));
                    }
                    break;
                case '\'':
                case '"':
                    if (i == start) inString = false;
                    else sb.append((char)i);
                    break;
                default: sb.append((char)i);
            }
        }
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
	private static Object decodeObject(Input in, Scriptable scope, Boolean want_java) throws JSONException {
        int start = in.read();
        if(start != '{') throw new JSONException(in.generateError("invalid object"));
        Object jsObject = null;

        if (want_java == false) {
            jsObject = Context.getCurrentContext().newObject(scope);
        } else {
            jsObject = new HashMap<String, Object>();
        }

        // catch empty objects:
        consumeWhitespace(in);
        if(in.peek() == '}') {
            in.read();
            return jsObject;
        }

        boolean inObject = true;
        while(inObject) {
            // get the key:
            consumeWhitespace(in);
            if (in.peek() == '}') {
                in.read();
                break;
            }

            Object keyValue = decodeReader(in, scope, want_java);
            if(!(keyValue instanceof String)) throw new JSONException(in.generateError("key must be string"));
            // get the value:
            consumeWhitespace(in);
            if(in.read() != ':') throw new JSONException(in.generateError("key missing value"));
            if (want_java == false) {
                if (((String)keyValue).matches("^(-)?\\d+$")) {
                    int intKey = new Integer((String)keyValue).intValue();
                    ((Scriptable)jsObject).put(intKey, (Scriptable)jsObject,
                                               decodeReader(in, scope, want_java));
                } else {
                    ((Scriptable)jsObject).put((String)keyValue, (Scriptable)jsObject,
                                               decodeReader(in, scope, want_java));
                }
            } else {
                ((Map<String,Object>) jsObject).put(keyValue.toString(),
                		                            decodeReader(in, scope, want_java));
            }
            // move to the next key or the end of the object:
            consumeWhitespace(in);
            int i = in.read();
            if(i == '}') inObject = false;
            else if(i != ',') throw new JSONException(in.generateError("invalid object"));
        }

        return jsObject;
    }

    private static Object decodeArray(Input in, Scriptable scope, Boolean want_java) throws JSONException {
        int start = in.read();
        if(start != '[') throw new JSONException(in.generateError("invalid array"));

        // catch empty arrays:
        consumeWhitespace(in);
        if(in.peek() == ']') {
            in.read();
            if (want_java == false) {
                return Context.getCurrentContext().newArray(scope, 0);
            } else {
                return new ArrayList<Object>();
            }
        }

        List<Object> objects = new ArrayList<Object>();
        boolean inArray = true;
        while(inArray) {
            // get the value:
            consumeWhitespace(in);
            if (in.peek() == ']') {
                in.read();
                break;
            }
            objects.add(decodeReader(in, scope, want_java));

            // move to the next value or the end of the array:
            consumeWhitespace(in);
            int i = in.read();
            if(i == ']') inArray = false;
            else if(i != ',') throw new JSONException(in.generateError("invalid array"));
        }
        
        if (want_java == false) {
            return Context.getCurrentContext().newArray(scope, objects.toArray(new Object[objects.size()]));
            
        } else {
            return objects;
        }
    }

    private static void consumeWhitespace(Input in) throws JSONException {
        while(Character.isWhitespace(in.peek())) in.read();
    }

    private static char getUnicodeChar(Input in) throws JSONException {
        char[] arc = new char[5];
        arc[0] = '#';
        for(int i = 1; i < 5; i++) {
            int c = in.read();
            if(c < 0) throw new JSONException(in.generateError("invalid unicode"));
            arc[i] = (char) c;
        }
        return (char) Integer.decode(new String(arc)).intValue();
    }

    private static TokenType getTokenType(char c) {
        switch(c) {
            case '[':
                return TokenType.array;
            case '{':
                return TokenType.object;
            case '"':
            case '\'':
                return TokenType.stringValue;
            case '-':
            case '+':
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '.':
                return TokenType.numberValue;
            case 't':
            case 'T':
            case 'f':
            case 'F':
                return TokenType.booleanValue;
            case 'n':
            case 'N':
                return TokenType.nullValue;
            default:
                return null;
        }
    }

    private static class Input {
        private String s;
        private int i = 0;

        private Input(String s) {
            this.s = s;
        }

        public int read() {
            if (i < s.length()) return s.charAt(i++);
            else return -1;
        }

        public int peek() {
            if (i < s.length()) return s.charAt(i);
            else return -1;
        }

//        public int lookahead() {
//            if (i < s.length()) return s.charAt(i+1);
//            else return -1;
//
//        }

        public String generateError(String error) {
            int start = i - 5;
            if(start < 0) start = 0;
            int end = start + 10;
            if(end > s.length()) end = s.length();
            return "JSON.parse: " + error + " [at character " + i + ": ..." + s.substring(start, end) + "... ]";
        }
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("usage: " + JSON.class.getCanonicalName() + " <test file>");
            System.exit(-1);
        }

        ContextFactory _contextFactory = ContextFactory.getGlobal();
        Context _context = _contextFactory.enterContext();
        Scriptable scope = _context.initStandardObjects();

        BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(args[0]), "UTF-8"));
        String line;
        int count = 0;
        int correct = 0;

        while ((line = reader.readLine()) != null) {
            count++;
            String result = JSON.stringify(JSON.parse(line, scope),null,scope);
            boolean passed = line.equals(result);
            if (passed) correct++; 
            System.out.println("[" + passed + "] " + line + "          " + result);
        }
        
        System.exit((count == correct) ? 0 : -1);
    }

}
