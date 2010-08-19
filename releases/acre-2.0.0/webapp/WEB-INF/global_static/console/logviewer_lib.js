if (typeof console === 'undefined') {
  var dummy = function() {};
  this.console = {info:dummy, log:dummy, warn:dummy, error:dummy};
}


// simple hint / watermarks for textareas
(function($) {      

  function onfocus() {
    var $this = $(this);
    if ($this.val() == $this.attr('title')) {
      $this.removeClass("defaultText");
      $this.val("");
    }
  }
  function onblur() {
    var $this = $(this);
    if ($this.val() === "" || $this.val() === $this.attr('title')) {
      $this.addClass("defaultText");
      $this.val($this.attr('title'));
    }
  }

  $.fn.defaulttext = function() {
    return this.each(function() {
      $(this).focus(onfocus).blur(onblur).blur();
    });
  };
}
)(jQuery);


var logviewer = (function() {

function add_log_line(level,time,event_html,force_top) {
  var $template = $('#log-entries li').eq(0);
  var $newline = $template.clone();

  if (level === 'debug') {
    $newline.addClass('verbose');
  }
  $newline.addClass(level);
  if (typeof time === 'number') { 
    $newline.find('.timestamp' ).text(time + 'ms');
  }
  $newline.find('.event').html(event_html);
  if (!force_top) {
    $('#log-entries').append($newline);
  } else {
    $template.after($newline);
  }

  $newline.find('.json-js-view').json_js_view(true); // single line = true
  return $newline;
}

function display_log_entry(entry,counts) {
  var meta = entry[0];
  var args = entry[1];
  if (args[0] && typeof args[0]==='string' && args[0].indexOf('Deprecation Warning:')===0) {
    counts.deprecated++;
  }
  // convert FirePHP levels to our css classnames:
  // LOG -> debug, INFO,WARN,ERROR -> info,warn,error
  var level = meta.Type.toLowerCase().replace('log','debug');
  counts[level]++;
  
  var time='???';
  if (!meta.Time) { console.error('Missing Time metadata in header logs'); }
  else {
    if (!g_t0) { g_t0 = meta.Time; }
    time = meta.Time - g_t0;
  }
  var event_html = window.JSON_JS.display(args);
  
  var $newline = add_log_line(level,time,event_html);
  $newline.find('.event-name').attr('title',meta.Type);
}

function display_counts(counts) {
  if (counts.deprecated) {
    var s = counts.deprecated===1 ? '': 's';
    var link = '<a target="_blank" href="http://wiki.freebase.com/wiki/Acre_Deprecation_Warnings">Learn how to fix it</a>';
    var html = '<b>This app will break in the future (it made '+counts.deprecated+' deprecated api call'+s+'). '+link+'.</b>';
    add_log_line('error',null,html, true /*force_top*/);
    counts.error++; //update the error count + force the logs to be open
  }
  for (var level in counts) {
    $('#actionbar .icon-'+level).text(counts[level]);
  }
}

function show_tid(tid) {
  tid = window.encodeURIComponent(tid);
  var $tidlink = $('#tid-link');
  var newhref = $tidlink.attr('href').replace('TID',tid);
  $tidlink.attr('href',newhref);
}
function show_view_source_url(url) {
  $('#source-link').attr('href', url);
}

function show_costs(costs_str) {
  var costs = {};
  var storer = function(match,label,val) {
    costs[label]=Number(val);
  };
  costs_str.replace(/(\S+?)=([\d\.]+)/g, storer);
  add_log_line('debug',null,'System Metrics: '+mw_costs.html_list(costs) , true /*force_top*/);
  $('#costs').html(mw_costs.html_summary(costs));
}

function display_log(log) {
  /*if (!headers_str) {
  $('#actionbar ul').remove();
  $('#actionbar').prepend('<h1>Logs not available</h1>');
  } else {
  */
  var counts = { debug:0,info:0,warn:0,error:0, deprecated:0 };

  var async_finished = function() {
    display_counts(counts);

    // if there are any errors, then always pop open the logs
    if (counts.error>0) {
      toggle_logs(false);
    }    
  };
  
  var async_display = function() {
    if (!log.length) { async_finished(); return; }
    display_log_entry( log.shift(), counts );
    setTimeout(async_display,20);
  };
  async_display();

}

// we trust document.write to give a better simulation of loading a standalone page than setting innerHTML
function display_app_output_as_html(html,app_doc) {

  // // unfortunately this breaks external files?  
  // var iframe = top.document.getElementsByTagName('frame')[1]; //HACK: won't work standlone
  // iframe.src = "data:text/html;charset=utf-8,"+encodeURIComponent(html);
  // return; 
  
  var chunk;
    
  app_doc.open();

  // we split the html up into chunks
  // so that each script gets a chance to execute any documnet.write()s
  while (html) {
    var i = html.indexOf('script',1); // start at 2nd char to avoid getting stuck on 'script'
    if (i !== -1) {
      chunk = html.slice(0,i); // write out the chunk of html
      html = html.slice(i);
    } else {
      chunk = html;
      html = '';
  }
    app_doc.write(chunk);
  } 
  
  app_doc.close();
}

function escape_html(text) {
    return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function display_app_output_as_text(text,app_doc) {
    app_doc.open();
    app_doc.write("<pre style='white-space:pre-wrap;'>" + escape_html(text) + "</pre>");
    app_doc.close();
}

function add_cache_buster(url) {
  var t = + new Date();
  var sep = (url.indexOf('?')==-1) ? '?' : '&';
  return url + sep + '_='+t;
}

function run_app(app_url,ui_callback) {
  // Simple cross-browser way to get iframe doc: http://xkr.us/articles/dom/iframe-document/
  var app_frame = top.frames['app']; // the IFrame or Frame that contains the app output
  var app_doc   = app_frame.document;
  
  // Are we in an IFRAME? (cannot use === in IE. See http://github.com/jquery/jquery/blob/master/src/event.js#L854)
  if (window == window.top) {
    // running in stand-alone mode (without frameset - used for debugging)
    $('#unframe,#log-toggle').hide();
    $('#app-output').show();
  }  
  
  var message = function(msg,extra_style) {
    var style = 'padding:3em;' + extra_style||'';
    var html = '<div style="'+style+'">'+msg+'</div>';
    $('body',app_doc).html(html);    
  };

  message('Running app...');
  var xhr = new XMLHttpRequest(); //WILL: why doesn't jQuery work here?

  xhr.open('GET', app_url, true); // POST stops the browser from caching the results

  // Firefox sets this by default, but WebKit doesn't. (And if there's an error, the error page will be in plain text without this)
  xhr.setRequestHeader('Accept','text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
  
  // enable console JSON format
  xhr.setRequestHeader('x-acre-enable-log','debug');
  xhr.setRequestHeader('Cache-Control','no-cache');
  function reload_as_frame(msg,isErr) {
    if (isErr) {
      message('ERROR: '+msg+'<br>Reloading...','color:red;');
    } else {
      message(msg);
    }
    app_frame.document.location = add_cache_buster(app_url);
  }
  xhr.onerror = function() { reload_as_frame('XHR failed',true); };
  
  xhr.onreadystatechange = function(event) {
    if(xhr.readyState === 4) {
      // show the results, irrespective of xhr.status
      var response;
      var err='';
      
      if (xhr.getResponseHeader('content-type').indexOf("text/plain")!==-1) {
        try { response = JSON.parse(this.responseText); }
        catch (e) { err = 'Could not JSON.parse response from Acre: '+e; }
      } else {
        err = 'Incorrect response content-type from Acre';
      }
      
      if (err) {
        reload_as_frame('Did not get a valid console payload',true);
        return; // don't process this bad response
      }
    
      var header_html = window.JSON_JS.display([response.headers],['Headers']);
      add_log_line('debug',null, header_html, true /*force_top*/);

      if (response.body===null) {
        reload_as_frame('Re-running with cache buster to show binary file...');
      } else {
        var content_type = response.headers['content-type'];
        if (content_type.indexOf('text/html')===0 || content_type.indexOf("application/xhtml+xml") === 0) {
          display_app_output_as_html(response.body,app_doc);
        } else {
          display_app_output_as_text(response.body,app_doc);
        }
      }
      // Give the app a chance to display before parsing and showing the logs
      setTimeout( function() {
        show_tid(xhr.getResponseHeader('x-metaweb-tid'));
        show_view_source_url(xhr.getResponseHeader('x-acre-source-url'));
        show_costs(xhr.getResponseHeader('x-metaweb-cost'));

        display_log(response.logs);
        ui_callback();
      },1);
      
    }
  };
  xhr.send(null);
}

return { run_app:run_app };

})();




//////////////
// OLD CODE //
//////////////




function toggle(control) {
  $(control).next('.toggle-div').toggle();
}

// for debugging in single frame mode
if (!top.prefs) {
  top.prefs = {
    get : function() { return {collapsed:false, collapsed_height: 60, expanded_height:100, show_verbose:true}; },
    set : function() {}
  };
  top.set_log_frame_height = function() {};
}

var FUZZY = 25; //how close the divider has to be before we assume collapsed or expanded
var current_prefs = top.prefs.get();

function resize_frame() {
  var height = current_prefs.collapsed ? current_prefs.collapsed_height : current_prefs.expanded_height;
  top.set_log_frame_height(height); // doesn't work on Safari :-(
}
function update_show_hide_logs() {
  $('#log-toggle a').text(current_prefs.collapsed ? 'Show Logs' : 'Hide Logs');
}

function toggle_logs(force_collapsed) {
  current_prefs.collapsed = (typeof force_collapsed==='boolean') ? force_collapsed : !current_prefs.collapsed;
  resize_frame();
  update_show_hide_logs();
  top.prefs.set(current_prefs);
  return false; //cancel link click
}

function update_run_link() {
  var edit_path_and_args = $('#edit-path-and-args').hasClass('defaultText') ? '' :  $('#edit-path-and-args').val();
  var app_url_base  = $('#app-url-base').text();
  var sep = (edit_path_and_args.indexOf('?') === -1) ? '?' : '&';
  var console_url = app_url_base + edit_path_and_args + sep + 'acre.console=1';
  $('#run-link').attr('href', console_url );
}

function monitor_frame_size() {
  var height = $(window).height();
  if (height < (current_prefs.collapsed_height+FUZZY)) {
    toggle_logs(true); // force collapsed state
  } else if (height>(current_prefs.collapsed_height+FUZZY) && current_prefs.collapsed) {
    current_prefs.collapsed = false;
    update_show_hide_logs();
  }
  if (!current_prefs.collapsed) {
    current_prefs.expanded_height = height;
  }
  top.prefs.set(current_prefs);
} 

function update_verbose() {
  $('.verbose').toggle(current_prefs.show_verbose);
  if ($('#show-verbose').attr('checked') && current_prefs.collapsed) {
    // if the user wants to see the system msgs, they probably want to see the logs too
    toggle_logs(false);
  }
}

function verbose_checkbox_handler() {
  current_prefs.show_verbose = this.checked;
  update_verbose();
  top.prefs.set(current_prefs);
}

function install_log_toggle_key() {
  if ($.browser.msie) { return; }
  
  $.each( [top,top.frames[0],top.frames[1]], function() {
    $(this.document).keypress( function(e) {
      if (e.keyCode == 119) { //F8
        toggle_logs();
        //if (e.shiftKey) { $('.mw-only').toggle(); } // Shift-F8 toggles the metaweb only links
      }
    });
  });
}

// this takes place once the app has run and all the log messages have been displayed
function finish_setup_ui() {
  install_log_toggle_key();
  update_verbose();
  $('.display-last').show();
}

// For displaying relative timestamps
var g_t0;

/* Someday this would be nice to have:
$('#promptbox').submit(eval_console);
function eval_console() {
  var $p = $('#prompt');
  $p.attr('disabled','disabled');
  var code_snippet = $p.val();
  var app_url = $('#run-link').attr('href').replace('acre.console=1', 'acre.eval='+encodeURIComponent(code_snippet));
  g_t0 = + new Date;
  logviewer.run_app(app_url,function() { $p.removeAttr('disabled').blur().focus(); });
  return false;
}
*/

function init() {
  var loc = document.location;
  var app_host = loc.protocol + '//' + loc.hostname + (loc.port ? ':'+loc.port : '') + '/';
  
  var r = /\?file=([^&]*)&path=([^&]*)&args=([^&]*)/.exec(loc.search);
  if (!r) { window.alert('could not parse args '+loc.search); }

  var dec = window.decodeURIComponent;
  var app_file = dec(r[1] || '');
  var app_path = dec(r[2] || '');
  var app_args = dec(r[3] || '');

  var app_url_base = app_host + app_file;  
  var app_url      = app_url_base + app_path + app_args;

  logviewer.run_app(app_url, finish_setup_ui);

  $('#unframe a').attr('href',app_url); //setup the close frame links
  $('#app-url-base').text(app_url_base);

  // Edit path and args control:
  var edit_path_and_args = app_path + app_args;
  if (edit_path_and_args) { $('#edit-path-and-args').val(edit_path_and_args); } 
  $('#edit-path-and-args').defaulttext();
  $('#edit-path-and-args').bind('input',update_run_link).bind('blur',update_run_link);
  $('#edit-path-and-args').keypress(function(e) { if (e.keyCode==13) { top.location.href=$('#run-link').attr('href'); } }); // 'click' the run link on enter
  update_run_link();

  $('#pathbar').show();
  $('#log-toggle a').click(toggle_logs);

  $(top.document).mouseup(monitor_frame_size); // the only visable part of the frameset is the divider, watch it for resizes

  $('#show-verbose').change(verbose_checkbox_handler).click(verbose_checkbox_handler); // IE doesn't send change :-(
  $('#show-verbose').attr('checked',current_prefs.show_verbose?'checked':'');
  update_show_hide_logs();


}

jQuery(init);
