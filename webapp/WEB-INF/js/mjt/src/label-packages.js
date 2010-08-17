
/**
 * Label a specified package. This script is necessary because on some
 * browsers, such as IE7, writing into the document
 *   <script>mjt.label_package('...');</script>
 * does not work, as that script code is executed before mjt gets loaded.
 * Here, we're extracting that code out into a file in the same domain
 * as the rest of the mjt code so that it will get executed in order,
 * after mjt has loaded.
 */
(function(mjt) {
    var nodes = document.getElementsByTagName('script');
    for (var i = 0; i < nodes.length; i++) {
        var script = nodes[i];
        var src = script.src || '';

        var m = /label-packages\.js\?(.+)$/.exec(src);
        if (m === null)
            continue;
        var pkgnames = m[1].split(',');
        for (var pi = 0; pi < pkgnames.length; pi++) {
            mjt.label_package(pkgnames[pi]);
        }
    }
})(mjt);
