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

package com.google.acre.servlet;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.MDC;

import com.google.acre.script.AcreRequest;
import com.google.acre.script.AcreResponse;
import com.google.acre.script.HostEnv;
import com.google.acre.util.Supervisor;
import com.google.acre.util.resource.ResourceSource;
import com.google.acre.util.resource.ServletResourceSource;

/**
 * Servlet implementation class for dispatching request to js
 */
public class DispatchServlet extends HttpServlet {
    
    private static final long serialVersionUID = 4083653723650990204L;
    
    public void service(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        HostEnv hostenv;

        AcreRequest req;
        AcreResponse res;
        
        try {
            ResourceSource resources = new ServletResourceSource(getServletContext());
            req = new AcreRequest((AcreHttpServletRequest) request);
            res = new AcreResponse((AcreHttpServletResponse) response, req._logtype,req.getLogLevel());
            String tid = MDC.get("TID");
            req.setTID(tid);
            res.setTID(tid);
            Supervisor supervisor = (Supervisor) getServletContext().getAttribute(OneTrueServlet.SUPERVISOR);
            hostenv = new HostEnv(resources, req, res, supervisor);
        } catch (IOException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Bad Request (" + e.getMessage() + ")");
            return;
        }

        hostenv.run();
                
        res.finish();
    }

}
