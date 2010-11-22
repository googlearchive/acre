//WILL: TODO: inegrate changes from http://github.com/willmoffat/JsObjDump
var JSON_JS = (function() {

  var seen;
  var line_count;
  var DEFAULT_SKIP = [];

  var MAX_COUNT, MAX_LINE_COUNT, MAX_DEPTH, FUNCTION_SOURCE, SKIP;
  var response_line_count=0;
  
  function set_prefs() {
    var o = console.options ? console.options : {};
    MAX_COUNT       = o.MAX_COUNT       || 10000;        // max number of lines per _acre response_
    MAX_LINE_COUNT  = o.MAX_LINE_COUNT  || 3000;         // bail if we generate more lines than this
    MAX_DEPTH       = o.MAX_DEPTH       || 12;           // bail if we go deeper than x levels
    FUNCTION_SOURCE = o.FUNCTION_SOURCE || false;        // show full source code of functions
    SKIP            = o.SKIP            || DEFAULT_SKIP; // list of objects to ignore (defaults set by acreboot.js)
  }
    
  var toString = Object.prototype.toString;
  function isArray( obj ) {
    return toString.call(obj) === "[object Array]";
  }

  function get_function_sig(value) {
    var code = value.toString();
    if (FUNCTION_SOURCE) {
      return code;
    } else {
      var r = /function\s+(.+?)\s*\{/.exec(code); /*} - needed for textmate format bug */
      if (!r || !r.length) { return "ERROR: invalid function "+code; }
      return r[1];
    }
  }

  function annotate(obj,depth) {
    var typ, // object's type
    isPrim,  // is it a boolean, number, string, undefined, null
    newobj;  // a copy of obj

    response_line_count++;
    line_count++;
    if (line_count>MAX_LINE_COUNT || response_line_count>MAX_COUNT) { return '~~TOO_MANY_LINES~~'; }

    typ = typeof obj;
    if (typ==='object') {
      // JS spec bugs
      if (!obj) { typ = 'null'; }
      else if (isArray(obj)) { typ = 'array'; } // WILL: this will stop full dump on a = new Array(11,22,33); a.will=true;
    }
    isPrim = (typ!=='object' && typ!=='function' && typ!=='array');
    if (isPrim) {
      if (typ==='undefined') { return '~~UNDEFINED~~'; }
      else {                  return obj; }
    }

    // should we ignore this object?
    if (depth>1 && SKIP.indexOf(obj)!==-1 ) {
      return '~~SKIPPED~~';
    }

    // have we already seen this object?
    var id = seen.indexOf(obj);
    if (id !== -1) {
      // yes, then link to it
      return '~~LINK:'+id+'~~';
    } else {
      // no, give it a new id
      id = seen.length;
      seen[id]=obj;
    }

    if (depth>MAX_DEPTH) { return '~~TOO_DEEP~~'; }

    if (typ==='array') {
      newobj = [];
      for (var i=0,len=obj.length;i<len;i++) {
        newobj[i] = annotate(obj[i], depth+1);
      }
      newobj.unshift( '~~ID:'+id+'~~' );
    } else {
      //object or function
      newobj={ '~~ID~~': id };
      if (typ==='function') { newobj['~~FUNC~~'] = get_function_sig(obj); }
      //WILL: what would be useuful to display? if (obj.constructor) { newobj['~~CONS~~']=obj.constructor+''; }
      //      if (obj.__proto__ && obj.__proto__!==Object.prototype) { newobj['~~PROTO~~'] = annotate(obj.__proto__); }
      for (var key in obj) {
        if (key==='prototype') { continue; }
        var inherited = Object.hasOwnProperty.call(obj, key) ? '' : '~~INHERTIED~~';
        newobj[inherited+key] = annotate(obj[key], depth+1);
      }
    }
    return newobj;
  }

  function annotate_list () { /*arguments*/
    set_prefs();
    var onetime_hide = !('hide_deprecated' in console);
    if (onetime_hide) { console.hide_deprecated = true; }
    var annotated = []; // copy of arguments, annotated with links to cycles, functions, undefined
    seen = [];          // list of objects anywhere in the hierarchy of all the args

    for (var i=0;i<arguments.length;i++) {
      line_count = 0;  // number of properties to show per object
      annotated[i] = annotate( arguments[i] , 1 );
    }
    if (onetime_hide) { delete console.hide_deprecated; }
    return annotated;
  }
  return {annotate_list:annotate_list, DEFAULT_SKIP:DEFAULT_SKIP}; // JSON_JS
}
)
();


/**
* The function that does the work of setting the headers and formatting
*/
function log(level, args) {
  try {
    // use our super-duper stringify func for the arguments
    args = JSON_JS.annotate_list.apply(JSON_JS,args);
    this.userlog(level, args);
  } catch (e) {
    this.userlog('ERROR', ['Internal Console Error - please report on IRC',''+e]);
  }

  return ''; // for ACRE template compatibility
}

function skip(obj) {
  JSON_JS.DEFAULT_SKIP.push(obj);
}

function augment_topscope(_topscope) {
  _topscope.console = {
    log   : function() { return log('INFO',  arguments, 'console'); },
    debug : function() { return log('LOG',   arguments, 'console'); }, // log is debug in FirePHP speak
    info  : function() { return log('INFO',  arguments, 'console'); },
    warn  : function() { return log('WARN',  arguments, 'console'); },
    error : function() { return log('ERROR', arguments, 'console'); },
    enabled : true // this will be turned off in production if the user logging is turned off
  };
}

function augment_acre(acre) {
  acre.log       = function() { return log('INFO',  arguments); };
  acre.log.debug = function() { return log('LOG',   arguments); };
  acre.log.info  = function() { return log('INFO',  arguments); };
  acre.log.warn  = function() { return log('WARN',  arguments); };
  acre.log.error = function() { return log('ERROR', arguments); };
}




