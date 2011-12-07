
var augment;

(function() {

    augment = function (obj) {

        // augment the given object (normally the 'acre' object)
        
        obj.mail = {
           "send" : send,
           "send_admins" : send_admins
        };

    };
    
    function send(obj) {
        _mailer.send(obj);
    }

    function send_admins(obj) {
        _mailer.send_admins(obj);
    }
    
})();

