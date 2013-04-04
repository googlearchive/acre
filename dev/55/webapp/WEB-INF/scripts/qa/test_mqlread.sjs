acre.require('/test/lib').enable(this);

test('acre.freebase.mqlread basic',function() {
  q = {
  "id" : "/en/sting",
  "name": null
  };
  this.file = 'mqlread?q=' + encodeURI(JSON.stringify(q));
  var result = JSON.parse(acre.test.urlfetch().body).result
  equal(result.name, 'Sting');
});

test('acre.freebase.mqlread long',function() {
  q = [{ "id": null , "type":"/type/type", "*":[] }];
  this.file = 'mqlread?q=' + encodeURI(JSON.stringify(q));
  var result = JSON.parse(acre.test.urlfetch().body).result
  i = 0;
  for (o in result) {
    i++;
  }
  equal(i, 100);
});

test('acre.freebase.mqlread long2',function() {
  q = [{ "id": null, "type":"/music/album", "name~=":"Greatest Hits", "name":null, "artist":null}];
  this.file = 'mqlread?q=' + encodeURI(JSON.stringify(q));
  var result = JSON.parse(acre.test.urlfetch().body).result
  i = 0;
  for (o in result) {
    i++;
  }
  equal(i, 100);
});

test('acre.freebase.mqlread multiple queries error',function() {
  q = [{ "id": "/user/acretestbot", "type":[]},{"id":"/user/nix", "type":[]}];
  this.file = 'mqlread?q=' + encodeURI(JSON.stringify(q));
  var result = acre.test.urlfetch()
  var pat = new RegExp('.+Expected a dictionary or a list.+');
  ok(pat.test(result.body), 'error matches pattern');
});

test('acre.freebase.mqlread cursor',function() {
  // NOTE: "cursor":"" will not work against the old freebase api
  q = [{ "id" : null, "limit" : 5, "type" : "/type/type" }];
  this.file = encodeURI('mqlread?envelope={"cursor":""}&q=' + JSON.stringify(q));
  var response = JSON.parse(acre.test.urlfetch().body)
  i = 0;
  for (o in response.result) {
    i++;
  }
  equal(i, 5);
  var pat = new RegExp('[0-9A-Za-z\-\=]+');
  first_cursor = response.cursor;
  ok(pat.test(first_cursor), 'cursor matches pattern');
  this.file = encodeURI('mqlread?envelope={"cursor":"' + response.cursor + '"}&q=' + JSON.stringify(q));
  var response = JSON.parse(acre.test.urlfetch().body)
  ok(pat.test(response.cursor), 'cursor matches pattern');
  ok(first_cursor != response.cursor, '2nd cursor should not match first');
});

test('acre.freebase.mqlread cursor using true',function() {
  q = [{ "id" : null, "limit" : 5, "type" : "/type/type" }];
  this.file = encodeURI('mqlread?envelope={"cursor":true}&q=' + JSON.stringify(q));
  var response = JSON.parse(acre.test.urlfetch().body)
  i = 0;
  for (o in response.result) {
    i++;
  }
  equal(i, 5);
  var pat = new RegExp('[0-9A-Za-z\-\=]+');
  first_cursor = response.cursor;
  ok(pat.test(first_cursor), 'cursor matches pattern');
  this.file = encodeURI('mqlread?envelope={"cursor":"' + response.cursor + '"}&q=' + JSON.stringify(q));
  var response = JSON.parse(acre.test.urlfetch().body)
  ok(pat.test(response.cursor), 'cursor matches pattern');
  ok(first_cursor != response.cursor, '2nd cursor should not match first');
});

test('acre.freebase.mqlread as_of_time',function() {
  q = {
  "id":"/en/michele_bachmann",
  "/film/person_or_entity_appearing_in_film/films": [{}]
  };
  this.file = encodeURI('mqlread?q=' + JSON.stringify(q) + '&envelope={"as_of_time":"2009"}');
  var result = JSON.parse(acre.test.urlfetch().body).result
  equal(result['/film/person_or_entity_appearing_in_film/films'][0], undefined);
});

test('acre.freebase.mqlread lang',function() {
  q = { "id" : "/topic/en/anarchism", "name" : null, "type" : "/common/topic" };
  this.file = encodeURI('mqlread?envelope={"lang":"/lang/de"}&q=' + JSON.stringify(q));
  var response = JSON.parse(acre.test.urlfetch().body)
  equal(response.result.name, 'Anarchismus');
 
});

test('acre.freebase.mqlread property error',function() {
  q = { "id":null, "type":"/type/type", "property_does_not_exist":"foo" };
  this.file = 'mqlread?q=' + encodeURI(JSON.stringify(q));
  var result = acre.test.urlfetch()
  var pat = new RegExp('.+does not have property property_does_not_exist');
  ok(pat.test(result.body), 'error matches pattern');
});



acre.test.report();
