package com.google.acre.logging;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.logging.LogRecord;

public class SimpleFormatter extends java.util.logging.SimpleFormatter {
    
    private SimpleDateFormat s;

    public SimpleFormatter(){
        super();
        this.s = new SimpleDateFormat("MM-dd-yyyy HH:mm:ss");
    }
    
    public String format(LogRecord r){
        StringBuffer sb = new StringBuffer(s.format(new Date(r.getMillis())));sb.append(":");
        sb.append(r.getLevel().toString()); sb.append(" ");
        sb.append(r.getSourceClassName()); sb.append(".");
        sb.append(r.getSourceMethodName()); sb.append("():");
        sb.append(r.getMessage()); sb.append("\n");
        return sb.toString();
    }
}