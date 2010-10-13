package com.google.util.DOM;

import org.xml.sax.SAXNotRecognizedException;
import org.xml.sax.SAXNotSupportedException;

public class LineCountingHTMLParser extends LineCountingXMLParser {

    public LineCountingHTMLParser() throws SAXNotRecognizedException, SAXNotSupportedException {

        super(new AcreHTMLConfiguration());
        
        //this.setProperty("http://apache.org/xml/properties/dom/document-class-name", "org.apache.html.dom.HTMLDocumentImpl");
        this.setProperty("http://cyberneko.org/html/properties/names/elems", "lower");
      
        this.setFeature("http://xml.org/sax/features/namespaces", false);
        
        this.setFeature("http://apache.org/xml/features/include-comments", true);
        this.setFeature("http://apache.org/xml/features/create-cdata-nodes", false);
        this.setFeature("http://apache.org/xml/features/dom/defer-node-expansion", false);
        this.setFeature("http://apache.org/xml/features/scanner/notify-builtin-refs", false);

        this.setFeature("http://cyberneko.org/html/features/document-fragment", true);
        this.setFeature("http://cyberneko.org/html/features/insert-doctype", true);
        this.setFeature("http://cyberneko.org/html/features/scanner/cdata-sections", true);
        this.setFeature("http://cyberneko.org/html/features/scanner/notify-builtin-refs", false);
        this.setFeature("http://cyberneko.org/html/features/balance-tags", true);
        this.setFeature("http://cyberneko.org/html/features/balance-tags/document-fragment", true);
    }

 }
