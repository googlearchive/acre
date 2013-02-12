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


package com.google.acre.signal;

/*
 * This class allows our own SignalHandler class to fail more gracefully 
 * in case the "sun.misc.Signal*" classes are not found in the current jvm.
 */
final class SignalHandlerWrapper implements sun.misc.SignalHandler {

    private final sun.misc.SignalHandler existingHandler;

    private final SignalHandler handler;

    SignalHandlerWrapper(String signalName, SignalHandler handler) {
        this.handler = handler;
        sun.misc.Signal signal = new sun.misc.Signal(signalName);
        existingHandler = sun.misc.Signal.handle(signal, this);
    }

    public void handle(sun.misc.Signal sig) {
        if (handler.handle(sig.getName()) && (existingHandler != null)) {
            existingHandler.handle(sig);
        }
    }

}
