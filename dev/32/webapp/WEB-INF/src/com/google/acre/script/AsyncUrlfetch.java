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

import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;

public interface AsyncUrlfetch {
    //    public AsyncUrlfetch();
    //    public AsyncUrlfetch(AcreResponse response, Scriptable scope);
    public Scriptable scope();
    public void scope(Scriptable scope);
    public AcreResponse response();
    public void response(AcreResponse res);
    public void make_request(String url,
                             String method,
                             long timeout,
                             Map<String, String> headers,
                             Object body,
                             /* String response_encoding, */
                             /* boolean system, */
                             /* boolean log_to_user, */
                             Function callback);
    public void wait_on_result();
    public void wait_on_result(long time, TimeUnit tunit);
}
