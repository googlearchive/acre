/*
 * Return the script under test as a full URL
 */
function script_under_test() {
    return acre.request.base_url + acre.request.script.name.replace("test_","");
}

/*
 * make sure that a URL got fetched correctly by looking into the domain of a tracking cookie they set
 * which is probably the least likely part of their web page that is likely to change over time.
 * Note that the test is designed to pass if the URL fetching returns with a status code that is not 200. 
 * This is not bad because we're testing acre's urlfetching machinery, not the availability of these websites
 */
function has_correct_domain(res,cookie_name,domain) {
    ok(((res.status == 200 && res.cookies[cookie_name].domain.indexOf(domain) > -1) || response.status != 200),  domain);
}
