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


package com.google.acre;

import java.util.HashMap;
import java.util.Timer;
import java.util.TimerTask;

public class Statistics extends TimerTask implements StatisticsMBean {
           
    static private Statistics instance;
        
    public static Statistics instance() {
        if (instance == null) {
            instance = new Statistics();
        }
        return instance;
    }
    
    /**
     * A meter is capable of collecting information about how many
     * actions per unit of time are currently occurring (rate)
     * and the average cost of that action (cost). Cost is 
     * general and can be, for example, time required to complete the action.
     * 
     * The 'rate' is defined as the amount of actions per second, 
     * and it's calculated by counting requests
     * during a certain period of time (defined by the period between
     * invocations of the update() method).
     * 
     * One can specify at construction how 'instantaneously' the 
     * meter behaves in estimating the both rate and cost by indicating 
     * the value c of the function
     * 
     *   X(t) = c * x(t) + (1-c) * X(t-1)
     *   
     * for c==1 (the default value), the meter is not influenced by
     * past values, but only by present values, for c > 0, the past
     * influences the future.
     * 
     * To avoid aliasing effects, the rate value is  
     * not changed by the samples but only with a call to update()
     * which should be called periodically.
     */
    public class Meter {

        String name;

        long periodCost = 0;
        int periodCount = 0;
        
        float rate_c = 1.0f;
        float cost_c = 1.0f;
        
        float cost = 0;
        float rate = 0;
                
        long lastUpdate = System.currentTimeMillis();
        
        public Meter(String name) {
            this.name = name;
        }
        
        public Meter(String name, float rate_c, float cost_c) {
            this.name = name;
            this.rate_c = rate_c;
            this.cost_c = cost_c;
        }
                
        public synchronized void collectCost(long cost) {
            periodCost += cost;
            periodCount++;
        }

        public void update() {
            long now = System.currentTimeMillis();
            long period = now - lastUpdate;
            if (period > 0) { // avoid division by zero problems
	            float dr = (float) (periodCount * 1000) / (float) period; // actions per second
	            // NOTE(SM): 1000 is hardwired because that's how many millis in a second and period
	            // is calculated in milliseconds so this value never changes.
	            float dc = (periodCount == 0) ? 0.0f : (float) (periodCost) / (float) periodCount; // average action cost last period
	            rate = rate_c * dr + (1.0f - rate_c) * rate;
	            cost = cost_c * dc + (1.0f - cost_c) * cost;
	            periodCount = 0;
	            periodCost = 0;
	            lastUpdate = now;
            }
        }
        
        public float getCost() {
            return cost;
        }

        public float getRate() {
            return rate;
        }
        
        public String toString() {
            return name;
        }
    }
    
    static final int period = 1000;
    
    HashMap<String,Meter> appMeters = new HashMap<String,Meter>();
    
    Meter requestsMeter;
    Meter urlfetchWaitingMeter;
    Meter urlfetchReadingMeter;
    
    
    private Statistics() {

        requestsMeter = new Meter("requests", 0.9f, 0.1f);
        urlfetchWaitingMeter = new Meter("urlfetch_waiting", 0.9f, 0.1f);
        urlfetchReadingMeter = new Meter("urlfetch_reading", 0.9f, 0.1f);
        try {
            Timer timer = new Timer();
            timer.scheduleAtFixedRate(this, period, period); 
        } catch (java.security.AccessControlException e) {
            // pass, we're on AppEngine
        }
    }
    
    @Override
    public void run() {
        try {
            requestsMeter.update();
            urlfetchWaitingMeter.update();
            urlfetchReadingMeter.update();
            synchronized(appMeters) {
                for (Meter meter : appMeters.values()) {
                    meter.update();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    public void collectRequestTime(String app, long startTime, long endTime) {
        Meter meter = null;
        if (!appMeters.containsKey(app)) {
            meter = new Meter(app + "_meter", 0.9f, 0.1f);
            synchronized(appMeters) {
                appMeters.put(app, meter);
            }
        } else {
            meter = appMeters.get(app);
        }
        
        meter.collectCost(startTime - endTime);
    }
    
    public void collectRequestTime(long startTime, long endTime) {
        requestsMeter.collectCost(endTime - startTime);
    }

    public void collectUrlfetchTime(long startTime, long firstByteTime, long endTime) {
        urlfetchWaitingMeter.collectCost(firstByteTime - startTime);
        urlfetchReadingMeter.collectCost(endTime - firstByteTime);
    }
    
    public float getAppRate(String app) {
        if (appMeters.containsKey(app)) {
            return appMeters.get(app).getRate();
        } else {
            return 0.0f;
        }
    }

    public float getAppAverageRequestTime(String app) {
        if (appMeters.containsKey(app)) {
            return appMeters.get(app).getCost();
        } else {
            return 0.0f;
        }
    }
    
    public float getAverageRequestTime() {
        return requestsMeter.getCost();
    }
        
    public float getCurrentRequestsPerSecond() {
        return requestsMeter.getRate();
    }

    public float getAverageUrlfetchsPerSecond() {
        return urlfetchWaitingMeter.getRate(); 
    }
    
    public float getAverageUrlfetchWaitingTime() {
        return urlfetchWaitingMeter.getCost(); 
    }
    
    public float getAverageUrlfetchReadingTime() {
        return urlfetchReadingMeter.getCost(); 
    }
    
}
