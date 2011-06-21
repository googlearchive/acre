
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.tasks = {
           "add" : add
        };

    };
    
    function add(obj) {
        if (obj instanceof Array) {
            for each (var o in obj) {
                add(o);
            }
        } else {
            queue.add(obj);
        }
    }

})();

