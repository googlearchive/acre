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


package com.google.acre.script;

import org.mozilla.javascript.Scriptable;

/**
 * Interface for types/objects to be processed for JS compatibility.<br>
 * NOTE: properties marked with JS_prop... should have corresponding getters
 * Scope is necessary to create NativeObjects while populating js properties
 * 
 * @author Yuiry
 *
 */
public interface AnnotatedForJS {
    public Scriptable getScope();
}
