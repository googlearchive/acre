package com.google.acre.DOM;

import org.apache.xerces.xni.Augmentations;
import org.apache.xerces.xni.NamespaceContext;
import org.apache.xerces.xni.QName;
import org.apache.xerces.xni.XMLAttributes;
import org.apache.xerces.xni.XMLLocator;
import org.apache.xerces.xni.XNIException;
import org.apache.xerces.xni.parser.XMLParseException;
import org.cyberneko.html.HTMLElements;
import org.cyberneko.html.HTMLTagBalancer;

public class AcreTagBalancer extends HTMLTagBalancer {

    private XMLLocator _locator;
    
    public void startDocument(XMLLocator locator, String encoding, NamespaceContext nscontext, Augmentations augs) throws XNIException {
        this._locator = locator;
        super.startDocument(locator, encoding, nscontext, augs);
    } // startDocument(XMLLocator,String,Augmentations)
    
    public void startElement(final QName elem, XMLAttributes attrs, final Augmentations augs) throws XNIException {
        
        fSeenAnything = true;
        
        // get element information
        HTMLElements.Element element = getElement(elem.rawname);

        if (element.code == HTMLElements.FORM) {
            if (fOpenedForm) {
                return;
            }
            fOpenedForm = true;
        }

        // if block element, save immediate parent inline elements
        int depth = 0;
        if (element.flags == 0) {
            int length = fElementStack.top;
            fInlineStack.top = 0;
            for (int i = length - 1; i >= 0; i--) {
                Info info = fElementStack.data[i];
                if (!info.element.isInline()) {
                    break;
                }
                fInlineStack.push(info);
                endElement(info.qname, synthesizedAugs());
            }
            depth = fInlineStack.top;
        }
        
        if (element.closes != null) {
            int length = fElementStack.top;
            for (int i = length - 1; i >= 0; i--) {
                Info info = fElementStack.data[i];

                // does it close the element we're looking at?
                if (element.closes(info.element.code)) {
                    if (fReportErrors) {
                        String ename = elem.rawname;
                        String iname = info.qname.rawname;
                        fErrorReporter.reportWarning("HTML2005", new Object[]{ename,iname});
                    }
                    for (int j = length - 1; j >= i; j--) {
                        info = fElementStack.pop();
                        if (fDocumentHandler != null) {
                            callEndElement(info.qname, synthesizedAugs());
                        }
                    }
                    length = i;
                    continue;
                }
                
                // should we stop searching?
                boolean container = info.element.isContainer();
                boolean parent = false;
                if (!container) {
                    for (int j = 0; j < element.parent.length; j++) {
                        parent = parent || info.element.code == element.parent[j].code;
                    }
                }
                if (container || parent) {
                    break;
                }
            }
        }
        // TODO: investigate if only table is special here
        // table closes all opened inline elements
        else if (element.code == HTMLElements.TABLE) {
            for (int i=fElementStack.top-1; i >= 0; i--) {
                final Info info = fElementStack.data[i];
                if (!info.element.isInline()) {
                    break;
                }
                endElement(info.qname, synthesizedAugs());
            }
        }

        // call handler
        fSeenRootElement = true;
        if (element.isEmpty()) {
            if (attrs == null) {
                attrs = emptyAttributes();
            }
            if (fDocumentHandler != null) {
                fDocumentHandler.emptyElement(elem, attrs, augs);
            }
        } else {
            boolean inline = element.isInline();
            fElementStack.push(new Info(element, elem, inline ? attrs : null));
            if (attrs == null) {
                attrs = emptyAttributes();
            }
            if (fDocumentHandler != null) {
                callStartElement(elem, attrs, augs);
            }
        }

        // re-open inline elements
        for (int i = 0; i < depth; i++) {
            Info info = fInlineStack.pop();
            startElement(info.qname, info.attributes, synthesizedAugs());
        }

    } // startElement(QName,XMLAttributes,Augmentations)
    
    public void doctypeDecl(String rootElementName, String publicId, String systemId, Augmentations augs) throws XNIException {
        if (fDocumentHandler != null) {
            fDocumentHandler.doctypeDecl(rootElementName, publicId, systemId, augs);
        }
    } // doctypeDecl(String,String,String,Augmentations)
        
    public void endDocument(Augmentations augs) throws XNIException {

        int length = fElementStack.top;
        for (int i = 0; i < length; i++) {
            Info info = fElementStack.pop();
            if (!info.qname.rawname.startsWith("acre:")) {
                if (fDocumentHandler != null) {
                    callEndElement(info.qname, synthesizedAugs());
                }
            } else {
                throw new XMLParseException(_locator, "missing &lt;/" + info.qname.rawname + "&gt;");
            }
        }

        if (fDocumentHandler != null) {
            fDocumentHandler.endDocument(augs);
        }

    } // endDocument(Augmentations)
    
}
