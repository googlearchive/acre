post_body = acre.formdecode( acre.environ.request_body );

acre.write( JSON.stringify(post_body) )
acre.exit();



