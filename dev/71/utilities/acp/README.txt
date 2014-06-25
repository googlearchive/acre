


                               acp (as in: Acre CoPy) 
                              ------------------------


                                    
  What is this?
  -------------

This is an utility program that copies an acre application from the hosted environment (normally *.freebaseapps.com) 
to the local disk and from local disk to the hosted environment.

  Why is this useful?
  -------------------
  
While you can do acre app development directly in the browser-based App Editor,
there are several reasons why you would want to do it from your local machine:

 - you can use whatever text editor you like best
 
 - you can use whatever version control system you like best
 
 
  What are the drawbacks?
  -----------------------
  
The biggest drawback is that if you save something locally, Acre doesn't
know about it until you copy it back in the graph, which means that the
try/fail cycle becomes a try/upload/fail cycle which is slower.
  
  
  What do I need to use it?
  -------------------------
  
This app is written in Python so you need Python to run it. 

It also expects the Freebase Python library to be installed in the python 
environment that you'll use to run it. In a modern enough python release,
this is as simple as running

 easy_install freebase
 
(you might need admin privileges for that but try anyway)
  
  
  How do I use it?
  ----------------

Type

 ./acp.py 
 
and follow the instructions.

Note: the program will ask you to know what is the "id" of your app, normally that is

 /user/<your_freebase_user_id>/<your_app_domain_name>
                                                
If you're not sure what is your app domain name, just go to the list of your apps

 http://www.freebase.com/apps/user/<your_freebase_user_id>
 
look for your app there and click on it, the last part of the URL is what you need.                                                
                                                
                                   - o -
                                                
                                                
   Thank you for your interest.
   
   
                                                 The Acre Development Team

                                                     