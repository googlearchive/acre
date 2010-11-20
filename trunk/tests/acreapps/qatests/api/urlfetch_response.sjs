/*
 *    Urlfetch fetches this script.  This script 
 *    parses the headers in the HTTP request and returns them in the message body.
 *   parses the URL, and returns any params that it finds in the message body.
 *   parses any attached content, and returns info about the content in the message body.
 *
 */


try {  
  acre.write(JSON.stringify(acre.environ));
  console.log("got environ: " + JSON.stringify(acre.environ));
  console.log("got params: " + JSON.stringify(acre.environ.params) );
  console.log("got body: " + acre.environ['body'] );
  
} catch(e) {
    acre.write(JSON.stringify(e));
}


