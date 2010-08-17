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


package com.metaweb.acre.util.exceptions;

/**
 * Script error that can not be caught or handled by script
 * but is reported to the user with stack trace
 * 
 */
public class AcreThreadDeath extends ThreadDeath {

    private static final long serialVersionUID = -8274884475409431129L;
    
    // this is used if the error is thrown by the supervisor thread,
    // in which case the exception stack will be wrong.
    public StackTraceElement[] stack;

    public AcreThreadDeath(String msg) {
        super();
        stack = null;
    }

    public AcreThreadDeath(String msg, StackTraceElement[] tstack) {
        super();
        stack = tstack;
    }
}
