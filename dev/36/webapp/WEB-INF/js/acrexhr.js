
////////////////////////////////////////////////////////////

// XHR implementation from Yehuda Katz via John Resig's env.js 
// originally from git://github.com/jeresig/env-js.git

// the major semantic difference from browser XHR is that
// the "async" property is ignored.
// this may break some browser apps which will get onreadystatechange
// callbacks before send() returns.

// - set up to export XMLHttpRequest under acre
// - cleaned up a bunch of rotted code
// - removed file: handling code for security
// - removed async handling since acre does't support async
// - use acre.urlfetch

//////////////////////////////////////////////////////////// 

// XMLHttpRequest
// Originally implemented by Yehuda Katz

var XMLHttpRequest = function(){
    this.headers = {};
    this.responseHeaders = {};
};

XMLHttpRequest.prototype = {
    open: function(method, url, async, user, password) {
        this.readyState = 1;
        if (async)
            this.async = true;
        this.method = method || "GET";
        this.url = url;
        this.onreadystatechange();
    },
    setRequestHeader: function(header, value) {
        this.headers[header] = value;
    },
    send: function(data){
        var self = this;
        
        function makeRequest(){
            var response;
            try {
                response = acre.urlfetch(self.url, self.method, self.headers, data);
            } catch (exc) {
                if (!('response' in exc))
                    throw exc;
                response = exc.response;
            }

            self.responseHeaders = response.headers;

            self.readyState = 4;
            self.status = response.status;
            self.statusText = response.status_text;
            self.responseText = response.body;
            
            self.responseXML = null;

            // TODO check the content-type to decide whether to even try this?
            // XXX this is super-sloppy but probably pretty accurate - it just
            // checks if 'xml' is anywhere in the content-type header.
            if (/xml/.test(response.content_type)) {
                try {
                    var doc = acre.xml.parse(body);
                } catch (e) {
                    console.warn("XMLHttpRequest: bad XML: " + e.message + " at line " + e.lineNumber);
                    // TODO browser fails silently i think.  someone should check.
                }
            }
            
            self.onreadystatechange();
        }

        // NOTE we ignore xhr.async, there's nothing we can do with it.
        // this may break some browser apps which will get onreadystatechange
        // callbacks before send() returns.
        // but Acre doesn't have any asynchronous support.
        //if (this.async)
        //    setTimeout(makeRequest, 0);
        //else
        makeRequest();
    },
    abort: function(){},
    getResponseHeader: function(header){
        if (this.readyState < 3)
            throw new Error("XMLHttpRequest.getResponseHeader: must call send() first");

        var lheader = header.toLowerCase();

        var returnedHeaders = [];

        // this is unnecessary if responseHeaders is already lowercased,
        // could just look up the value there
        for (var h in this.responseHeaders) {
            if (lheader == h.toLowerCase())
                returnedHeaders.push(this.responseHeaders[h]);
        }

        if (returnedHeaders.length)
            return returnedHeaders.join(", ");
        
        return null;
    },
    getAllResponseHeaders: function(){
        if (this.readyState < 3)
            throw new Error("XMLHttpRequest.getAllResponseHeaders: must call send() first");

        var returnedHeaders = [];
        for (var header in this.responseHeaders)
            returnedHeaders.push( header + ": " + this.responseHeaders[header] );
            
        return returnedHeaders.join("\r\n");
    },

    async: true,
    readyState: 0,
    responseText: "",
    status: 0,

    onreadystatechange: function(){}
};

// trick to set XMLHttpRequest on the global object
(function() {
    var global = this;
    global.XMLHttpRequest = XMLHttpRequest;
})();
