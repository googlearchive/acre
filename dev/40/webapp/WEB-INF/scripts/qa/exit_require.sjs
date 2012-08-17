var data = "";
  
try {
  data = acre.require("exit_require_a");
} catch (e) {
  if ( e != "Error: acre.exit" ) {
    acre.write('FAIL: ')
    acre.write(e);
  } else {
    acre.write('PASS')
  }  
}
acre.exit();

