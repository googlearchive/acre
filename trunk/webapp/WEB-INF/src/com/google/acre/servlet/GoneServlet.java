// Copyright 2007-2012 Google, Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.acre.servlet;

import java.io.IOException;

import org.slf4j.MDC;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class for serving 410 Gone
 */
public class GoneServlet extends HttpServlet {

    private static final long serialVersionUID = 4083653733650990218L;

    public void service(HttpServletRequest request,
            HttpServletResponse response) throws ServletException, IOException {

      response.setStatus(HttpServletResponse.SC_GONE);
    }
}
