var results = {};

var url = acre.request.base_url + acre.request.script.name;

acre.async.urlfetch(url, {
    'callback' : function (res) {
        results = res;
    }
});

acre.async.wait_on_results();

acre.write(JSON.stringify(results,null,2));

