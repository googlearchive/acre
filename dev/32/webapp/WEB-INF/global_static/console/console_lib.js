
// for injecting msgs as GETs 
function msg(text) {
  var i = document.createElement('img');
  i.src = 'http://mqlx.z/m?_='+text+'__'+(Date.now() % 10000);
}

// (collapsed_height should match CSS height for actionbar + header)
var prefs = {
  get : function() {
    var p = {collapsed:true, collapsed_height:60, expanded_height:300, show_verbose:false }; //defaults
    var r= /ACRE_CONSOLE_PREFS=(\d+)_(\d+)_(\d+)/.exec(document.cookie);
    if (r && r.length==4) {
      p.collapsed       = Boolean(Number(r[1]));
      p.expanded_height = Number(r[2]);
      p.show_verbose    = Boolean(Number(r[3]));
    }
    return p;
  },

  set : function(p) {
    var str = 'ACRE_CONSOLE_PREFS='+[p.collapsed?'1':'0',p.expanded_height,p.show_verbose?'1':'0'].join('_');
    //console.warn('WILL: setting cookie ',str);
    document.cookie=str + ';path=/';
  }
};

function set_log_frame_height(height) {
  var rows = height+',*';
  document.body.rows=rows;
}

function createIframe(name,src) {
  var f = document.createElement('frame');
  if (src)  { f.src  = src;  }
  if (name) { f.name = name; }
  document.body.appendChild(f);
  return f;
}

function enc(key,val,first) {
  var r = first ? '?' : '&';
  r = r + key + '=' + window.encodeURIComponent(val);
  return r;
}

function get_app() {
  var location = document.location;

  // defaults
  var app_file = '';
  var app_path = '';
  var app_args = '';

  if (location.pathname.indexOf('/acre/preview')===0) {
    // warn and use defaults
    window.alert('This is an old-style preview url. Please remove /acre/preview from the url and add ?acre.console=1');
    
  } else if (location.search.indexOf('acre.console')!==0) {
    
    // remove ?acre.console=xxxx from search, convert first & to ? if present
    app_args = location.search.replace(/[\?&]acre\.console=[^&]+/,'').replace(/^&/,'?');

    var r = location.pathname.split('/');
    if (r.length>1) { app_file = r[1]; }
    if (r.length>2) { app_path = '/' + r.slice(2).join('/'); }
  }

  return enc('file',app_file,true) + enc('path',app_path) +enc('args',app_args);
}


function init() {

  // test-logging.willmoffat.user.dev.freebaseapps.com --> "test-logging - Acre Console"
  document.title = document.location.hostname.split('.').shift() + ' - ' + document.title;
  
  var p = prefs.get();
  set_log_frame_height(p.collapsed ? p.collapsed_height : p.expanded_height);
 
  // Log Viewer iframe
  var app = get_app();
  createIframe('log','/acre/logviewer'+app);
  
  // App View ifame
  createIframe('app'); 

}





