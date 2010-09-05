
(function (mjt) {

// should this be an acre app that returns JSON?

mjt.freebase.MqlHistory = mjt.define_task(null, [
                                    {name: 'user'},
                                    {name: 'limit', 'default':50}
                                    ]);

mjt.freebase.MqlHistory.prototype.init = function () {
    var qfuncs = ['mkq_objects', 'mkq_masters', 'mkq_values', 'mkq_texts', 'mkq_keys'];
    this.qs = [];

    for (var i = 0; i < qfuncs.length; i++) {
        var task = mjt.freebase.MqlRead([this[qfuncs[i]]()]);
        this.require(task.enqueue());
        this.qs.push(task);
    }
    return this;
};

mjt.freebase.MqlHistory.prototype.request = function () {
    var r = this.combine_results();
    return this.ready(r);
};


mjt.freebase.MqlHistory.prototype.mkq_objects = function () {
    return {
      id: null,
      name: null,
      timestamp:null,
      creator: this.user,
      attribution: null,
      sort:'-timestamp'
    };
};

mjt.freebase.MqlHistory.prototype.mkq_masters = function () {
    return {
      id: null,
      name: null,

      sort:'-/type/reflect/any_master.link.timestamp',
      limit: this.limit,
      '/type/reflect/any_master':[{
	sort: '-link.timestamp',
        limit: this.limit,
	link: {
	  timestamp: null,
	  operation: null,
	  valid: null,
	  master_property: null,
	  creator: this.user,
          attribution: null
	},
	id: null,
	name: null
      }]
    };
};

mjt.freebase.MqlHistory.prototype.mkq_values = function () {
    return {
      id: null,
      name: null,

      sort:'-/type/reflect/any_value.link.timestamp',
      limit: this.limit,
      '/type/reflect/any_value':[{
	sort: '-link.timestamp',
        limit: this.limit,
	link: {
	  timestamp: null,
	  operation: null,
	  valid: null,
	  master_property: null,
	  creator: this.user,
          attribution: null
	},
	value: null,
	type: null
      }]
    };
};

mjt.freebase.MqlHistory.prototype.mkq_texts = function () {
    return {
      id: null,
      name: null,

      sort:'-/type/reflect/any_value.link.timestamp',
      limit: this.limit,
      '/type/reflect/any_value':[{
	sort: '-link.timestamp',
        limit: this.limit,
	link: {
	  timestamp: null,
	  operation: null,
	  valid: null,
	  master_property: null,
	  creator: this.user,
          attribution: null
	},
        type: '/type/text',
	value: null,
        lang: null
      }]
    };
};

mjt.freebase.MqlHistory.prototype.mkq_keys = function () {
    return {
      id: null,
      name: null,

      sort:'-/type/namespace/keys.link.timestamp',
      limit: this.limit,
      '/type/namespace/keys':[{
        limit: this.limit,
	sort: '-link.timestamp',
	link: {
	  timestamp: null,
	  operation: null,
	  valid: null,
	  master_property: null,
	  creator: this.user,
          attribution: null
	},

        type: '/type/key',
	value: null,
	namespace: null
      }]
    };
};


mjt.freebase.MqlHistory.prototype.combine_results = function () {
    var results = [];
    var i, j, v, reflects, src, link, dest;

    var oldest_complete_t;
    var t;

    var objectr = this.qs[0].result;
    var masterr = this.qs[1].result;
    var valuer = this.qs[2].result;
    var textr = this.qs[3].result;
    var keyr = this.qs[4].result;

/*
    if (objectr.length > 0) {
        t = objectr[objectr.length - 1].timestamp;
        if (typeof oldest_complete_t == 'undefined' || t < oldest_complete_t)
            oldest_complete_t = t;
    }
    if (masterr.length > 0) {
        t = masterr[masterr.length - 1]['/type/reflect/any_master'].link.timestamp;
        if (typeof oldest_complete_t == 'undefined' || t < oldest_complete_t)
            oldest_complete_t = t;
    }
*/

    for (i = 0; i < objectr.length; i++) {
        v = objectr[i];
        t = v.timestamp;
//      if (t < oldest_complete_t)
          results.push({
            _src:  { id: v.id, name: v.name },
            timestamp: t,
            creator: v.creator,
            operation: 'create'
        });
    }

    for (i = 0; i < masterr.length; i++) {
        v = masterr[i];
        src = v;
        reflects = v['/type/reflect/any_master'];

        for (j = 0; j < reflects.length; j++) {
            dest = reflects[j];
            link = dest.link;
            t = link.timestamp;

//          if (t < oldest_complete_t)
              results.push({
                timestamp: t,
                creator: link.creator,
                operation: link.operation,
                valid: link.valid,
                linktype: link.master_property,
                _src:  { id: src.id, name: src.name },
                _dest: { id: dest.id, name: dest.name }
              });
        }
    }

    for (i = 0; i < valuer.length; i++) {
        v = valuer[i];
        src = v;
        reflects = v['/type/reflect/any_value'];

        for (j = 0; j < reflects.length; j++) {
            dest = reflects[j];

            if (dest.type == '/type/text')
                // this will be found by the text-specific query
                continue;

            link = dest.link;
            t = link.timestamp;

//          if (t < oldest_complete_t)
              results.push({
                timestamp: t,
                creator: link.creator,
                operation: link.operation,
                valid: link.valid,
                linktype: link.master_property,
                _src:  { id: src.id, name: src.name },
                _dest: { type: dest.type, value: dest.value }
              });
        }
    }

    for (i = 0; i < textr.length; i++) {
        v = textr[i];
        src = v;
        reflects = v['/type/reflect/any_value'];

        for (j = 0; j < reflects.length; j++) {
            dest = reflects[j];
            link = dest.link;
            t = link.timestamp;

//          if (t < oldest_complete_t)
              results.push({
                timestamp: t,
                creator: link.creator,
                operation: link.operation,
                valid: link.valid,
                linktype: link.master_property,
                _src:  { id: src.id, name: src.name },
                _dest: { type: dest.type, value: dest.value, lang: dest.lang }
              });
        }
    }

    for (i = 0; i < keyr.length; i++) {
        v = keyr[i];
        src = v;
        reflects = v['/type/namespace/keys'];

        for (j = 0; j < reflects.length; j++) {
            dest = reflects[j];
            link = dest.link;
            t = link.timestamp;

//          if (t < oldest_complete_t)
              results.push({
                timestamp: t,
                creator: link.creator,
                operation: link.operation,
                valid: link.valid,
                linktype: link.master_property,
                _src:  { id: src.id, name: src.name },
                _dest: { type: dest.type, value: dest.value, namespace: dest.namespace }
              });
        }
    }

    function cmp (a, b) {
        var ta = a.timestamp;
        var tb = b.timestamp;
        return (ta == tb ? 0 : (ta < tb ? 1 : -1));
    }

    results.sort(cmp);
    return results;
};

})(mjt);
