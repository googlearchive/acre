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



package com.google.acre.thread;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/**
 *  This class uses java.lang.reflect to fetch the allocationLimit so that
 *  this code can be linked against JVMs that don't have our patch for 
 *  java.lang.Thread.allocationLimit
 */
public class AllocationLimitedThread extends Thread {

    protected static Method _limitGetter;
    protected static Method _limitSetter;

    private static int threadInitNumber = 0;
    
    private static synchronized int nextThreadNum() {
        return threadInitNumber++;
    }
    
    static {
        try {
            _limitGetter = Thread.class.getDeclaredMethod("getAllocationLimit");
            _limitSetter = Thread.class.getDeclaredMethod("setAllocationLimit", Long.TYPE);
        } catch (NoSuchMethodException e) {
        } catch (SecurityException e) {
        }
    }

    public AllocationLimitedThread(Runnable r) {
        super(r, "Acre-" + nextThreadNum());
    }

    public long getThreadAllocationLimit() {
        if (_limitGetter == null) {
            return 0;
        }

        try {
            Object rval = _limitGetter.invoke(this);
            return ((Long) rval).longValue();
        } catch (InvocationTargetException e) {
        } catch (IllegalAccessException e) {
        }

        return 0;
    }

    public void setThreadAllocationLimit(long limit) {
        if (_limitSetter == null) {
            return;
        }

        try {
            _limitSetter.invoke(this, new Long(limit));
        } catch (InvocationTargetException e) {
        } catch (IllegalAccessException e) {
        }
    }
}
