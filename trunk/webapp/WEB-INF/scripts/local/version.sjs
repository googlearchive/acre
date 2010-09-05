// Get Version from our ME
var ME_version = JSON.parse(acre.urlfetch(acre.freebase.service_url + '/api/version').body);

// Transformations over version
ME_version['acre'] = acre.version;
delete ME_version['transaction_id'];
ME_version['me_server'] = ME_version.server;
ME_version['server'] = acre.host.name;

// Show it to the world
acre.response.status = 200;
acre.response.set_header('content-type','text/plain');
var payload = JSON.stringify(ME_version, null, 2);
if ('callback' in acre.request.params) {
  payload = acre.request.params.callback + '(' + payload + ')';
}

acre.write(payload);

