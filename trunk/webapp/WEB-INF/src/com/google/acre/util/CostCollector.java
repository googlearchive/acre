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

import java.util.Map;
import java.util.TreeMap;
import java.lang.ThreadLocal;
import java.util.Iterator;

public class CostCollector {
    /*
      Provides counters for collecting statistics for an acre request.
      Implemented as a singleton - the expectation is that a new one will be 
      created at the beginning of each request. See servlet/DispatchServlet.
    */

    // Holds the collector singleton object.
    private static final ThreadLocal<CostCollector> _instance = new ThreadLocal<CostCollector>();


    // Creates a new collector object and returns it.
    public static CostCollector createInstance() { 
        _instance.set(new CostCollector());
        return getInstance();
    }

    public static CostCollector getInstance() { 
        return _instance.get();
    }

    // Holds the actual cost numbers.
    Map<String,Float> costs = new TreeMap<String,Float>();
    
    public void merge(String costs_header) {
        String[] cost_frags = costs_header.split(", ");
        for (String cost_frag : cost_frags) { 
            String[] ff = cost_frag.split("=");
            if (ff.length == 2) {
                collect(ff[0],Float.parseFloat(ff[1]));
            }
        }
    }
    
    public CostCollector collect(String bin) {
        float value = 1.0f;
        if (costs.containsKey(bin)) {
            value += costs.get(bin);
        }
        costs.put(bin, value);
        return getInstance();
    }

    public CostCollector collect(String bin, int cost) {
        return collect(bin, cost / 1000.0f);
    }

    public CostCollector collect(String bin, long cost) {
        return collect(bin, cost / 1000.0f);
    }
    
    public CostCollector collect(String bin, float cost) {
        if (costs.containsKey(bin)) {
            cost += costs.get(bin);
        }
        costs.put(bin, cost);
        return getInstance();
    }
    
    public String getCosts() {
        
        StringBuffer b = new StringBuffer();
        
        Iterator<String> i = costs.keySet().iterator();
        while (i.hasNext()) {
            String key = i.next();
            b.append(key);
            b.append("=");
            float v = costs.get(key);
            boolean hasDecimals = (Math.floor(v) != v);
            b.append(String.format((hasDecimals) ? "%.3f":"%.0f", v));
            if (i.hasNext()) {
                b.append(", ");
            }
        }

        return b.toString();

    }





}