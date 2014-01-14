
try {
  acre.exit();  
} catch (e) {
  if ((e.message == "acre.exit") && (e.name == "Error")) {
    acre.write('PASS')
  } else {
    acre.write('FAIL')
  }
  acre.exit();
}
acre.write('FAIL')

