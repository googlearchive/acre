acre.require('/test/lib').enable(this);

test("script scope", function() {
    // Globals that should be there
    equal(typeof Math,          "object",       "Math should be defined");
    equal(typeof Date,          "function",     "Date should be defined");

    // Globals that shouldn't be there
    equal(typeof Packages,      "undefined",    "Packages shouldn't be defined");
    equal(typeof java,          "undefined",    "java shouldn't be defined");
    equal(typeof netscape,      "undefined",    "netscape shouldn't be defined");

    // Stuff we put there
    equal(typeof acre,          "object",       "acre should be defined");
    equal(typeof console,       "object",       "console should be defined");
    equal(typeof JSON,          "object",       "JSON should be defined");
    equal(typeof syslog,        "function",     "syslog should be defined");
    equal(typeof mjt,           "object",       "mjt should be defined");

    // System stuff that shouldn't leak
    equal(typeof _system_scope, "undefined",    "_system_scope shouldn't be defined");
    equal(typeof _hostenv,      "undefined",    "_hostenv shouldn't be defined");
    equal(typeof _request,      "undefined",    "_request shouldn't be defined");
    equal(typeof _file,         "undefined",    "_file shouldn't be defined");
});

test("required script scope", function() {
    var scope = acre.require("scope.sjs");
    equal(acre.current_script, acre.request.script, "this should be the top-level script");
    notEqual(acre.current_script, scope.acre.current_script, "require should be a different script");
    equal(scope.acre.foo, "bar", "acre object should be modifiable in-scope");
    equal(typeof acre.foo, "undefined", "local acre modifications shouldn't affect global acre");

    // these test for backward-compatibility, rather than what might be considered "correct"
    equal(acre.bar, "foo", "this.__proto__ trick should work.");
    equal("abc".indexOf("b"), null, "For better or worse, scripts can modify globals.");
});

acre.test.report();