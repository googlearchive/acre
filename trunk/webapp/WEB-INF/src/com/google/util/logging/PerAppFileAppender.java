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

package com.google.util.logging;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.spi.LoggingEvent;

public class PerAppFileAppender extends AppenderSkeleton {

    HashMap<String,BufferedWriter> appenders = new HashMap<String,BufferedWriter>();
    
    File file;
    
    public String getFile() {
        return file.toString();
    }
    
    public void setFile(String fileName) {
        File file = new File(fileName);
        if (!file.exists() && !file.mkdirs()) {
            throw new RuntimeException("Failed to create directory " + fileName + " for per-application logs");
        }
        this.file = file;
    }
            
    @Override
    protected void append(LoggingEvent event) {
        Object msg = event.getMessage();
        if (msg instanceof Object[]) {
            Object[] obj = (Object[]) msg;
            String app = (String) obj[0];
            String message = (String) obj[1];
            append(app, message);
        }
    }

    protected void append(String app, String msg) {
        BufferedWriter appender = null;
        
        if (!appenders.containsKey(app)) {
            File f = new File(file,app);
            if (!file.exists() && !file.mkdirs()) {
                throw new RuntimeException("Failed to create directory " + f + " for application " + app + "'s logs");
            }
            try {
                appender = new BufferedWriter(new FileWriter(f,true));
                appenders.put(app, appender);
            } catch (IOException e) {
                throw new RuntimeException("Failed to open file " + f + " for application " + app + "'s logs");
            }
        } else {
            appender = appenders.get(app);
        }
        
        try {
            appender.append(msg);
            appender.append('\n');
        } catch (IOException e) {
            throw new RuntimeException("Failed writing to application " + app + "'s log file");
        } finally {
            try {
                appenders.remove(app);
                appender.close();
            } catch (IOException e) {
                // ignore at this point
            }
        }
    }
    
    public void close() {
        Iterator<BufferedWriter> i = appenders.values().iterator();
        while (i.hasNext()) {
            try {
                i.next().close();
            } catch (IOException e) {
                // ignore
            }
        }
    }

    public boolean requiresLayout() {
        return false;
    }
}
