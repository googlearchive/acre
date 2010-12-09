function script_under_test() {
    return acre.request.base_url + acre.request.script.name.replace("test_","");
}