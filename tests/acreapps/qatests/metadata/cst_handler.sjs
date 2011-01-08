var handler = function() {
    return {
        'to_js': function(script) {
            return "var module = ("+JSON.stringify(script.get_content())+");";
        },
        'to_module': function(compiled_js, script) {
            var module = compiled_js.module;
            module.body = "success";
            return module;
        },
        'to_http_response': function(module, script) {
            return module;
        }
    };
};