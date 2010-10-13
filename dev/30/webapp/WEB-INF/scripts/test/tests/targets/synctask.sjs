//
//  test target that tries a synchronous acre.freebase.MqlRead
//
//  this is for backwards compatibility.
//

var query = {id:'/en/butterfly', name:null};
var task = acre.freebase.MqlRead(query);

acre.write(JSON.stringify(task.result));
