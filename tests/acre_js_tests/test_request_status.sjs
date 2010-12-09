acre.require('/test/lib').enable(this);

test('Test acre.response.status',function() {
    var stati = [ 200, 300, 400, 500 ];
    for each (var status in stati) {
        this.args = { 'status' : status };
        equal(status, acre.test.urlfetch().status);
    }
});

acre.test.report();
