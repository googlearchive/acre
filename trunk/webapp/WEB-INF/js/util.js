var exports = {
    escape_re: escape_re,
    parseUri: parseUri,
    extend: extend,
    each: each,
    isArray: isArray
};


function escape_re(s) {
  var specials = /[.*+?|()\[\]{}\\]/g;
  return s.replace(specials, '\\$&');
}


/*
 * adapted from parseUri 1.2.1
 * http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
 */
function parseUri(str) {
    var o = {
        key: ["source","protocol","authority","userInfo","user","password","host",
              "port","relative","path","directory","file","query","anchor"],
        parser: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
    };
    var m = o.parser.exec(str);
    var uri = {};
    var i = 14;
    while (i--) uri[o.key[i]] = m[i] || "";
    return uri;
}


/* 
 * adaptation of some of the jQuery utils
 * http://jquery.com
 */
var hasOwn = Object.prototype.hasOwnProperty,
    class2type = {};

"Boolean Number String Function Array Date RegExp Object".split(" ").forEach(function(name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function type(o) {
    return o == null ? String(o) : class2type[toString.call(o)] || "object";
};

function isFunction(o) {
    return type(o) === "function";
}

function isArray(o) {
    return type(o) === "array";
}

function isPlainObject(o) {
    if (!o || type(o) !== "object") return false;
    var key;
    for (key in o) {}
    return key === undefined || hasOwn.call(o, key);
};

function extend() {
    var options, name, src, copy, copyIsArray, clone,
        class2type = {},
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    if (typeof target === "boolean") {
        deep = target;
        target = arguments[1] || {};
        i = 2;
    }

    if (typeof target !== "object" && !isFunction(target)) {
        target = {};
    }
    var ar = false;
    for ( ; i < length; i++ ) {
        if ( (options = arguments[i]) != null ) {
            for (name in options) {
                src = target[name];
                copy = options[name];
                if (target === copy) continue;
                if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && isArray(src) ? src : [];
                    } else {
                        clone = src && isPlainObject(src) ? src : {};
                    }
                    target[name] = extend(deep, clone, copy);
                } else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }

    return target;
};

function each(object, callback) {
    var name, i = 0,
    length = object.length,
    isObj = length === undefined || isFunction(object);

    if (isObj) {
        for (name in object) {
            if (callback.call(object[name], name, object[name]) === false) {
                break;
            }
        }
    } else {
        for (var value = object[0];
            i < length && callback.call(value, i, value) !== false; 
            value = object[++i]) {}
    }

    return object;
}