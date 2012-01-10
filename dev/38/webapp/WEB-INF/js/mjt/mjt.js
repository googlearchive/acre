/*
 *  mjt.js - a metaweb javascript template engine
 *
 */

(function () {
    var thisjs = 'mjt(.loader)?.js';
    var scripts = [
        'header.js',
        'json2.js',
        'util.js',
        'task.js',
        'pager.js',
        'browserio.js',
        'crc32.js',
        'jsonp.js',
        'xhr.js',
        'freebase/api.js',
        'freebase/isodate.js',
        'freebase/misc.js',
        'freebase/mqlkey.js',
        'freebase/freebasexhr.js',
        'markup.js',
        'eval.js',
        'template.js',
        'linker.js',
        'runtime.js',
        'compile.js',
        'pageapp.js',
        'mjtjquery.js',
        'label-packages.js?mjt,mjt.freebase',
    ];


    // try to guess the url of this js file.
    var app_url = null;
    var nodes = document.getElementsByTagName('script');
    for (var i = 0; i < nodes.length; i++) {
        var script = nodes[i];
        var src = script.src || '';
        var m = new RegExp('^(.+)/' + thisjs + '$').exec(src);
        if (m) {
            app_url = m[1];
            break;
        }
    }

    if (!app_url) {
        alert("can't locate mjt src.");
        return;
    }


    // XXX it seems like this document.write() trick only works
    //  once in each html page under FF2.  subsequent script
    //  tags aren't able to find themselves using
    //  document.getElementsByTagName('script')?
    for (i = 0; i < scripts.length; i++) {
        var src = app_url + '/src/' + scripts[i];
        document.write('<script type="text/javascript" src="' + src + '"></script>\n');
    }
})();
