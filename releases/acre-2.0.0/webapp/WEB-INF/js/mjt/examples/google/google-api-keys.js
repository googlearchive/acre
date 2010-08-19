
//
//  this is a trampoline that looks up a google api key for the
//  current server and fetches a particuler google js file.
//
//
//  the google script to load is in the query section of the url
//  (not even form encoded).
//
//  it should only be accessed using <script src=> in the <head>
//  because it uses document.write to generate the new script tag.
//
//  google maps:
//    <script type="text/javascript" src="../../google-api.js"></script>
//    <script type="text/javascript">
//         load_google_api('http://maps.google.com/maps?file=api&v=2&key=');
//    </script>
//
//  google ajax feeds:
//    <script type="text/javascript" src="../../google-api.js"></script>
//    <script type="text/javascript">
//         load_google_api('http://www.google.com/jsapi?key=');
//    </script>
//

// fetch the google maps api by api key
load_google_api = function (url) {

    // keys may be generated or stripped by automatic tools, be careful...
    var google_maps_api_keys = {
        /////   mjtnix   /////

        'mjtemplate.org': // GOOGLE_API_KEY
            'ABQIAAAAHcNcNCXx9QuPB639QUP2BBRXD922rpgQL7_zDNfGbZzDFSrvZBTkvsbc_qddTgwgbvz_2IhGdeacsA',

        'www.mjtemplate.org': // GOOGLE_API_KEY
            'ABQIAAAAHcNcNCXx9QuPB639QUP2BBScxoQX5EQI5eKsWQlU-QAT2FfeFhRJgCOeJn3AEum0W-jOFuqRpRGu0Q',

        '': null
    };

    var api_key = google_maps_api_keys[window.location.hostname];

    if (typeof api_key == 'undefined')
        alert('no google maps api key found for http://' + window.location.hostname);
    else {
        // load google api
        document.write('<script type="text/javascript" src="'
                       + url
                       + api_key
                       + '"></script>\n');
    }
};

