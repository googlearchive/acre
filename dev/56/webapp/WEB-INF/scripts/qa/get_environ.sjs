try {
  acre.write(JSON.stringify(acre.request));
} catch(e) {
  e.result = "FAIL";
  e.description = "an unexpected exception was thrown";
  acre.write(JSON.stringify(e));
}
