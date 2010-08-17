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


import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.methods.GetMethod;

public class TestHTTPS {

    public final static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage: ./acre test_https <url>");
            System.exit(1);
        }

        HttpClient httpclient = new HttpClient();
        GetMethod httpget = new GetMethod(args[0]); 
        try { 
            httpclient.executeMethod(httpget);
            System.out.println(httpget.getStatusLine());
        } finally {
            httpget.releaseConnection();
        }
    }
}
