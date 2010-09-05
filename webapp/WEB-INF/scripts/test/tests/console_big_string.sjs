// http://tests.test.dev.acre.z/console_big_string

var kb     = acre.request.params.kb  || 10;
var str    = acre.request.params.str || 'Hamster';

var len    = 1024*kb;
var count  = Math.floor( len / str.length );
var output = '';

for (var i=0; i<=count; i++) {
  output += (str+i);
}
output = output.slice(0,len);

console.log(output);
acre.write('Logged string of '+len+' chars');