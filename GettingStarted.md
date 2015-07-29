The open source release Acre allows you to run Acre apps on your own machine.

## Install and run Acre ##

To run it, the steps are:

  * svn checkout http://acre.googlecode.com/svn/stable/ acre
  * cd acre
  * ./acre build
  * ./acre run
  * point your browser at http://localhost:8115/acre/status to check that it worked

## Developing apps ##

Put the source for your apps in webapp/WEB-INF/scripts/ and edit your /etc/hosts (or otherwise configure DNS) as described in the README file, so that you can point your browser at http://yourapp.dev.acre.localhost:8115/ to see your app in action.

## More information ##

For more information about developing apps, see:

  * [Acre API and template docs](http://freebase.com/docs/)

For assistance with building apps, please join the [freebase-discuss mailing list](http://lists.freebase.com/mailman/listinfo/freebase-discuss).  The acre-dev list (attached to this project) is only for the development of the Acre open source software itself.