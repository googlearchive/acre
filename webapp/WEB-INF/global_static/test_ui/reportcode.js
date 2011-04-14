/*global window document top jQuery test_suite */
jQuery(function($) {
  
  //HACK: how to share with server? use toSource?
  function get_key(testfile,module,test) {
    var key = encodeURIComponent(testfile.file) +'/' + encodeURIComponent(module.name) +'/' + encodeURIComponent(test.name);
    key = key.replace(/%20/g,'+'); // make it a little less ugly
    return key;
  }
  
  function truncateL(text) {
    var MAX = 40;
    var ddd = '...';
    var keep_start = 'http://somedomain'.length;
    var keep_end   = MAX - ddd.length - keep_start;
    if (text.length > MAX) {
      text = text.slice(0,keep_start) + ddd + text.slice(-keep_end);
    }
    return text;
  }

  function htmlencode(str) {
    return str
    .replace(/\&/g,'&amp;')
    .replace(/\</g,'&lt;')
    .replace(/\>/g,'&gt;');
  }

  function format_log_entry(entry) {
    var result = entry.result;
    var klass = result ? 'passed' : 'failed';
    var html = '';
    if (entry.message === 'tid' && result) {
      html = '<a target="_blank" href="http://stats.metaweb.com/query/transaction?tid='+result+'">tid</a>';
    } else if (typeof result === 'string' && result.indexOf('http://')===0) {
      // linkify url
      html = '<a target="_blank" href="'+result+'">' + truncateL(result) + '</a>';
    } else {
      if (!result) {
        html = result + ' : ';
      }
      html += htmlencode(entry.message);
    }
    return '<span class="'+klass+'">' + html + '</span>';
  }
  
  function update_row($row,test) {
    $('input',$row).attr('checked',true);
    var $resultdiv = $('.result',$row);
    var msg = '';
    // when loaded in discover mode, there are no results
    if (test.log && test.log.length) {
      msg = $.map(test.log,format_log_entry).join('\n');
    }
    var status = '';
    var outputklass = '';
    // was this an executed testsuite or just discover mode?
    if ('failures' in test) {
      status  = '<span class="toggle">'+(test.failures?OPEN:CLOSE)+'</span>';
      status += '<span class="'+(test.failures?'hadfails':'nofails')+'">Total:'+test.total+' Failed:'+test.failures+'</span>';
    }
    $resultdiv.html(status+'<pre class="'+(test.failures?'output':'output hidden')+'">'+msg+'</pre>');
  }
  
  var $numtotal = $('#globalstatus .numtotal');
  var $numfail  = $('#globalstatus .numfail');
  function increment($elm,num) {
    var val = parseInt($elm.text(),10);
    val += num;
    $elm.text(val);
  }
  function update_testsuite(testsuite) {
    if (!testsuite) { return; }
    if (testsuite.failures) {
      increment($numfail,testsuite.failures);
    }
    if (testsuite.total) {
      increment($numtotal,testsuite.total);
    }
    /*
    if (testfile.tid) {
      $('#tidlink a').href="http://stats.metaweb.com/query/transaction?tid="+encodeURIComponent(testfile.tid);
      $('#tidlink').show();
    }
    */
    var $rows = $('tr');
    $.each(testsuite.testfiles,function(i,testfile) {
      $.each(testfile.modules,function(i,module) {
        $.each(module.tests,function(i,test) {
          var key = get_key(testfile,module,test);
          $rows.attr('data-testkey',function(i,testkey) {
              if (testkey===key) {
                var $row = $(this);
                update_row($row,test);
              }
          });
        });
      });
    });
    // $('.fail ',$row).text( module.failures );
    // $('.total',$row).text( module.total );
    // $('.tests .result',$row).remove(); // remove any previous results
  }

  
  function run_file() {
    var test_url = this.href;
    $('a.run_file[href='+test_url+']').closest('tr').find('.result').text('Loading...');
    $.ajax({url:test_url, data:{output:'json'}, dataType:'json', success:update_testsuite});    
  }
  
  function click_file(e) {
    if (e.metaKey || e.shiftKey || e.altKey || e.ctrlKey) { return true; }
    run_file.apply(this);
    return false;
  }
  
  function run_all_files() {
    $numtotal.text('0');
    $numfail.text('0');
    var h={};
    var $selected_files = $('tr:has(td>input[checked]) a.run_file');
    var $unique_files = $selected_files.filter(function() {
      var seen = h[this.href];
      h[this.href]=true;
      return !seen;
    });
    $unique_files.each(run_file);
  }
  
  function toggle_all(e) {
    e.stopPropagation(); // stop tablesorter from changing the column sort
    $('td input').attr('checked', this.checked);
  }
  
  function init_console_link() {
    if (window === top) {
      var url = document.location.href;
      url = url.replace(/#,+/,'');
      var sep = "?";
      if (url.indexOf("?") !== -1) { sep="&"; }
      url = url + sep + 'acre.console=1';
      $('#showconsole').show().find(' a').attr('href',url);
    }
  }
  
  // toggle controls
  var OPEN ='-',
      CLOSE='+';
  $('.toggle').text(CLOSE).live('click',function() {
    var $c=$(this);
    $c.text( $c.text()===OPEN ? CLOSE : OPEN );
    $c.nextAll('.output').toggle();
    return false;
  });
  
  // init table
  var options = { headers:{ 0:{sorter:false} } };
  $('table').tablesorter(options);
  $('th:first input').click(toggle_all); 
  
  $('a.run_file').click(click_file);
  $('#runall').click(run_all_files);
  init_console_link();
  if (window.test_suite) {
    $('#globalstatus .message').text('');
    // supplied by acre server
    update_testsuite(window.test_suite);
  }
  
});

