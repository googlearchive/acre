// Copyright 2007-2010 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.acre;

import java.lang.management.ManagementFactory;

import javax.management.MBeanServer;
import javax.management.ObjectName;

import org.apache.log4j.Appender;
import org.apache.log4j.ConsoleAppender;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;

import com.google.util.logging.IndentingLayout;

public class Main {

    public static void main(String[] args) throws Exception  {

        // register the JMX beans that Acre exposes
        MBeanServer mbs = ManagementFactory.getPlatformMBeanServer(); 
        mbs.registerMBean(new Configuration(), new ObjectName("acre:type=Configurations"));
        mbs.registerMBean(Statistics.instance(), new ObjectName("acre:type=Statistics"));
        
        // tell jetty to use SLF4J for logging instead of its own stuff
        //System.setProperty("VERBOSE","true");
        System.setProperty("org.mortbay.log.class","org.mortbay.log.Slf4jLog");

        // initialize the log4j system
        Appender console = new ConsoleAppender(new IndentingLayout());
        
        Logger root = Logger.getRootLogger();
        root.setLevel(Level.ALL);
        root.addAppender(console);

        Logger jetty_logger = Logger.getLogger("org.mortbay.log");
        jetty_logger.setLevel(Level.INFO);

        // create acre's server (which is a thin wrapper around Jetty) 
        AcreServer server = new AcreServer();

        // hook up the signal handlers
        new ShutdownSignalHandler("TERM", server);
        
        // start the server
        server.start();
        server.join();
    }

}
