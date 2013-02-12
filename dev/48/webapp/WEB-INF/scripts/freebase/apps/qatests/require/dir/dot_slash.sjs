// relative require should go to the root
var bar = acre.require("bar.sjs").bar;

// should stay in the same directory
var foo = acre.require("./foo.sjs").foo;
