// WILL: Hacked version from http://downloads.sourceforge.net/jsunit/jsunit2.2alpha11.zip
//       I just wanted the assertXXX() functions

var JSUNIT_UNDEFINED_VALUE;
var JSUNIT_VERSION = 2.2;


//WILL:
function _table(label1,value1,label2,value2) {
    var t = '';
    if (label1) { t += label1 +": " + _displayStringForValue(value1); }
    if (label2) { t += label2 +": " + _displayStringForValue(value2); }
    return t;
}

function assertErrorMessage() {
    _validateArguments(2, arguments);
    var code    = nonCommentArg(1, 2, arguments);
    var err_msg = nonCommentArg(2, 2, arguments);
    var msg = 'No error';
    try { eval(code); }
    catch (e) { msg=e.message; }

    _assert(commentArg(2, arguments), err_msg == msg, _table('Expected: ', err_msg, 'Actual: ', msg));
}

/**
+ * A more functional typeof
+ * @param Object o
+ * @return String
+ */
function _trueTypeOf(something) {
    var result = typeof something;
    try {
        switch (result) {
            case 'string':
            case 'boolean':
            case 'number':
            break;
            case 'object':
            case 'function':
            switch (something.constructor)
            {
                case String:
                result = 'String';
                break;
                case Boolean:
                result = 'Boolean';
                break;
                case Number:
                result = 'Number';
                break;
                case Array:
                result = 'Array';
                break;
                case RegExp:
                result = 'RegExp';
                break;
                case Function:
                result = 'Function';
                break;
                default:
                var m = something.constructor.toString().match(/function\s*([^( ]+)\(/);
                if (m)
                result = m[1];
                else
                break;
            }
            break;
        }
    }
    finally {
        result = result.substr(0, 1).toUpperCase() + result.substr(1);
        return result;
    }
}

function _displayStringForValue(aVar) {
    var result = aVar;
    if (!(aVar === null || aVar === JSUNIT_UNDEFINED_VALUE)) {
        result += '(' + _trueTypeOf(aVar) + ')';
    }
    return result;
}

function fail(failureMessage) {
    throw new JsUnitException("Call to fail()", failureMessage);
}

function error(errorMessage) {
    var errorObject = new Object();
    errorObject.description = errorMessage;
    errorObject.stackTrace = getStackTrace();
    throw errorObject;
}

function argumentsIncludeComments(expectedNumberOfNonCommentArgs, args) {
    return args.length == expectedNumberOfNonCommentArgs + 1;
}

function commentArg(expectedNumberOfNonCommentArgs, args) {
    if (argumentsIncludeComments(expectedNumberOfNonCommentArgs, args))
    return args[0];

    return null;
}

function nonCommentArg(desiredNonCommentArgIndex, expectedNumberOfNonCommentArgs, args) {
    return argumentsIncludeComments(expectedNumberOfNonCommentArgs, args) ?
    args[desiredNonCommentArgIndex] :
    args[desiredNonCommentArgIndex - 1];
}

function _validateArguments(expectedNumberOfNonCommentArgs, args) {
    if (!( args.length == expectedNumberOfNonCommentArgs ||
        (args.length == expectedNumberOfNonCommentArgs + 1 && typeof(args[0]) == 'string') )) {
            error('Incorrect arguments passed to assert function');
        }
    }

    function _assert(comment, booleanValue, failureMessage) {
        if (!booleanValue) {
            throw new JsUnitException(comment, failureMessage);
        }
    }

    function assert() {
        _validateArguments(1, arguments);
        var booleanValue = nonCommentArg(1, 1, arguments);

        if (typeof(booleanValue) != 'boolean') {
            error('Bad argument to assert(boolean)');
        }
        _assert(commentArg(1, arguments), booleanValue === true, 'Call to assert(boolean) with false');
    }

    function assertTrue() {
        _validateArguments(1, arguments);
        var booleanValue = nonCommentArg(1, 1, arguments);

        if (typeof(booleanValue) != 'boolean')
        {       error('Bad argument to assertTrue(boolean)');
    }
    _assert(commentArg(1, arguments), booleanValue === true, 'Call to assertTrue(boolean) with false');
}

function assertFalse() {
    _validateArguments(1, arguments);
    var booleanValue = nonCommentArg(1, 1, arguments);

    if (typeof(booleanValue) != 'boolean')
    {       error('Bad argument to assertFalse(boolean)');
}
_assert(commentArg(1, arguments), booleanValue === false, 'Call to assertFalse(boolean) with true');
}

function assertEquals() {
    _validateArguments(2, arguments);
    var var1 = nonCommentArg(1, 2, arguments);
    var var2 = nonCommentArg(2, 2, arguments);
    _assert(commentArg(2, arguments), var1 === var2, _table('Expected',var1,'Actual',var2));
}

function assertNotEquals() {
    _validateArguments(2, arguments);
    var var1 = nonCommentArg(1, 2, arguments);
    var var2 = nonCommentArg(2, 2, arguments);
    _assert(commentArg(2, arguments), var1 !== var2, _table('Expected not to be',var2)); //WILL: TODO: shouldn't it say what it was?
}

function assertNull() {
    _validateArguments(1, arguments);
    var aVar = nonCommentArg(1, 1, arguments);
    _assert(commentArg(1, arguments), aVar === null, _table('Expected',null,'Actual',aVar));
}

function assertNotNull() {
    _validateArguments(1, arguments);
    var aVar = nonCommentArg(1, 1, arguments);
    _assert(commentArg(1, arguments), aVar !== null, _table('Expected not to be',null));
}

function assertUndefined() {
    _validateArguments(1, arguments);
    var aVar = nonCommentArg(1, 1, arguments);
    _assert(commentArg(1, arguments), aVar === JSUNIT_UNDEFINED_VALUE, _table('Expected',JSUNIT_UNDEFINED_VALUE,'Actual',aVar));
}

function assertNotUndefined() {
    _validateArguments(1, arguments);
    var aVar = nonCommentArg(1, 1, arguments);
    _assert(commentArg(1, arguments), aVar !== JSUNIT_UNDEFINED_VALUE, _table('Expected not to be',JSUNIT_UNDEFINED_VALUE));
}

function assertNaN() {
    _validateArguments(1, arguments);
    var aVar = nonCommentArg(1, 1, arguments);
    _assert(commentArg(1, arguments), isNaN(aVar), 'Expected NaN');
}

function assertNotNaN() {
    _validateArguments(1, arguments);
    var aVar = nonCommentArg(1, 1, arguments);
    _assert(commentArg(1, arguments), !isNaN(aVar), 'Expected not NaN');
}

function assertObjectEquals() {
    _validateArguments(2, arguments);
    var var1 = nonCommentArg(1, 2, arguments);
    var var2 = nonCommentArg(2, 2, arguments);
    var type;
    var msg = commentArg(2, arguments)?commentArg(2, arguments):'';
    var isSame = (var1 === var2);
    //shortpath for references to same object
    var isEqual = ( (type = _trueTypeOf(var1)) == _trueTypeOf(var2) );
    if (isEqual && !isSame) {
        switch (type) {
            case 'String':
            case 'Number':
            isEqual = (var1 == var2);
            break;
            case 'Boolean':
            case 'Date':
            isEqual = (var1 === var2);
            break;
            case 'RegExp':
            case 'Function':
            isEqual = (var1.toString() === var2.toString());
            break;
            default: //Object | Array
            var i;
            if (isEqual = (var1.length === var2.length))
            for (i in var1)
            assertObjectEquals(msg + ' found nested ' + type + '@' + i + '\n', var1[i], var2[i]);
        }
        _assert(msg, isEqual, _table('Expected',var1,'Actual',var2));
    }
}

assertArrayEquals = assertObjectEquals;

function assertEvaluatesToTrue() {
    _validateArguments(1, arguments);
    var value = nonCommentArg(1, 1, arguments);
    if (!value)
    fail(commentArg(1, arguments));
}

function assertEvaluatesToFalse() {
    _validateArguments(1, arguments);
    var value = nonCommentArg(1, 1, arguments);
    if (value)
    fail(commentArg(1, arguments));
}

// WILL: TODO: document support?

function assertHTMLEquals() {
    _validateArguments(2, arguments);
    var var1 = nonCommentArg(1, 2, arguments);
    var var2 = nonCommentArg(2, 2, arguments);
    var var1Standardized = standardizeHTML(var1);
    var var2Standardized = standardizeHTML(var2);

    _assert(commentArg(2, arguments), var1Standardized === var2Standardized, _table('Expected',var1Standardized,'Actual',var2Standardized));
}

function assertHashEquals() {
    _validateArguments(2, arguments);
    var var1 = nonCommentArg(1, 2, arguments);
    var var2 = nonCommentArg(2, 2, arguments);
    for (var key in var1) {
        assertNotUndefined("Expected hash had key " + key + " that was not found", var2[key]);
        assertEquals(
            "Value for key " + key + " mismatch - expected = " + var1[key] + ", actual = " + var2[key],
            var1[key], var2[key]
        );
    }
    for (var key in var2) {
        assertNotUndefined("Actual hash had key " + key + " that was not expected", var1[key]);
    }
}

function assertRoughlyEquals() {
    _validateArguments(3, arguments);
    var expected = nonCommentArg(1, 3, arguments);
    var actual = nonCommentArg(2, 3, arguments);
    var tolerance = nonCommentArg(3, 3, arguments);
    assertTrue(
        "Expected " + expected + ", but got " + actual + " which was more than " + tolerance + " away",
        Math.abs(expected - actual) < tolerance
    );
}

function assertContains() {
    _validateArguments(2, arguments);
    var contained = nonCommentArg(1, 2, arguments);
    var container = nonCommentArg(2, 2, arguments);
    assertTrue(
        "Expected '" + container + "' to contain '" + contained + "'",
        container.indexOf(contained) != -1
    );
}


// WILL: TODO: is document supported by acre??

function standardizeHTML(html) {
    var translator = document.createElement("DIV");
    translator.innerHTML = html;
    return translator.innerHTML;
}

//WILL: TODO: remove stacktrace stuff?

function getFunctionName(aFunction) {
    var regexpResult = aFunction.toString().match(/function(\s*)(\w*)/);
    if (regexpResult && regexpResult.length >= 2 && regexpResult[2]) {
        return regexpResult[2];
    }
    return 'anonymous';
}

function getStackTrace() {
    var result = '';

    if (typeof(arguments.caller) != 'undefined') { // IE, not ECMA
        for (var a = arguments.caller; a != null; a = a.caller) {
            result += '> ' + getFunctionName(a.callee) + '\n';
            if (a.caller == a) {
                result += '*';
                break;
            }
        }
    }
    else { // Mozilla, not ECMA
        // fake an exception so we can get Mozilla's error stack
        var testExcp;
        try
        {
            foo.bar;
        }
        catch(testExcp)
        {
            var stack = parseErrorStack(testExcp);
            for (var i = 1; i < stack.length; i++)
            {
                result += '> ' + stack[i] + '\n';
            }
        }
    }

    return result;
}

function parseErrorStack(excp) {
    var stack = [];
    var name;

    if (!excp || !excp.stack) {
        return stack;
    }

    var stacklist = excp.stack.split('\n');
    for (var i = 0; i < stacklist.length - 1; i++) {
        var framedata = stacklist[i];
        name = framedata.match(/^(\w*)/)[1];
        if (!name) {
            name = 'anonymous';
        }
        stack[stack.length] = name;
    }
    // remove top level anonymous functions to match IE

    while (stack.length && stack[stack.length - 1] == 'anonymous') {
        stack.length = stack.length - 1;
    }
    return stack;
}

function JsUnitException(comment, message) {
    this.isJsUnitException = true;
    this.comment = comment;
    this.jsUnitMessage = message;
    this.stackTrace = getStackTrace();
}

function trim(str) {
    if (str == null)
    return null;

    var startingIndex = 0;
    var endingIndex = str.length - 1;

    while (str.substring(startingIndex, startingIndex + 1) == ' ')
    startingIndex++;

    while (str.substring(endingIndex, endingIndex + 1) == ' ')
    endingIndex--;

    if (endingIndex < startingIndex)
    return '';

    return str.substring(startingIndex, endingIndex + 1);
}

function isBlank(str) {
    return trim(str) == '';
}



