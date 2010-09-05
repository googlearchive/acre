//
//  definitions to run mjt inside an acre script.
//

(function () {

var mjt_src = ['util.js', 'markup.js', 'eval.js', 
               'template.js', 'linker.js', 'compile.js',
               'freebase/isodate.js', 'freebase/mqlkey.js', 'freebase/misc.js'];


// define mjt at the request toplevel so it is shared between files.
//  this breaks module boundaries: the clean way to do this would
//  be to put      mjt = acre.require('/_acre/mjt');
//  at the top of every mjt source file, but that's too acre-specific
(function () {
     this.mjt = {};
     this.mjt.freebase = {};
}).call();

// for internal use after the global is removed
var _mjt = mjt;

// load all mjt source files, which will augment the
//  temporary mjt global
for (var i = 0; i < mjt_src.length; i++) {
    var srcfile = mjt_src[i];
    acre._load_system_script('mjt/src/' + srcfile);
}


mjt.acre = {};
mjt.acre.compile_string = function (body, doc_id) {
    var pkg = new _mjt.TemplatePackage();
    var compiler = new _mjt.TemplateCompiler();

    // only recognize acre: as a prefix, ignore "mjt."
    compiler.mjtns_re = /^acre:(.+)$/;

    // XXX should be an absolute freebase: url instead?
    pkg.source = doc_id;

    // if the string starts with <?xml ... ?> or <acre:doc> has an XML content type,
    // treat the template body as an XML document.

    var doc;

    var xmlprefix = /^\s*<\?xml[^>]*\?>\s*/.exec(body);
    if (xmlprefix != null) {
        // we always generate UTF-8, so ignore whatever encoding was specified in the input
        compiler.output_prefix = '<?xml version="1.0" encoding="utf-8" ?>\n';

        doc = acre.xml.parse(body);
    } else if (/^\s*<acre:doc\s+type=\"application\/.*\+xml/.test(body)) {
        // XXX this case will be removed in acre 1.0
        console.warn("DEPRECATED use of XML acre:doc without <?xml?>: you must specify an XML processing instruction if you want to parse a template as XML.");
        doc = acre.xml.parse(body);
    } else {
    	if (!/^\s*<acre:doc/.test(body)) {
    		body = '<acre:block toplevel="1">' + body + '</acre:block>\n';
    	}
    	doc = acre.html.parse(body);
    }

    pkg.compile_document(doc.documentElement, compiler);

    return pkg;
};


})();

