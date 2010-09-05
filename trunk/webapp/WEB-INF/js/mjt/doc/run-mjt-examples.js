
//
//  this is incomplete code to replace mkdemo.py.
//  it loads jquery and mjt and turns the examples
//  into two-pane demonstrations.
//


(function () {
    // when we have a document, rewrite it
    function onload() {
        var example_index = 0;
        $('pre.literal-block').each(function (i, pretag) {
            if ($(pretag).hasClass('nomjt'))
                return;

            // unquote the original source
            var mjtsrc = pretag.innerHTML
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&amp;/g, '&');


            if ($(pretag).hasClass('js')) {
                eval(mjtsrc);
                return;
            }

            var output_id = 'gen_' + example_index;
            var html = '<table id="' + output_id + '"class="example"><tr>'
                     + '<td class="example_in"></td>'
                     + '<td class="example_out">'
                     + '<span id="run-' + output_id + '"></span>'
                     + '</td></tr></table>';
            $(pretag).replaceWith(html);

            // insert the original source <pre>
            $('#'+output_id + ' td.example_in').append(pretag);

            $('#run-'+output_id).each(function (j, txt) {
                txt.innerHTML = mjtsrc;
            });

            // run the output
            mjt.run('run-'+output_id);

            example_index += 1
        });
    }
    $(onload);
})();
