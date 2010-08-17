var einfo = acre.error;

var acre_server = acre.host.protocol + "://" + acre.host.name + ((acre.host.port === "80") ? "" : ":" + acre.host.port);

acre.response.status = 500;

acre.response.headers['vary'] = 'Accept';

if ('accept' in acre.request.headers && acre.request.headers['accept'].indexOf('text/html') > -1) {

    acre.response.headers['content-type'] = 'text/html';
    
    acre.write("<html>\n");
    acre.write("<head>\n");
    acre.write(" <title>Error in ", einfo.script.id ,"</title>\n");
    acre.write(" <link href='" + acre_server + "/acre/static/style.css' rel='stylesheet' type='text/css'>\n");
    acre.write("</head>\n");
    
    acre.write("<body>\n");
    acre.write("<div id='body'>\n");
        
    if (!einfo) {
        acre.write('<h3>This page is only intended to render an error caused by processing another script</h3>\n');
        acre.write('<p><b>error info is UNDEFINED</b></p>\n');
    } else {

        function parsename(filename) {
            return (/^(\/.+)\/([^\/]+)$/).exec(filename);
        }
                    
        function sourcelink(filename, line, fileinfo) {
            if (fileinfo === null) {
                return filename + ': ' + line;
            } else {
                var url = acre.freebase.service_url + '/tools/appeditor/#app='
                    + acre.form.quote(fileinfo[1]) + '&file=' + acre.form.quote(fileinfo[2])
                    + '&line=' + acre.form.quote(line);
                return '<a target="_blank" href="' + url + '">' + filename + '</a>: ' + line; 
            }
        }
        
        function highlight(str) {
            var s = str.split('"error_inside" : "."');
            if (s.length === 2) {
                if (s[1].charAt(0) === ',') { s[1] = s[1].substring(1); }
                return s[0] + '<span class="error">**** the error is here ****</span>' + s[1];
            } else {
                return s;
            }
        }

        acre.write('<h1>Error in <span class="script">', einfo.script.name, '</span></h1>');
        acre.write('<p class="msg">' , acre.html.encode(einfo.message), '</p>\n');
        
        var fileinfo = parsename(einfo.filename);
        
        if (fileinfo) { // this happens for syntax errors
            acre.write('<p>at ', sourcelink(einfo.filename, einfo.line, fileinfo), '</p>\n');
        }
    
        var frames = einfo.stack;
        if ( frames !== 'undefined' && frames.length > 0) {
            acre.write('<ul>\n' );
            var i = 0;
            while (i < frames.length ) {
                var filename = frames[i].filename;
                var line = frames[i].line;
                var info = parsename(filename);
                acre.write('<li');
                if (info === null) { acre.write(' class="internal"'); }
                acre.write('>');
                acre.write(sourcelink(filename, line, info));
                acre.write('</li>\n');
                i++;
            }   
            acre.write('</ul>\n' );
        }
        
        if (einfo.info) {
            if ("messages" in einfo.info && einfo.info.messages[0].query) { // MQL error
                acre.write('<h4>Query</h4>\n');
                acre.write('<pre class="query">', highlight(JSON.stringify(einfo.info.messages[0].query,null,2)), '</pre>\n');
            } else if ("body" in einfo.info) { // urlfetch error
                var body = einfo.info.body;
                delete einfo.info.body;
                acre.write('<h4>Headers</h4>\n');
                acre.write('<pre class="result">', JSON.stringify(einfo.info,null,2), '</pre>\n');
                acre.write('<h4>Response Body</h4>\n');
                acre.write('<pre class="body">', acre.html.encode(body.replace('\\n','\n')), '</pre>\n');
            } else {
                acre.write('<pre class="query">', acre.html.encode(JSON.stringify(einfo.info,null,2)), '</pre>\n');
            }
        }
    }
    
    if ('x-metaweb-tid' in acre.request.headers) {
        acre.write("<div class='tid'><a target='_new' href='http://stats.metaweb.com/query/transaction?tid=" + acre.request.headers['x-metaweb-tid'] + "'>TID</a></div>");
    }

    acre.write("</div>\n");
    acre.write("</body>\n");
    acre.write("</html>\n");

} else {

    acre.response.headers['content-type'] = 'text/plain';

    if (!einfo) {
        acre.write('This page is only intended to render an error caused by processing another script.\n');
    } else {
        acre.write("Error in " + einfo.script.id + "\n\n");
        acre.write(einfo.message + "\n\n");
        if ('x-metaweb-tid' in acre.request.headers) {
            acre.write("TID: " + acre.request.headers['x-metaweb-tid'] + "\n\n");
        }
        acre.write("at " + einfo.filename + ":" + einfo.line + "\n");
        var frames = einfo.stack;
        if (frames !== 'undefined' && frames.length > 0) {
            var i = 0;
            while (i < frames.length) {
                acre.write('  ' + frames[i].filename + ":" + frames[i].line + '\n');
                i++;
            }   
        }
        if (einfo.info) {
            acre.write('\n\n' + JSON.stringify(einfo.info,null,2));
        }        
    }
}
