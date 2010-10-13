package com.google.util.DOM;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import org.apache.xerces.dom.ElementImpl;
import org.apache.xerces.parsers.DOMParser;
import org.apache.xerces.xni.Augmentations;
import org.apache.xerces.xni.NamespaceContext;
import org.apache.xerces.xni.QName;
import org.apache.xerces.xni.XMLAttributes;
import org.apache.xerces.xni.XMLLocator;
import org.apache.xerces.xni.XMLString;
import org.apache.xerces.xni.XNIException;
import org.apache.xerces.xni.parser.XMLParserConfiguration;
import org.w3c.dom.Attr;
import org.w3c.dom.Node;
import org.xml.sax.EntityResolver;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.SAXNotRecognizedException;
import org.xml.sax.SAXNotSupportedException;

public class LineCountingXMLParser extends DOMParser implements EntityResolver {

    //Logger logger = Logger.getLogger("parser");
    
    private XMLLocator _locator;

    public LineCountingXMLParser(XMLParserConfiguration config) throws SAXNotRecognizedException, SAXNotSupportedException {
        super(config);
    }

    public LineCountingXMLParser() throws SAXNotRecognizedException, SAXNotSupportedException {
        super();

        this.setFeature("http://apache.org/xml/features/dom/defer-node-expansion", false);
        this.setFeature("http://apache.org/xml/features/nonvalidating/load-dtd-grammar", false);
        this.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        this.setFeature("http://xml.org/sax/features/namespaces", false);
        this.setFeature("http://apache.org/xml/features/create-cdata-nodes", false);
        
        this.setEntityResolver(this);
    }

    public InputSource resolveEntity(String publicId, String systemId) throws SAXException, IOException {
        // ACRE-1056 - make sure that users can't use XML entity resolution to 
        //             read files from disk
        return new InputSource(new ByteArrayInputStream(new byte[0]));
    }

    public void startDocument(XMLLocator locator, String encoding, NamespaceContext namespaceContext, Augmentations augs) throws XNIException {
        //if (logger.isTraceEnabled()) logger.trace("> DOC [" + encoding + "]");
        super.startDocument(locator, encoding, namespaceContext, augs);
        this._locator = locator;
        getLineNumber(this._locator);
    }

    public void processingInstruction(String target, XMLString data, Augmentations augs) throws XNIException {
        //if (logger.isTraceEnabled()) logger.trace("PI: " + target + " [" + data + " ]");
        super.processingInstruction(target, data, augs);
    }
    
    public void doctypeDecl(String rootElement, String publicId, String systemId, Augmentations augs) throws XNIException {
        //if (logger.isTraceEnabled()) logger.trace("DOCTYPE: " + rootElement + " [" + publicId + " | " + systemId + "]");
        super.doctypeDecl(rootElement, publicId, systemId, augs);
        getLineNumber(this._locator);
    }
    
    public void comment (XMLString text, Augmentations augs) throws XNIException {
        //if (logger.isTraceEnabled()) logger.trace("comment: " + text);
        super.comment(text, augs);
    }
    
    public void startElement(QName element, XMLAttributes attrList, Augmentations augs) throws XNIException {
//        if (logger.isTraceEnabled()) {
//            StringBuffer b = new StringBuffer(" ");
//            for (int i = 0; i < attrList.getLength(); i++) {
//                b.append(attrList.getQName(i));
//                b.append("=\"");
//                b.append(attrList.getValue(i));
//                if (i < attrList.getLength()) b.append("\" ");
//            }
//            logger.trace("> <" + element.rawname + b.toString() + ">");
//        }
        
        // first, call the DOM constructor and build the element
        super.startElement(element, attrList, augs);

        // next, get a hold of that element
        ElementImpl e = (ElementImpl) fCurrentNode;
        
        // look into the attributes to see if there is something
        // that looks like an ID and, if so, tell the element
        // to consider it as such.
        QName attrQName = new QName();
        int attrCount = attrList.getLength();
        for (int i = 0; i < attrCount; i++) {
            attrList.getName(i, attrQName);
            if ("id".equals(attrQName.rawname.toLowerCase())) {
                Attr a = e.getAttributeNode(attrQName.localpart);
                e.setIdAttributeNode(a, true);
            }
        }

        // finally, set the line number 
        getLineNumber(this._locator);
    }
    
    public void emptyElement(QName element, XMLAttributes attributes, Augmentations augs) throws XNIException {
        //if (logger.isTraceEnabled()) logger.trace("  <" + element.rawname + "/>");
        super.emptyElement(element, attributes, augs);
    }
   
    public void characters(XMLString text, Augmentations augs) throws XNIException {
//        if (logger.isTraceEnabled()) {
//            String t = text.toString().trim();
//            if (t.length() > 0) {
//                logger.trace(t);
//            }
//        }
        super.characters(text, augs);
    }
    
    public void endElement(QName element, Augmentations augs) throws XNIException {
        //if (logger.isTraceEnabled()) logger.trace("< </" + element.rawname + ">");
        super.endElement(element, augs);
    }
    
    public void endDocument (Augmentations augs) throws XNIException {
        //if (logger.isTraceEnabled()) logger.trace("< DOC");
        super.endDocument(augs);
    }
    
    // -----------------------------------------------------------------------------------------
    
    private void getLineNumber(XMLLocator locator) {
        Node node = null;

        try {
            node = (Node) this.getProperty("http://apache.org/xml/properties/dom/current-element-node");
        } catch (org.xml.sax.SAXException e) {
            // we're ignoring this exception because the null check will take care of it for us
        }
        
        if (node != null) {
            node.setUserData("lineNumber", String.valueOf(locator.getLineNumber()), null);
        }
    }    
}
