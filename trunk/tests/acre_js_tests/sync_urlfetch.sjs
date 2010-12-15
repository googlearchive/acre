var results = {};
results.google    = acre.urlfetch("http://www.google.com/");
results.youtube   = acre.urlfetch("http://www.youtube.com/");
results.freebase  = acre.urlfetch("http://www.freebase.com/");
acre.write(JSON.stringify(results,null,2));