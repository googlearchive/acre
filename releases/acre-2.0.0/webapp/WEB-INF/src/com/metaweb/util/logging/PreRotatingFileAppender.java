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


package com.metaweb.util.logging;

import java.io.IOException;
import java.lang.reflect.Field;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.TimeZone;

import org.apache.log4j.FileAppender;
import org.apache.log4j.helpers.LogLog;
import org.apache.log4j.spi.LoggingEvent;

/**
 * A specialized file appender that appends log messages to file that is
 * pre-rotated, that is, rotation happens before the logging is done. 
 *
 * For every event that is logged the appender checks to see if the current 
 * time is greater than the desired rollover time. If so it will roll over the
 * logfile and start a new one. The rollover time calculated is <b>not the 
 * exact sum</b> of the current time and the interval. The time is <b> rounded
 * up</b> to the next time unit. So an event logged at 12:01 pm will be logged
 * to a file with the suffix with 12:00 pm for the day and date specified. This
 * mainly prevents the slew of renaming or at least one renaming associated with
 * most log rotation schemes. Ideally a link should be created to point to the
 * latest log file, however that would have to shelled out and would not be
 * platform independent so has not been implemented.
 *
 * @author Aseem Mohanty, Metaweb Technologies Inc.
 * @author Yuriy Grinberg, Metaweb Technologies Inc.
 */ 
public class PreRotatingFileAppender extends FileAppender {

    /* Pre-defined variables for the more commonly used intervals */
    public static final long ON_THE_MIN  = getUTCInterval(Calendar.MINUTE, 1); 
    public static final long ON_THE_HOUR = getUTCInterval(Calendar.HOUR, 1);
    public static final long ON_THE_DAY  = getUTCInterval(Calendar.DATE, 1);

    private String _filePrefix = "log";
    private int  _calUnit = -1;
    private int  _increment = 1;
    private long _interval = 3600000;
    private long _rolloverAt = 0;
    private SimpleDateFormat _dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH_mm_ss'Z'");
    
    /**
     * Setup the time to rollover and fire up the log file.
     */
    public void activateOptions() {
        super.activateOptions();
        _rolloverAt = getNextRolloverTime(_interval);
        setupLogfileName();
    }

    /**
     * Overriden FileAppender method to check if it is time for rolling over and
     * executing the actual file rollover if needed.
     */
    protected void subAppend(LoggingEvent event) {
        long currentTime = (new GregorianCalendar(TimeZone.getTimeZone("GMT"))).getTime().getTime();
        if (currentTime >= _rolloverAt) {
            setupLogfileName();
            _rolloverAt = getNextRolloverTime(_interval);
        }
        super.subAppend(event);
    }

    /**
     * Generates the filename for the next log file and calls FileAppender's
     * setFile method to close previous file and open new file with the
     * generated filename
     */
    private void setupLogfileName() {
        try {
            String fn = getLogfileName(_filePrefix, _interval, _dateFormat);
            setFile(fn, false, this.bufferedIO, this.bufferSize);
        } catch (IOException ex) {
            LogLog.error("Setting up log filename failed.", ex);
        }
    }

    /* Helper methods used by the appender to calculate various entities */

    /**
     * Get the current interval in GMT time. The GregorianCalendar madness is
     * purely because of the insanity of the java date mechanism.
     * @param calUnit Calendar property for time
     * @param increment log rotation increment
     * @return log rotation interval
     */
    private static long getUTCInterval(int calUnit, int increment) {
        GregorianCalendar cal = new GregorianCalendar(TimeZone.getTimeZone("GMT"));
        cal.setTimeInMillis(0);
        cal.roll(calUnit, increment);
        return cal.getTime().getTime();
    }

    /**
     * Helper method for calculating the next rollover time. This <b>does
     * not</b> calculate the exact rollover time, instead it rounds up to the
     * next hour or minute closes to the current time plus the rotation
     * interval.
     * @param interval log rotation interval
     * @return the time in ms since epoch at which the logfile will be rolled
     *         over.
     */
    private static long getNextRolloverTime(long interval) {
        long currentTime = (new GregorianCalendar(TimeZone.getTimeZone("GMT"))).getTime().getTime();
        return currentTime + (interval - (currentTime % interval));
    }
    
    /**
     * Helper method to generate a logfile name given the prefix and suffix
     * format.
     * @param filePrefix logfile prefix
     * @param interval log rotation interval
     * @param fmt Dateformat to generate timstamped suffix for logfile
     * @return The filename to use for the logfile
     */
    private static String getLogfileName(String filePrefix, long interval, 
        SimpleDateFormat fmt) {
        long time = (new GregorianCalendar(TimeZone.getTimeZone("GMT"))).getTime().getTime();
        time -= (time % interval);
        return filePrefix + "." + fmt.format(new Date(time));
    }

    /** Accessors and Mutators */
    
    /**
     * Allow for PropertyConfigurator to send in classpath to
     * Calendar variable and convert that into the right value for this.
     */
    public void setCalUnit(String calUnitVarName) {
        if (_calUnit < 0) {
            _calUnit = Calendar.HOUR;
        }
        // total java madness
        int pos = calUnitVarName.lastIndexOf('.');
        if (pos > 0) {
            String fldName = calUnitVarName.substring(pos + 1, calUnitVarName.length());
            try {
                
                Field[] flds = Class.forName("java.util.Calendar").getDeclaredFields();
                for (int i=0; i<flds.length; ++i) {
                    Field fld = flds[i];
                    if (fldName.equals(fld.getName())) {
                        _calUnit = fld.getInt(null);
                    }
                }
            
            // swallow everything - bad, bad, bad boy!!                
            } catch (ClassNotFoundException ex) { 
                LogLog.warn("Class not found, using default calUnit", ex);    
            } catch (SecurityException ex) {
                LogLog.warn("Field not accessible, using default calUnit", ex);    
            } catch (IllegalArgumentException ex) {
                LogLog.warn("Bad argument for field name, using default calUnit", ex);    
            } catch (IllegalAccessException ex) {
                LogLog.warn("Field not accessible, using default calUnit", ex);    
            }
        }
        _interval = getUTCInterval(_calUnit, _increment);
    }

    /**
     * Set the increment unit for this appender. This field together with the
     * calendar unit determines the periodicity of the rollover.
     * @param increment The increment from the baseline time at which to rotate
     *                  the logfile
     */
    public void setIncrement(int increment) {
        _increment = increment;
        if (_calUnit < 0) {
            LogLog.warn("calUnit not yet initialized, using default");
            _calUnit = Calendar.HOUR;
        }
        _interval = getUTCInterval(_calUnit, _increment);
    }

    /**
     * Set the date format for this appender. This determines the filename
     * suffix that the resulting logfile will have. The format string must
     * conform to the one allowed by {@link SimpleDateFormat}.
     * @param dateFormat The pattern string used to generate the suffix for the
     *                   logfile
     */
    public void setDateFormat(String dateFormat) {
        _dateFormat = new SimpleDateFormat(dateFormat);
    }
  
    /**
     * Set the file prefix for the log file for this appender. This merely sets
     * up the file prefix and does not setup or create the log file, that will
     * either be done in activateOptions or during rollover of the log file. Do
     * <b>not</b> use setFile with this appender as that is done internally.
     * @param filePrefix String value to set the prefix of the logfile to
     */
    public void setFilePrefix(String filePrefix) {
        _filePrefix = filePrefix.trim();
    }

    /**
     * Get the calendar unit for this appender. The returned values if one of
     * the valid member fields of the {@link Calendar} class
     * @return the integer value of calendar unit used to setup rollover units
     */
    public String getCalUnit() {
        return _calUnit + "";
    }

    /**
     * Get the increment unit for this appender.
     * @return Increment at which rollover happens from the start time
     */
    public int getIncrement() {
        return _increment;
    }

    /**
     * Get the pattern used by the date formatter. The returned string is a
     * valid format string as used by the {@link SimpleDateFormat} class to
     * format a Date object.
     * @return The date format pattern string used to genereate the log file
     *         suffix
     */
    public String getDateFormat() {
        return _dateFormat.toPattern();
    }

    /**
     * Get the prefix for the log file which will be appended to.
     * @return The prefix of the logfile name or <code>log</code>
     */
    public String getFilePrefix() {
        return _filePrefix;
    }
}
