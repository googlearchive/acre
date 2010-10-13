package com.google.util.DOM;

/* 
 * Copyright 2002-2008 Andy Clark
 * Copyright 2008 Metaweb Technologies, Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import java.io.IOException;

import org.apache.xerces.xni.XNIException;
import org.apache.xerces.xni.parser.XMLConfigurationException;
import org.apache.xerces.xni.parser.XMLDocumentFilter;
import org.apache.xerces.xni.parser.XMLDocumentSource;
import org.apache.xerces.xni.parser.XMLInputSource;
import org.apache.xerces.xni.parser.XMLParseException;
import org.cyberneko.html.HTMLComponent;
import org.cyberneko.html.HTMLConfiguration;
import org.cyberneko.html.xercesbridge.XercesBridge;

public class AcreHTMLConfiguration extends HTMLConfiguration {

    AcreTagBalancer tagBalancer = new AcreTagBalancer();

    AcreHTMLScanner scanner = new AcreHTMLScanner();
    
    AcreErrorReporter errorReporter = new AcreErrorReporter();
    
    public class AcreErrorReporter extends ErrorReporter {

        /** Reports a warning. */
        public void reportWarning(String key, Object[] args) throws XMLParseException {
            if (fErrorHandler != null) {
                fErrorHandler.warning(ERROR_DOMAIN, key, createException(key, args));
            }
        } // reportWarning(String,Object[])

        /** Reports an error. */
        public void reportError(String key, Object[] args) throws XMLParseException {
            if (fErrorHandler != null) {
                fErrorHandler.error(ERROR_DOMAIN, key, createException(key, args));
            }
        } // reportError(String,Object[])

        /** Creates parse exception. */
        protected XMLParseException createException(String key, Object[] args) {
            String message = formatMessage(key, args);
            return new XMLParseException(scanner, message);
        } // createException(String,Object[]):XMLParseException
    }
    
    public AcreHTMLConfiguration() {
        super();
        
        // remove the default document scanner and add our own
        fHTMLComponents.remove(fDocumentScanner);
        fHTMLComponents.remove(fTagBalancer);
        addComponent(scanner);
        addComponent(tagBalancer);
        
        setProperty(ERROR_REPORTER, errorReporter);
    }

    /** 
     * Pushes an input source onto the current entity stack. This 
     * enables the scanner to transparently scan new content (e.g. 
     * the output written by an embedded script). At the end of the
     * current entity, the scanner returns where it left off at the
     * time this entity source was pushed.
     * <p>
     * <strong>Hint:</strong>
     * To use this feature to insert the output of &lt;SCRIPT&gt;
     * tags, remember to buffer the <em>entire</em> output of the
     * processed instructions before pushing a new input source.
     * Otherwise, events may appear out of sequence.
     *
     * @param inputSource The new input source to start scanning.
     * @see #evaluateInputSource(XMLInputSource)
     */
    public void pushInputSource(XMLInputSource inputSource) {
        scanner.pushInputSource(inputSource);
    } // pushInputSource(XMLInputSource)

    /**
     * <font color="red">EXPERIMENTAL: may change in next release</font><br/>
     * Immediately evaluates an input source and add the new content (e.g. 
     * the output written by an embedded script).
     *
     * @param inputSource The new input source to start scanning.
     * @see #pushInputSource(XMLInputSource)
     */
    public void evaluateInputSource(XMLInputSource inputSource) {
        scanner.evaluateInputSource(inputSource);
    } // evaluateInputSource(XMLInputSource)
    
    /** Parses a document. */
    public void parse(XMLInputSource source) throws XNIException, IOException {
        setInputSource(source);
        parse(true);
    } // parse(XMLInputSource)

    /**
     * Sets the input source for the document to parse.
     *
     * @param inputSource The document's input source.
     *
     * @exception XMLConfigurationException Thrown if there is a 
     *                        configuration error when initializing the
     *                        parser.
     * @exception IOException Thrown on I/O error.
     *
     * @see #parse(boolean)
     */
    public void setInputSource(XMLInputSource inputSource) throws XMLConfigurationException, IOException {
        reset();
        fCloseStream = inputSource.getByteStream() == null && inputSource.getCharacterStream() == null;
        scanner.setInputSource(inputSource);
    } // setInputSource(XMLInputSource)
    
    /**
     * Parses the document in a pull parsing fashion.
     *
     * @param complete True if the pull parser should parse the
     *                 remaining document completely.
     *
     * @return True if there is more document to parse.
     *
     * @exception XNIException Any XNI exception, possibly wrapping 
     *                         another exception.
     * @exception IOException  An IO exception from the parser, possibly
     *                         from a byte stream or character stream
     *                         supplied by the parser.
     *
     * @see #setInputSource
     */
    public boolean parse(boolean complete) throws XNIException, IOException {
        try {
            boolean more = scanner.scanDocument(complete);
            if (!more) {
                cleanup();
            }
            return more;
        } catch (XNIException e) {
            cleanup();
            throw e;
        } catch (IOException e) {
            cleanup();
            throw e;
        }
    } // parse(boolean):boolean    
    
    /**
     * If the application decides to terminate parsing before the xml document
     * is fully parsed, the application should call this method to free any
     * resource allocated during parsing. For example, close all opened streams.
     */
    public void cleanup() {
        scanner.cleanup(fCloseStream);
    } // cleanup()

    /** Resets the parser configuration. */
    protected void reset() throws XMLConfigurationException {

        // reset components
        int size = fHTMLComponents.size();
        for (int i = 0; i < size; i++) {
            HTMLComponent component = (HTMLComponent) fHTMLComponents.elementAt(i);
            component.reset(this);
        }

        // configure pipeline
        XMLDocumentSource lastSource = scanner;
        if (getFeature(BALANCE_TAGS)) {
            lastSource.setDocumentHandler(tagBalancer);
            tagBalancer.setDocumentSource(scanner);
            lastSource = tagBalancer;
        }
        if (getFeature(NAMESPACES)) {
            lastSource.setDocumentHandler(fNamespaceBinder);
            fNamespaceBinder.setDocumentSource(fTagBalancer);
            lastSource = fNamespaceBinder;
        }
        XMLDocumentFilter[] filters = (XMLDocumentFilter[]) getProperty(FILTERS);
        if (filters != null) {
            for (int i = 0; i < filters.length; i++) {
                XMLDocumentFilter filter = filters[i];
                XercesBridge.getInstance().XMLDocumentFilter_setDocumentSource(filter, lastSource);
                lastSource.setDocumentHandler(filter);
                lastSource = filter;
            }
        }
        lastSource.setDocumentHandler(fDocumentHandler);

    } // reset()
    
}
