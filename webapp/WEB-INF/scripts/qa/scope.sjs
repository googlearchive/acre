var topscope = this.__proto__

// acre is local
acre.foo = "bar";

// but we can modify the top-level one
topscope.acre.bar = "foo";

// and globals can be overridden without much effort
String.prototype.indexOf = function(str) {
    return null;
};

