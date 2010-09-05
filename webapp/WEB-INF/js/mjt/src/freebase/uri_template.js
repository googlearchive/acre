
// not used?

URITemplate = function (s) {
    this.template = s;
    // build this.params here
};

URITemplate.prototype.run = function (args) {
    var uri = this.template.replace(/\{[0-9a-zA-Z_]+\}/, function (m) {
        var key = m.substring(1, m.length-1);
        mjt.log('M', m, key, args[key]);
        return args[key];
    });

    // XXX for testing, compare this to args array
    this.parse(uri)

    return uri;
};

URITemplate.prototype.parse = function (uri) {
    // quote all special chars except {} against regexp interpretation
    // then substitute (.+) for the vars
    // build a list of vars at the same time, with somewhat unclean
    //  use of a side-effect inside string.replace.  use this.params instead.
    var args = [];
    var rx = this.template.replace(/[^{}0-9a-zA-Z_]/, '\\\1')
                          .replace(/\{[0-9a-zA-Z_]+\}/, function (kv) {
                              args.push(kv.substring(1, kv.length-1));
                              return '(.+)';
                          });
    var m = (new RegExp('^' + rx + '$')).exec(uri);
    if (!m)
        return null;

    // convert to dict
    var d = {};
    for (var i = 0; i < args.length; i++) {
        d[args[i]] = m[i+1];
    }

    mjt.log('PARSED', d, uri);

    return d;
};
