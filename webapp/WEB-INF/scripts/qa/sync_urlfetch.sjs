var results = {};
results.google = acre.urlfetch("http://www.google.com/");
results.youtube = acre.urlfetch("http://www.youtube.com/");
acre.write(JSON.stringify(results,null,2));