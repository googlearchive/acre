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


package com.google.util;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;

/**
 * Class to statically generate TIDs. Based on the python
 * tid.py:generate_transaction_id.
 */
public final class TIDGenerator {

    // ISO 8601 format (mostly)
    private final static SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
    private final static int MAX_TID_VALUE = 1000;
    private static int _tidSeqNo = 0;
    
    private static String HOST_NAME;
    
    static {
        try {
            HOST_NAME = InetAddress.getLocalHost().getCanonicalHostName();
        } catch (UnknownHostException ex) {
            HOST_NAME = "localhost";
        } catch (java.lang.NoClassDefFoundError e) {
            HOST_NAME = "app_engine";
        }
    }

    /**
     * Static method to get the short hostname of the server on which we 
     * are running with the option of shortening the hostname. 
     *
     * Shortening merely clips of the domain name and TLD.
     * XXX: Assumes that hostname is of the forms subdomain.domain.tld
     *
     * @return the hostname
     */
    public static String getShortHostname() {
        StringBuffer sb = new StringBuffer();
        ArrayList<String> parts = new ArrayList<String>(Arrays.asList(HOST_NAME.split("\\."))); 
        if (parts.size() > 3) { // Oops! only domain name and tld
            sb.append(parts.get(0));
            for (int i = 1; i < parts.size()-2; ++i) {
                sb.append("." + parts.get(i));
            }
        } else {
            sb.append(HOST_NAME);
        }
        return sb.toString();
    }

    /**
     * Static method to generate a transaction id as expected by the log
     * aggregator system.
     * 
     * @param threadId processing thread id
     * @return the generated transaction id
     */
    public static String generateTID(long threadId, String service) {
        synchronized (HOST_NAME) {
            _tidSeqNo = (++_tidSeqNo >= MAX_TID_VALUE) ? 0 : _tidSeqNo;
        }
        StringBuffer sb = new StringBuffer();
        sb.append(service);
        sb.append(';');
        sb.append(HOST_NAME);
        sb.append(';');
        sb.append(DATE_FORMAT.format(new Date()));
        sb.append(';');
        sb.append(threadId);
        sb.append(';');
        sb.append(_tidSeqNo);
        return sb.toString();
    }

}
