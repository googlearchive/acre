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

import java.io.File;
import java.io.FileFilter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.mortbay.jetty.Connector;
import org.mortbay.jetty.Server;
import org.mortbay.jetty.bio.SocketConnector;
import org.mortbay.jetty.webapp.WebAppContext;
import org.mortbay.log.Log;
import org.mortbay.util.Scanner;

import com.google.acre.thread.ThreadPoolExecutorAdapter;
import com.google.acre.Configuration;
import com.google.acre.thread.AllocationLimitedThreadFactory;

public class AcreServer extends Server {

    /* -------------- Acre HTTP server ----------------- */
    
    private ScheduledExecutorService suicidetask;
    private ThreadPoolExecutor threadPool;
    
    public AcreServer() throws Exception  {

        int coreThreads = Configuration.Values.ACRE_POOL_CORE_THREADS.getInteger();
        int maxThreads = Configuration.Values.ACRE_POOL_MAX_THREADS.getInteger();
        int maxQueue = Configuration.Values.ACRE_POOL_MAX_QUEUE.getInteger();
        long keepAliveTime = Configuration.Values.ACRE_POOL_IDLE_TIME.getInteger();

        LinkedBlockingQueue<Runnable> queue = new LinkedBlockingQueue<Runnable>(maxQueue);
        ThreadFactory threadFactory = new AllocationLimitedThreadFactory(); 
        
        threadPool = new ThreadPoolExecutor(coreThreads, maxThreads, keepAliveTime, TimeUnit.SECONDS, queue, threadFactory);
        threadPool.allowCoreThreadTimeOut(true);
        int threads = threadPool.prestartAllCoreThreads();

        this.setThreadPool(new ThreadPoolExecutorAdapter(threadPool));

        // NOTE(SM): we use a BIO connector instead of the NIO connector
        // because NIO can't deal with thread deaths: if the execution
        // of a script is taking too long and acre kills it, that automatically
        // shuts down the I/O channel to the user and we can't communicate
        // that error back to the user (which also causes the I/O channel
        // to be abruptly terminated and causes all sorts of proxy errors
        // down the line). This is a performance penalty, but not severe
        // enough to compensate for this problem.
        
        Connector connector = new SocketConnector();
        connector.setPort(Configuration.Values.ACRE_PORT.getInteger());
        connector.setHost(Configuration.Values.ACRE_HOST.getValue());
        connector.setMaxIdleTime(Configuration.Values.ACRE_CONNECTOR_MAX_IDLE_TIME.getInteger());
        connector.setStatsOn(false);
        connector.setLowResourceMaxIdleTime(Configuration.Values.ACRE_CONNECTOR_LOW_RESOURCE_MAX_IDLE_TIME.getInteger());
        connector.setHeaderBufferSize(Configuration.Values.ACRE_CONNECTOR_HEADER_BUFFER_SIZE.getInteger());
        this.addConnector(connector);

        final File contextRoot = new File(Configuration.Values.ACRE_WEBAPP.getValue());
        final String contextPath = Configuration.Values.ACRE_WEBAPP_ROOT.getValue();

        File webXml = new File(contextRoot, "WEB-INF/web.xml");
        if (!webXml.isFile()) {
            Log.warn("Warning: Failed to find web application. Could not find 'web.xml' at '" + webXml.getAbsolutePath() + "'");
            System.exit(-1);
        }

        Log.info("Initializing context: '" + contextPath + "' from '" + contextRoot.getAbsolutePath() + "'");
        WebAppContext context = new WebAppContext(contextRoot.getAbsolutePath(), contextPath);
        context.setCopyWebDir(false);
        context.setDefaultsDescriptor(null);

        this.setHandler(context);
        this.setStopAtShutdown(true);
        this.setSendServerVersion(true);

        // Enable context autoreloading
        if (Configuration.Values.ACRE_AUTORELOADING.getBoolean()) {
            scanForUpdates(contextRoot, context);
        }

        // Enable acre suicide 
        if (Configuration.Values.ACRE_SUICIDE.getBoolean()) {
            prepareForSuicide(this, Configuration.Values.ACRE_SUICIDE_LIFETIME.getInteger());
        }

    }

    @Override
    protected void doStop() throws Exception {    

        try {
            // shutdown our scheduled tasks first, if any
            if (suicidetask != null) suicidetask.shutdown();
            if (threadPool != null) threadPool.shutdown();
            
            // then let the parent stop
            super.doStop();
        } catch (InterruptedException e) {
            // ignore
        }
        
    }
    
    private void scanForUpdates(final File contextRoot, final WebAppContext context) {
        List<File> scanList = new ArrayList<File>();

        scanList.add(new File(contextRoot, "WEB-INF/web.xml"));
        findFiles(".class", new File(contextRoot, "WEB-INF"), scanList);
        findFiles(".js", new File(contextRoot, "WEB-INF"), scanList);
        findFiles(".sjs", new File(contextRoot, "WEB-INF"), scanList);
        findFiles(".mjt", new File(contextRoot, "WEB-INF"), scanList);

        Log.info("Starting autoreloading scanner...");

        Scanner scanner = new Scanner();
        scanner.setScanInterval(Configuration.Values.ACRE_SCANNER_PERIOD.getInteger());
        scanner.setScanDirs(scanList);
        scanner.setReportExistingFilesOnStartup(false);

        scanner.addListener(new Scanner.BulkListener() {
            public void filesChanged(@SuppressWarnings("rawtypes") List changedFiles) {
                try {
                    Log.info("Stopping context: " + contextRoot.getAbsolutePath());
                    context.stop();

                    Log.info("Starting context: " + contextRoot.getAbsolutePath());
                    context.start();
                } catch (Exception ex) {
                    throw new RuntimeException(ex);
                }
            }
        });

        scanner.start();
    }

    private void prepareForSuicide(final Server server, int lifetime) {

        final Runnable killer = new Runnable() {
            public void run() { 
                Log.info("Committing suicide...");
                try {
                    server.stop();
                } catch (Throwable t) {
                    // ignore at this point, we want to die anyway
                }
                System.exit(1);
            }
        };

        suicidetask = Executors.newScheduledThreadPool(1);
        suicidetask.schedule(killer, lifetime, TimeUnit.SECONDS);
    }

    static private void findFiles(final String extension, File baseDir, final Collection<File> found) {
        baseDir.listFiles(new FileFilter() {
            public boolean accept(File pathname) {
                if (pathname.isDirectory()) {
                    findFiles(extension, pathname, found);
                } else if (pathname.getName().endsWith(extension)) {
                    found.add(pathname);
                }
                return false;
            }
        });
    }

}
