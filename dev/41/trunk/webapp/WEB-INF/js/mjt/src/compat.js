
// backwards compatibility for old mjt routines

(function(mjt){

/**
 *  convert a Javascript value to a JSON string.
 *  the value must not contain cyclic references.
 * 
 *  in mjt 0.9 this will be deprecated in favor of JSON.stringify() 
 * 
 */
mjt.json_from_js = JSON.stringify;

/**
 *  convert a JSON string to a Javascript object/array tree.
 *  throws a SyntaxError exception on errors.
 *
 *  in mjt 0.9 this will be deprecated in favor of JSON.parse() 
 */
mjt.json_to_js = JSON.parse;


/**
 *
 * compile an iframe element and return the namespace.
 * the iframe
 * 
 * DEPRECATED - use mjt.load_from_iframe() instead
 */
mjt.load = function (top) {
    var pkg = mjt.load_from_iframe(top);

    //mjt.log('mjt.load compiled', pkg);
    return pkg.tcall.exports;
};

})(mjt);
