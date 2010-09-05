acre.require('/test/lib').enable(this);

// tag tests as using mqlwrite (note tags are ignored for now)
module("mqlwrite",{mqlwrite:true});

test("try a mqlwrite",function() {
  var r = acre.freebase.mqlwrite({id:null,create:'unconditional'});
  deepEqual(r,
    {
      code: "/api/status/ok",
      result: {
        create: "created"
      }
    },
    {skip:true}, 'mqlwrite succeeded');
});
   
acre.test.report();
