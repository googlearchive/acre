acre.require('/test/lib').enable(this);

// not all acre instances might have this API present so check to make sure
if (acre.mail) {

    test('acre.mail exists and has all the pieces', function() {
        ok(typeof acre.mail != "undefined", "mail service exists");
        ok(typeof acre.mail.send == "function", "mail.send exists");
        ok(typeof acre.mail.send_admins == "function", "mail.send_admins exists");
    });
    
    test('acre.mail.send works', function() {
        try {
            acre.mail.send({
                "sender" : "blah@blah.com",
                "to" : [ "1@blah.com" , "2@blah.com" ],
                "cc" : [ "1@blah.com" , "2@blah.com" ],
                "bcc" : [ "1@blah.com" , "2@blah.com" ],
                "subject" : "Blah",
                "reply_to" : "other_blah@blah.com",
                "text_body" : "Blah, how are you?",
                "html_body" : "<html><body>Blah, how are you?</body></html>"
            });
            ok(true,"exception wasn't triggered");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });

    test('acre.mail.send_admins works', function() {
        try {
            acre.mail.send_admins({
                "sender" : "blah@blah.com",
                "to" : [ "1@blah.com" , "2@blah.com" ],
                "cc" : [ "1@blah.com" , "2@blah.com" ],
                "bcc" : [ "1@blah.com" , "2@blah.com" ],
                "subject" : "Blah",
                "reply_to" : "other_blah@blah.com",
                "text_body" : "Blah, how are you?",
                "html_body" : "<html><body>Blah, how are you?</body></html>"
            });
            ok(true,"exception wasn't triggered");
        } catch (e) {
            console.log(e);
            ok(false,"exception was triggered");
        }
    });
    
}

acre.test.report();
