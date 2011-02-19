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

package com.google.acre.util;

import java.util.HashMap;
import java.util.Timer;
import java.util.TimerTask;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.acre.script.exceptions.AcreThreadDeath;

/**
 * This class implements a way to supervise the execution of threads and
 * forcefully stop them after a specified time. This is useful to limit
 * the amount of CPU resources that user scripts can consume.
 * 
 * WARNING: the use of Thread.stop() is unsafe because forcefully
 * stopping a thread might leave monitors and locks in inconsistent states.
 * We are using it here knowingly because we couldn't find any other alternative.
 *
 */
public class Supervisor extends Timer {

    private final static Logger _logger = LoggerFactory.getLogger(Supervisor.class);    
        
    // the map between threads and their scheduled killing tasks
    private HashMap<Thread,ThreadKillerTask> _killerTasks = new HashMap<Thread,ThreadKillerTask>();

    /*
     * This is the task that is schedule to kill a particular Thread.
     */
    private final static class ThreadKillerTask extends TimerTask  {
        
        private Supervisor _supervisor;
        private Thread _thread;

        public ThreadKillerTask(Supervisor supervisor, Thread thread) {
            this._supervisor = supervisor;
            this._thread = thread;
        }

        public void run() {
            _supervisor.kill(_thread);
        }
    }
    
    public Supervisor() {
        super("Supervisor");
    }

    /**
     * By invoking this method, a killing task is scheduled to run and stop
     * the given thread after the given period (of milliseconds).
     * If invoked on a thread that was already being watched, the previous
     * killer is canceled and a new one is scheduled with the new period. 
     */
    public synchronized void watch(Thread thread, long deadline) {
        _logger.debug("acre.supervisor.watch","Schedule killer for " + thread.getName() + " [" + deadline + " ms]");
        if (this._killerTasks.containsKey(thread)) {
            _logger.warn("acre.supervisor.watch","Killer is already scheduled for " + thread.getName());
            throw new Error("supervisor rescheduled on thread " + thread.getName());
        }

        ThreadKillerTask killerTask = new ThreadKillerTask(this, thread);
        this._killerTasks.put(thread, killerTask);

        int delay = (int) (deadline - System.currentTimeMillis());
        if (delay < 0)
            delay = 10;

        try {
            this.schedule(killerTask, delay);
        } catch (IllegalStateException e) {
            // ignore, as this happens only when acre is being shut down
        }
    }

    /**
     * This method stops any killer scheduled for the given thread.
     */
    public synchronized void release(Thread thread) {
        _logger.debug("acre.supervisor.watch","Release killer for " + thread.getName());
        ThreadKillerTask killer = this._killerTasks.get(thread);
        if (killer != null) {
            killer.cancel();
            this._killerTasks.remove(thread);
        }
    }

    // XXX(SM): I'm using STDERR for now so that it's easier to observe
    // all this in production thru QBert. I plan to remove them once
    // we know more about its behavior in production.
    
    @SuppressWarnings("deprecation")
    public synchronized void kill(Thread thread) {
        this._killerTasks.remove(thread);
        String msg = "Killing " + thread.getName();

        // note there is a race condition checking the stack of another
        // thread - msg may not be accurate
        StackTraceElement[] stack = thread.getStackTrace();
        if (stack.length > 0)
            msg += " at " + stack[0];
        _logger.warn("acre.supervisor.kill", msg);

        // we copy the target thread stack here because the actual exception stack will be
        // from the supervisor thread, not the target thread.
        AcreThreadDeath exc = new AcreThreadDeath("Request time limit expired", stack);
        try {
            thread.stop(exc);
        } catch (ThreadDeath td) {
            // XXX this shouldn't actually happen, this
            // is probably here because sometimes the supervisor
            // stack shows up in a ThreadDeath message even
            // though it is another thread handling the exception?
            System.err.println("Caught ThreadDeath inside Supervisor");
            td.printStackTrace();
        }
    }

    @Override
    public synchronized void cancel() {
        super.cancel();
        // XXX this shouldn't be necessary if all the killer tasks
        // are cancelled
        this._killerTasks.clear();
    }
}
