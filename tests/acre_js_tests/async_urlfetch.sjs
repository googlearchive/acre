var results = {};

acre.async.urlfetch("http://www.google.com/", {
    'callback' : function (res) {
        results.google = res;
    }
});

acre.async.urlfetch("http://www.youtube.com/", {
    'callback' : function (res) {
        results.youtube = res;
    }
});

acre.async.urlfetch("http://www.freebase.com/", {
    'callback' : function (res) {
        results.freebase = res;
    }
});
  
acre.async.wait_on_results();

acre.write(JSON.stringify(results,null,2));
