// http://tests.test.dev.acre.z/console

//TODO: drive this from acre.request.params.code

console.log( 0 );

console.log( 0, 1 );

console.warn( "a string" );

console.error( {} );

console.debug( null );

console.log( undefined );
 
console.log( {a:"this is a string"} );

console.log( '\'\n"' );

console.log( {a:'\'\n"'} );

console.log( {
  arr:[11,22,33],
  un:undefined,
  nul:null,
  zero:0,
  str:"a string",
  obj:{}
});

var animal = {name:'hamster', furry:true };
console.log(animal);
animal.furry = false;
console.log(animal);

//console.options = { MAX_DEPTH : 1 };
//console.log(acre.request);

console.log(acre.urlfetch);

//console.options = {FUNCTION_SOURCE: true };
//console.log(acre.urlfetch);

console.options = { SKIP:[acre] };
console.log(this);
/*
TODO: dates, NaN, InF, large objs
*/

// ACRE-1596
acre.require("/freebase/libs/sizzle/sizzle");         
var document = acre.html.parse('<div/>');
console.options = { MAX_DEPTH : 4 };
console.log('document='); // eat all the messages up to here
console.log(document);



