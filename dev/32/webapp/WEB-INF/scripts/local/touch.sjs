if (acre.request.params.callback) {
  acre.response.set_header("content-type", "text/javascript");
  acre.write(acre.request.params.callback+'(');
}
acre.write(JSON.stringify(acre.freebase.touch(), null, 2));
if (acre.request.params.callback) acre.write(')');