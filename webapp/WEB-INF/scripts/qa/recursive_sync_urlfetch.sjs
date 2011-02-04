var results = acre.urlfetch(acre.request.base_url + acre.request.script.name);

acre.write(JSON.stringify(results,null,2));

