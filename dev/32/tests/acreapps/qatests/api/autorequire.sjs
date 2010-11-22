var require_id = acre.request.params['require_id'];

var result = {};

try {
  result = acre.require(require_id);
} catch (e) {
  for (p in e) {
    result[p] = e[p];
  }
}

acre.write(JSON.stringify(result));
