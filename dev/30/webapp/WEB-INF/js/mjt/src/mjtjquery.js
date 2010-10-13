/*
 * jQuery mjt glue
 *
 *  example usage: $('#some_id').mjt(my_mjt_lib.my_template(template_args));
 */
;if (typeof jQuery != 'undefined') (function($) {

    if (typeof $ == 'undefined')
        return;

    // set the innerHTML for each selected node to a mjt template result
    $.fn.mjt = function(markup) {
        var html = mjt.flatten_markup(markup);
        return this.each(function(){
            this.innerHTML = html;
        });

    };

})(jQuery);
