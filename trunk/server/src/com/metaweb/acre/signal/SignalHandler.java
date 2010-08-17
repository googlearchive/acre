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


package com.metaweb.acre.signal;

public abstract class SignalHandler {

    SignalHandlerWrapper _wrapper;
    
    public SignalHandler(String signalName) {
        try {
            _wrapper = new SignalHandlerWrapper(signalName, this);
        } catch (Throwable e) {
            throw new java.lang.RuntimeException("Signal handling facilities are not available in this JVM.");
        }
    }
        
    /**
     * The method that handles the signal this handler has been registered for.
     * If the method returns false or throws, the chain of invocation is stopped;
     * this includes the handlers the JVM already registered for those signals.
     */
    public abstract boolean handle(String signame);

}
