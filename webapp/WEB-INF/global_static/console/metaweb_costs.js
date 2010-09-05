
var mw_costs = (function() {
  
  // Please don't edit the SPEC object by hand, fix the original wiki page first and then regenerate:
  //   curl -o costs.txt https://wiki.metaweb.com/index.php/X-Metaweb-Cost
  //   perl -wne  "if (/('.+?')\s+-\s+(.+)/) { my (\$label,\$note)=(\$1,\$2); \$note =~ s/'//g; printf(\"  %-11s: '%s',\n\",\$label,\$note) } " costs.txt > body.js

  var SPEC = {
  'tu'       : 'time/user',
  'ts'       : 'time/system',
  'tr'       : 'time/real',
  'te'       : 'time/overall',
  'pr'       : 'page reclaims',
  'pf'       : 'page faults',
  'dw'       : 'primitive data writes',
  'dr'       : 'primitive data reads',
  'in'       : 'index size reads',
  'ir'       : 'index element reads',
  'iw'       : 'index element write',
  'va'       : 'value allocation',
  'ch'       : 'cache/hit',
  'cm'       : 'cache/miss',
  'cs'       : 'cache skip (browser shift+reload skips memcache)',
  'cr'       : 'cache/request - this is the actual TCP roundtrip count to memcache',
  'lh'       : 'lojson-cache/hit',
  'lm'       : 'lojson-cache/miss',
  'lr'       : 'lojson-cache/read',
  'mr'       : 'number of mql requests (independent of caches)',
  'mcu'      : 'mql user time',
  'mcs'      : 'mql system time,',
  'tm'       : 'mql real time,',
  'nreqs'    : 'graph requests',
  'tf'       : 'time/formatted',
  'tg'       : 'time/graph',
  'br'       : 'number of blob requests',
  'dt'       : 'total time spent in the session',
  'cc'       : 'cpu time (utime + stime)',
  'utime'    : 'time in user mode (float)',
  'stime'    : 'time in system mode (float)',
  'maxrss'   : 'maximum resident set size',
  'ixrss'    : 'shared memory size',
  'idrss'    : 'unshared memory size',
  'isrss'    : 'unshared stack size',
  'minflt'   : 'page faults not requiring I/O',
  'majflt'   : 'page faults requiring I/O',
  'nswap'    : 'number of swap outs',
  'inblock'  : 'block input operations',
  'oublock'  : 'block output operations',
  'msgsnd'   : 'messages sent',
  'msgrcv'   : 'messages received',
  'nsignals' : 'signals received',
  'nvcsw'    : 'voluntary context switches',
  'nivcsw'   : 'involuntary context switches',
  'rt'       : 'relevance/time',
  'bctn'     : 'cdb thumbnail time - from blobclient POV',
  'at'       : 'total response processing time (before sending response output)',
  'am'       : 'total amount of memory allocated to process this request (in bytes)',
  'asuc'     : 'number of system urlfetch calls (both user-driven and acre internal)',
  'asuw'     : 'cumulative system urlfetch waiting time (time elapsed waiting for the invoked URL to respond)',
  'asur'     : 'cumulative system urlfetch reading time (time spend reading the urlfetch output)',
  'auuc'     : 'number of user urlfetch calls (both user-driven and acre internal)',
  'auuw'     : 'cumulative user urlfetch waiting time (time elapsed waiting for the invoked URL to respond)',
  'auur'     : 'cumulative user urlfetch reading time (time spend reading the urlfetch output)',
  'rt'       : 'relevance/time (FIX: same name, different semantics?)',
  'pt'       : 'postgres time',
  'qt'       : 'actual postgres query time',
  'ct'       : 'postgres connect time',
  'mt'       : 'MQL time',
  'tt'       : 'total time',
  'mt'       : 'total MQL time: mql_output + mql_filter (FIX: same as mt above?)',
  'mft'      : 'MQL filter time (total time, ie. not per invocation)',
  'mfc'      : 'number of mql_filter invocations',
  'sh'       : 'squid/hit',
  'st'       : 'squid/total time',
  'so'       : 'squid/origin server time'
};

  function round(v) {
    v = v || 0;
    return v.toFixed(1);
  }
  
  function roundbytes(v) {
    var val,units;
    if      (v>1E6) { val = round(v/1E6); units = 'MB'; }
    else if (v>1E3) { val = round(v/1E3); units = 'KB'; }
    else            { val = v;            units = 'bytes'; }
    return '<b title="am">'+val+'</b> '+units;
  }

  function html_summary(c) {
    var at = round(c.at);               // acre execution time in s
    var _w = (c.asuw||0) + (c.auuw||0);      // acre.urlfetch waiting time in s
    var _p = (c.at && c.at != 0) ? Math.round( _w*100/c.at ) : 0; // percentage time spent waiting for urlfetch
    var am = c.am ? roundbytes(c.am) : ''; // acre memory usage - only availalbe with patched JVM
    var html = 'Processed in <b title="at">{AT}s</b> (<b title="(asuw+auuw)/at">{_P}%</b> network wait)'
              .replace('{AT}',at).replace('{_P}',_p);
    if (am) { html += ' and used '+am; }
    return html;
  }
  
  function html_list(costs) {
    var h = '<span class="mw-costs">\n';
    for (var label in costs) {
      var value = costs[label];
      var note = SPEC[label] || '???';
      h += '  <span title="'+note+'">' + label + ':' + value + '</span>\n';
    }
    h += '</span>';
    return h;
  }
  
  return {html_list:html_list, html_summary:html_summary};
})();

