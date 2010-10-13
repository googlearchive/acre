acre.require('/test/lib').enable(this);


acre.test.engine("acre.freebase.mqlread tests", 'freebase');

test("basic mqlread", {
        'args':{'args':JSON.stringify([{
                    'id':'/user/xtine',
                    'type':[],
                    '*':[{}]
                    }]),
                'service':'mqlread'
                }
        },
     function () {
         var res = acre.test.urlfetch();
         var json_res = JSON.parse(res.body);
         acre.test.api_results(json_res);
         ok(json_res.result.result.id == '/user/xtine',
            'result has expected id: /user/xtine');
         same(json_res.result.result.type,
              ['/type/user', '/type/namespace', '/freebase/user_profile'],
              'result includes expected types');
     });

test("medium sized result set mqlread", {
         'args':{
             'service':'mqlread',
             'args':
             JSON.stringify(
                 [
                     [{"id":null,
                      'name':null,
                      'type':'/film/film',
                      '*':[]
                     }],
                     {'cursor':true}
                 ])
                }
     }, function () {
         var res = acre.test.urlfetch();
         var json_res = JSON.parse(res.body);
         acre.test.api_results(json_res);
         ok(json_res.result.result.length == 100, "mqlread has 100 results");
     });

test("mqlread without arguments", {
         'args':{
             'service':'mqlread'
             }
         }, function () {
             var res = acre.test.urlfetch();
             var json_res = JSON.parse(res.body);
             acre.test.exception(json_res, 'Error', /You must provide a query/);
         });

acre.test.report();