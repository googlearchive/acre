acre.require('/test/lib').enable(this);

test('acre.response.status',function() {
    var stati = [ 200, 300, 400, 500 ];
    stati.forEach(function(status){
        this.args = { 'status' : status };
        equal(status, acre.test.urlfetch().status);
    });
});

acre.test.report();
