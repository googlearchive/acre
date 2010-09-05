var response = { 
   status: 200,
   status_message: 'OK',
   graph_status: '??',    // 200 OK
   graph_server: '??',    // www.freebase.com
   error: '',             // Graph problem
   version: ''
};

try {

   check_graph_status();
   response.version = acre.version || null;

   if (acre.request.params.callback) {
      acre.response = 200;
      acre.response.set_header('content-type', 'application/json; charset="UTF-8"'); // JsonP requires a 200, failures are communicated in the body
      if (!response.error) { delete response.error; }
      acre.write(acre.request.params.callback +'(' + JSON.stringify(response) + ');' );
   } else {
      acre.response.status = response.status;
      acre.response.set_header('content-type', 'text/plain; charset="UTF-8"');
      acre.write('Acre  status: '+ response.status + ' ' + response.status_message + '\n'); 
      acre.write('Graph status: '+ response.graph_status + '\n');
      acre.write('Graph server: '+ response.graph_server + '\n'); 
      acre.write('Version: '+ response.version + '\n');
      if (response.error) { acre.write('Error: ' + response.error); }
   }

} catch (e) {
   acre.response.status = 500;
   acre.response.set_header('content-type', 'text/plain; charset="UTF-8"');
   acre.write('Acre status: 500 FAIL. ' + e);
}

acre.exit();

/*
function check_graph_status() {
   var graph_response = acre.urlfetch( acre.freebase.service_url + '/api/version');
   var graph_details = JSON.parse(graph_response.body);

   response.graph_status = graph_details.status;
   response.graph_server = graph_details.server;

   var freebase_service_url = acre.freebase.service_url.replace('http://','');
   if (freebase_service_url != graph_details.server) {
      add_error('Is ACRE badly configured? (graph server != freebase_service_url) '+
                '(' + graph_details.server + ' != ' + freebase_service_url + ')' );
   }
}
*/

function check_graph_status() {
  response.graph_status = "200 OK";
  response.graph_server = acre.freebase.service_url.replace('http://','');
}

// set reponse to '500 FAIL' and add error message
function add_error(error) {
   response.status = 500;
   response.status_message = 'Error';
   response.error += error;
}

