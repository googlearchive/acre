// http://tests.test.dev.acre.z/test_require

acre.require('/test/lib').enable(this);

test("Test basic require", {'args':{
                                'path':'/user/alexbl/scratch/json_path',
                                'match':JSON.stringify(['get', 'set'])
                            },
                            "app_path":"//engines.tests.test.dev"
                            },
     function () {
         var uf = acre.test.urlfetch();
         var res = JSON.parse(uf.body);
         ok(res.code=='/api/status/ok', "Library successfully required");
         same(JSON.parse(this.args.match), res.result.matches,
            "Correct members found in result of require");

     });

test("Test relative pathes in require", {'args':{
                                             'path':'../lib'
                                         },
                                         "app_path":"//engines.tests.test.dev"
                                        },
     function () {
         var uf = acre.test.urlfetch();
         var res = JSON.parse(uf.body);
         ok(res.code=='/api/status/error', 'Relative pathes in require are not allowed');
         acre.test.exception(res, 'Error', /Could not fetch data from \.\.\/lib/);


     });

acre.test.report();
