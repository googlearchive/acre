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

public class Main {

    @SuppressWarnings("unused")
    public static void main(String[] args) throws Exception  {

        // register the JMX beans that Acre exposes
        MBeanServer mbs = ManagementFactory.getPlatformMBeanServer(); 
        mbs.registerMBean(new Configuration(), new ObjectName("acre:type=Configurations"));
        mbs.registerMBean(Statistics.instance(), new ObjectName("acre:type=Statistics"));
        
        //System.setProperty("VERBOSE","true");

        // create acre's server (which is a thin wrapper around Jetty) 
        AcreServer server = new AcreServer();

        // hook up the signal handlers
        new ShutdownSignalHandler("TERM", server);
        
        // start the server
        server.start();
        server.join();
    }

}
