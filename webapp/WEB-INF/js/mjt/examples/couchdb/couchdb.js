//
//  mjt.Task wrapper around couchdb
//
//  see http://couchdb.com/
//
//  based on:
//    http://www.couchdbwiki.com/index.php?title=HTTP_Db_API
//    http://www.couchdbwiki.com/index.php?title=HTTP_Doc_API
//    http://www.couchdbwiki.com/index.php?title=HTTP_View_API
//
//  no JSONP yet in couchdb 0.7
//


if (typeof mjt.couchdb == 'undefined')
    mjt.couchdb = {};

/**
 *  @class a couchdb service endpoint
 *
 *  @constructor
 *  @param url the base url for the couchdb server
 *
 */
mjt.services.CouchdbService = function (url) {
    this.service_url = url || this.default_service_url;

    // check for same origin to see if XMLHttpRequest is allowed to service_url
    this.xhr_ok = false;
    var loc = window.location.protocol + '//' + window.location.host;
    if (this.service_url == loc)
        this.xhr_ok = true;
};


(function (couchdb) {

couchdb.valid_dbname_re = /^[a-z0-9_\$\(\)\+\-\/]*[^\/]$/;
couchdb.default_service_url = 'http://localhost/couchdb';


/**
 *  "base class" for couchdb xhr calls.
 */
couchdb.CouchdbTask = mjt.define_task(null);

couchdb.CouchdbTask.prototype.init = function () {
    this.service = this._factory;
};

couchdb.CouchdbTask.prototype.xhr_request = function (method, url, form, content_type, body) {
    url = this.service.service_url + url;
    if (typeof form == 'object' && form !== null) {
        var formstr = mjt.formencode(form);
        if (formstr != '')
            url += '?' + formstr;
    }
    this.xhr = mjt.Xhr(method, url, content_type, body);
    this.xhr.enqueue()
        .onready('xhr_ready', this)
        .onerror('xhr_error', this);

    return this;
};

couchdb.CouchdbTask.prototype.request = function () {
};

couchdb.CouchdbTask.prototype.xhr_error = function () {
    // XXX is this always json?
    var o = JSON.parse(this.xhr.xhr.responseText);
mjt.warn('XHRERR',this, o, this.xhr.xhr.responseText);

    if (typeof o == 'object' && o !== null)
        return this.error('/apiary/couchdb/' + o.error, o.reason);

// XXX should be error_nest?
    return this.error.apply(this, arguments);
};

/**
 * handle responses from XHR requests to couchdb service.
 */
couchdb.CouchdbTask.prototype.xhr_ready = function (xhr) {

    // try to parse a json body regardless of status
    var ct = xhr.getResponseHeader('content-type');
    // 0.7.2 returns text/plain unless there is an explict Accept:?
    if (0 && !ct.match(/^(application\/json)(;.*)?$/))
        return this.error('/user/mjt/messages/json_response_expected',
                          'status: ' + xhr.status + ', content-type: ' + ct,
                          xhr.responseText);

    var o = JSON.parse(xhr.responseText);
    return this.xhr_json_ready(o);
};

// override in "subclasses"
couchdb.CouchdbTask.prototype.xhr_json_ready = function (o) {
    return this.ready(o);
};

couchdb.CouchdbTask.prototype.validate_dbname = function (name) {
    if (!this.service.valid_dbname_re.test(name))
        throw Error('illegal couchdb database name ' + name);
    return this.name;
};


/*
    * key=keyvalue
    * startkey=keyvalue
    * startkey_docid=docid
    * endkey=keyvalue
    * count=max rows to return
    * update=false
    * descending=true
    * skip=rows to skip

    key, startkey, and endkey need to be properly JSON encoded values (for example, startkey="string" for a string value)

DELETE requires rev=?

 */


/**
 *  get a list of couchdb databases
 *
 */
couchdb.AllDbs = mjt.define_task(couchdb.CouchdbTask);

couchdb.AllDbs.prototype.init = function() {
    return this.xhr_request('GET', '/_all_dbs');
};

/**
 *  create a new database using PUT
 *
 */
couchdb.CreateDb = mjt.define_task(couchdb.CouchdbTask,
                                 [{ name: 'name' }]);

couchdb.CreateDb.prototype.init = function() {
    this.validate_dbname(this.name);
    return this.xhr_request('PUT', '/' + mjt.formquote(this.name) + '/');
};

couchdb.CreateDb.prototype.xhr_json_ready = function (o) {
    if (o.ok)
        return this.ready(o);
    mjt.warn('couchdb error', o);
    var err = o.error;
    return this.error(err.id, err.reason);
};


/**
 *  delete a couchdb database
 *
 */
couchdb.DeleteDb = mjt.define_task(couchdb.CouchdbTask,
                                 [{ name: 'name' }]);

couchdb.DeleteDb.prototype.init = function() {
    this.validate_dbname(this.name);
    return this.xhr_request('DELETE', '/' + mjt.formquote(this.name) + '/');
};

couchdb.DeleteDb.prototype.xhr_json_ready = function (o) {
    if (o.ok)
        return this.ready(o);
    mjt.warn('couchdb error', o);
    var err = o.error;
    return this.error(err.id, err.reason);
};

/**
 *  get info about a couchdb database
 *
 */
couchdb.GetDb = mjt.define_task(couchdb.CouchdbTask,
                                [{ name: 'name' }]);
couchdb.GetDb.prototype.init = function() {
    this.validate_dbname(this.name);
    return this.xhr_request('GET', '/' + mjt.formquote(this.name) + '/');
};


/**
 *  get a list of documents in a couchdb database
 *
 */
// options:
// descending=true
// startkey=
// count=
couchdb.AllDocs = mjt.define_task(couchdb.CouchdbTask,
                                 [{ name: 'db' }]);

couchdb.AllDocs.prototype.init = function() {
    return this.xhr_request('GET', '/' + this.db + '/_all_docs');
};

/**
 *  get a couchdb document as a javascript object
 *
 */
// options:
// full=true
// rev=
// revs=true
// revs_info=true
couchdb.GetDoc = mjt.define_task(couchdb.CouchdbTask,
                                [{ name: 'db' },
                                 { name: 'docid' }]);

couchdb.GetDoc.prototype.init = function() {
    this.validate_dbname(this.db);
    var path = '/' + mjt.formquote(this.db)
        + '/' + mjt.formquote(this.docid);
    return this.xhr_request('GET', path);
};

/**
 *  delete a couchdb document
 *
 */
couchdb.DeleteDoc = mjt.define_task(couchdb.CouchdbTask,
                                [{ name: 'db' },
                                 { name: 'docid' }]);

couchdb.DeleteDoc.prototype.init = function() {
    this.validate_dbname(this.db);
    var path = '/' + mjt.formquote(this.db)
        + '/' + mjt.formquote(this.docid);
    return this.xhr_request('DELETE', path);
};

couchdb.DeleteDoc.prototype.xhr_json_ready = function (o) {
    if (o.ok)
        return this.ready(o);
    mjt.warn('couchdb error', o);
    var err = o.error;
    return this.error(err.id, err.reason);
};


/**
 *  create or update a couchdb document
 *
 */
couchdb.PutDoc = mjt.define_task(couchdb.CouchdbTask,
                                [{ name: 'db' },
                                 { name: 'docid' },
                                 { name: 'data' },
                                 { name: 'attachments' }]);

couchdb.PutDoc.prototype.base64 = function() {
    // XXX attachment handling is incomplete
    return 'XYZPDQ';
};

couchdb.PutDoc.prototype.init = function() {
    this.validate_dbname(this.db);

    // by default use POST to generate new docid
    var method = 'POST';
    var path = '/' + mjt.formquote(this.db) + '/';

    if (this.docid) {
        // use PUT to db/docid, POST to generate new docid
        path += mjt.formquote(this.docid);
        method = 'PUT';
    }

    var d = {};
    for (var k in this.data)
        d[k] = this.data[k];
    if (typeof this.attachments != 'undefined') {
        d._attachments = {};
        for (var k in this.attachments) {
            d._attachments[k] = {
                type: 'base64',
                data: this.base64(this.attachments[k])
            };
        }
    }

    return this.xhr_request(method, path, {},
                            'application/json',
                            JSON.stringify(d));
};

couchdb.PutDoc.prototype.xhr_json_ready = function (o) {
    if (o.ok)
        return this.ready(o);
    mjt.warn('couchdb error', o);
    var err = o.error;
    return this.error(err.id, err.reason);
};


/**
 *  get a couchdb document attachment as a string
 *
 */
// options:
// full=true
// rev=
// revs=true
// revs_info=true
couchdb.GetAttachment = mjt.define_task(null,
                                [{ name: 'db' },
                                 { name: 'docid' },
                                 { name: 'attachment' }]);

couchdb.GetAttachment.prototype.init = function() {
    this.service = this._factory;
    this.validate_dbname(this.db);
    var path = '/' + mjt.formquote(this.db)
        + '/' + mjt.formquote(this.docid)
        + '?' + mjt.formencode({ attachment:this.attachment });
    var url = this.service.service_url + path;
    this.xhr = mjt.Xhr('GET', url);
    this.xhr.enqueue()
        .onready('xhr_ready', this)
        .onerror('xhr_error', this);

    return this;
};

couchdb.GetAttachment.prototype.xhr_ready = function(xhr) {
    return this.ready(xhr.responseText);
};

couchdb.GetAttachment.prototype.request = function () {
};

couchdb.GetAttachment.prototype.xhr_error = function () {
mjt.warn('xhr err', arguments, this.xhr);
// XXX should be error_nest?
    return this.error.apply(this, arguments);
};


/**
 *  update a list of couchdb documents in a single request
 *
 */
couchdb.BulkDocs = mjt.define_task(couchdb.CouchdbTask,
                                [{ name: 'db' },
                                 { name: 'docid' },
                                 { name: 'data' }]);

couchdb.BulkDocs.prototype.init = function() {
    this.validate_dbname(this.db);

    var path = '/' + mjt.formquote(this.db) + '/_bulk_docs';
    return this.xhr_request('POST', path, {},
                            'application/json',
                            JSON.stringify(this.data));
};

couchdb.BulkDocs.prototype.xhr_json_ready = function (o) {
    if (o.ok)
        return this.ready(o);
    mjt.warn('couchdb error', o);
    var err = o.error;
    return this.error(err.id, err.reason);
};

/**
 *  get the results of a stored couchdb view
 *
 */
couchdb.GetView = mjt.define_task(couchdb.CouchdbTask,
                                  [{ name: 'db' },
                                   { name: 'design' },
                                   { name: 'view' }]);

couchdb.GetView.prototype.init = function() {
    this.validate_dbname(this.db);
    var path = '/' + mjt.formquote(this.db)
        + '/' + mjt.formquote(this.design)
        + '/' + mjt.formquote(this.view);
    return this.xhr_request('GET', path);
};


/**
 *  run a couchdb view without storing it
 *
 */
couchdb.TempView = mjt.define_task(couchdb.CouchdbTask,
                                   [{ name: 'db' },
                                    { name: 'src' }]);

couchdb.TempView.prototype.init = function() {
    this.validate_dbname(this.db);
    return this.xhr_request('POST',
                            '/' + mjt.formquote(this.db) + '/_temp_view',
                            {},
                            'text/javascript',
                            this.src);
};


})(mjt.services.CouchdbService.prototype);


