acre.response.status = 404;
acre.response.set_header('content-type', 'text/html; charset="UTF-8"');

var acre_server = acre.host.protocol + "://" + acre.host.name + ((acre.host.port == "80") ? "" : ":" + acre.host.port);

acre.write("<html>\n");
acre.write("<head>\n");
acre.write(" <title>Not Found: ", acre.html.encode(acre.request.script.name) ,"</title>\n");
acre.write(" <link href='" + acre_server + "/acre/static/style.css' rel='stylesheet' type='text/css'>\n");
acre.write("</head>\n");

acre.write("<body>\n");
acre.write("<div id='body'>\n");
acre.write('<h1>Not Found</h1>');
acre.write('<p class="msg">No Such file <span class="script">', acre.html.encode(acre.request.script.name), '</span> in app <a href="/">', acre.html.encode(acre.request.script.app.id), '</a></p>\n');
 
acre.write("</div>\n");
acre.write("</body>\n");
acre.write("</html>\n");
