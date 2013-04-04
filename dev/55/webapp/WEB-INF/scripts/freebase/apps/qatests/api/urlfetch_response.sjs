/*
 *   Urlfetch fetches this script.  This script 
 *   parses the headers in the HTTP request and returns them in the message body.
 *   parses the URL, and returns any params that it finds in the message body.
 *   parses any attached content, and returns info about the content in the message body.
 *
 */

try {  
  acre.write(JSON.stringify(acre.request));
  console.log("got request environ: " + JSON.stringify(acre.request));
  console.log("got params: " + JSON.stringify(acre.request.params) );
  console.log("got body: " + acre.request.body );
} catch (e) {
  acre.write(JSON.stringify(e));
}


