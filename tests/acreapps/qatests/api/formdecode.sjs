var post_body = acre.form.decode(acre.request.body);
acre.write(JSON.stringify(post_body));
acre.exit();
