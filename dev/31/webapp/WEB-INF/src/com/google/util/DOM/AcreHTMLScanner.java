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

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UnsupportedEncodingException;
import java.net.URL;

import org.apache.xerces.util.EncodingMap;
import org.apache.xerces.util.NamespaceSupport;
import org.apache.xerces.util.XMLStringBuffer;
import org.apache.xerces.xni.Augmentations;
import org.apache.xerces.xni.NamespaceContext;
import org.apache.xerces.xni.QName;
import org.apache.xerces.xni.XMLDocumentHandler;
import org.apache.xerces.xni.XMLLocator;
import org.apache.xerces.xni.XNIException;
import org.apache.xerces.xni.parser.XMLInputSource;
import org.cyberneko.html.HTMLElements;
import org.cyberneko.html.HTMLScanner;
import org.cyberneko.html.xercesbridge.XercesBridge;

public class AcreHTMLScanner extends HTMLScanner {

    /** Sets the document handler. */
    public void setDocumentHandler(XMLDocumentHandler handler) {
        super.setDocumentHandler(handler);
        fDocumentHandler = handler;
    } // setDocumentHandler(XMLDocumentHandler)
    
    /** Returns the document handler. */
    public XMLDocumentHandler getDocumentHandler() {
        return fDocumentHandler;
    } // getDocumentHandler():XMLDocumentHandler
    
    /** Scans the document. */
    public boolean scanDocument(boolean complete) throws XNIException, IOException {
        do {
            if (!fScanner.scan(complete)) {
                return false;
            }
        } while (complete);
        return true;
    } // scanDocument(boolean):boolean
    
    /** Single boolean array. */
    private final boolean[] fSingleBoolean = { false };
    
    /** Content scanner. */
    protected Scanner acreContentScanner = new AcreContentScanner();

    public class AcreContentScanner extends ContentScanner {
                
        /** Scan. */
        public boolean scan(boolean complete) throws IOException {
            boolean next;
            do {
                try {
                    next = false;
                    switch (fScannerState) {
                        case STATE_CONTENT: {
                            fBeginLineNumber = fCurrentEntity.lineNumber;
                            fBeginColumnNumber = fCurrentEntity.columnNumber;
                            int c = read();
                            if (c == '<') {
                                setScannerState(STATE_MARKUP_BRACKET);
                                next = true;
                            } else if (c == '&') {
                                scanEntityRef(fStringBuffer, true);
                            } else if (c == -1) {
                                throw new EOFException();
                            } else {
                                fCurrentEntity.offset--;
                                fCurrentEntity.columnNumber--;
                                scanCharacters();
                            }
                            break;
                        }
                        case STATE_MARKUP_BRACKET: {
                            int c = read();
                            if (c == '!') {
                                if (skip("--", false)) {
                                    scanComment();
                                } else if (skip("[CDATA[", false)) {
                                    scanCDATA();
                                } else if (skip("DOCTYPE", false)) {
                                    scanDoctype();
                                } else {
                                    if (fReportErrors) {
                                        fErrorReporter.reportError("HTML1002", null);
                                    }
                                    skipMarkup(true);
                                }
                            } else if (c == '?') {
                                scanPI();
                            } else if (c == '/') {
                                scanEndElement();
                            } else if (c == -1) {
                                if (fReportErrors) {
                                    fErrorReporter.reportError("HTML1003", null);
                                }
                                if (fDocumentHandler != null && fElementCount >= fElementDepth) {
                                    fStringBuffer.clear();
                                    fStringBuffer.append('<');
                                    fDocumentHandler.characters(fStringBuffer, null);
                                }
                                throw new EOFException();
                            } else {
                                fCurrentEntity.offset--;
                                fCurrentEntity.columnNumber--;
                                fElementCount++;
                                fSingleBoolean[0] = false;
                                final String ename = scanStartElement(fSingleBoolean);
                                if (!fSingleBoolean[0]) {
                                    if ("script".equalsIgnoreCase(ename) || "acre:script".equalsIgnoreCase(ename)) {
                                        scanScriptContent();
                                    } else if (!fParseNoScriptContent && "noscript".equalsIgnoreCase(ename)) {
                                        scanNoScriptContent();
                                    } else if (ename != null && !fSingleBoolean[0] && HTMLElements.getElement(ename).isSpecial() && !"textarea".equalsIgnoreCase(ename) && (!"title".equalsIgnoreCase(ename) || isEnded(ename))) {
                                        setScanner(acreSpecialScanner.setElementName(ename));
                                        setScannerState(STATE_CONTENT);
                                        return true;
                                    }
                                }
                            }
                            setScannerState(STATE_CONTENT);
                            break;
                        }
                        case STATE_START_DOCUMENT: {
                            if (fDocumentHandler != null && fElementCount >= fElementDepth) {
                                XMLLocator locator = AcreHTMLScanner.this;
                                String encoding = fIANAEncoding;
                                Augmentations augs = locationAugs();
                                NamespaceContext nscontext = new NamespaceSupport();
                                XercesBridge.getInstance().XMLDocumentHandler_startDocument(fDocumentHandler, locator, encoding, nscontext, augs);
                            }
                            if (fInsertDoctype && fDocumentHandler != null) {
                                String root = HTMLElements.getElement(HTMLElements.HTML).name;
                                root = modifyName(root, fNamesElems);
                                String pubid = fDoctypePubid;
                                String sysid = fDoctypeSysid;
                                fDocumentHandler.doctypeDecl(root, pubid, sysid, synthesizedAugs());
                            }
                            setScannerState(STATE_CONTENT);
                            break;
                        }
                        case STATE_END_DOCUMENT: {
                            if (fDocumentHandler != null && fElementCount >= fElementDepth && complete) {
                                fEndLineNumber = fCurrentEntity.lineNumber;
                                fEndColumnNumber = fCurrentEntity.columnNumber;
                                fDocumentHandler.endDocument(locationAugs());
                            }
                            return false;
                        }
                        default: {
                            throw new RuntimeException("unknown scanner state: " + fScannerState);
                        }
                    }
                } catch (EOFException e) {
                    if (fCurrentEntityStack.empty()) {
                        setScannerState(STATE_END_DOCUMENT);
                    } else {
                        fCurrentEntity = (CurrentEntity) fCurrentEntityStack.pop();
                    }
                    next = true;
                }
            } while (next || complete);
            
            return true;
        } // scan(boolean):boolean
        
        /**
         * Scans the content of <noscript>: it doesn't get parsed but is
         * considered as plain text when feature
         * {@link HTMLScanner#PARSE_NOSCRIPT_CONTENT} is set to false.
         * 
         * @throws IOException
         */
        private void scanNoScriptContent() throws IOException {
            final XMLStringBuffer buffer = new XMLStringBuffer();

            while (true) {
                int c = read();
                if (c == -1) {
                    break;
                }
                if (c == '<') {
                    final String next = nextContent(10) + " ";
                    if (next.length() >= 10 && "/noscript".equalsIgnoreCase(next.substring(0, 9))
                            && ('>' == next.charAt(9) || Character.isWhitespace(next.charAt(9)))) {
                        fCurrentEntity.offset--;
                        fCurrentEntity.columnNumber--;
                        break;
                    }
                }
                if (c == '\r' || c == '\n') {
                    fCurrentEntity.offset--;
                    fCurrentEntity.columnNumber--;
                    int newlines = skipNewlines();
                    for (int i = 0; i < newlines; i++) {
                        buffer.append('\n');
                    }
                } else {
                    buffer.append((char) c);
                }
            }
            if (buffer.length > 0 && fDocumentHandler != null) {
                fEndLineNumber = fCurrentEntity.lineNumber;
                fEndColumnNumber = fCurrentEntity.columnNumber;
                fDocumentHandler.characters(buffer, locationAugs());
            }
        }

        private void scanScriptContent() throws IOException {
            final XMLStringBuffer buffer = new XMLStringBuffer(256);
            final XMLStringBuffer entityBuffer = new XMLStringBuffer(5);
            boolean waitForEndComment = false;
            while (true) {
                int c = read();
                if (c == -1) {
                    break;
                } else if (c == '-' && endsWith(buffer, "<!-")) {
                    waitForEndComment = endCommentAvailable();
                } else if (!waitForEndComment && c == '<') {
                    // look for </script>
                    String next = nextContent(8);
                    if (next.length() == 8 
                            && ("/script".equalsIgnoreCase(next.substring(0, 7)))
                            && ('>' == next.charAt(7) || Character.isWhitespace(next.charAt(7)))) {
                        fCurrentEntity.offset--;
                        fCurrentEntity.columnNumber--;
                        break;
                    }

                    // look for </acre:script>
                    next = nextContent(13);
                    if (next.length() == 13 
                            && ("/acre:script".equalsIgnoreCase(next.substring(0, 12)))
                            && ('>' == next.charAt(12) || Character.isWhitespace(next.charAt(12)))) {
                        fCurrentEntity.offset--;
                        fCurrentEntity.columnNumber--;
                        break;
                    }
                } else if (c == '>' && endsWith(buffer, "--")) {
                    waitForEndComment = false;
                }

                if (c == '\r' || c == '\n') {
                    fCurrentEntity.offset--;
                    fCurrentEntity.columnNumber--;
                    int newlines = skipNewlines();
                    for (int i = 0; i < newlines; i++) {
                        buffer.append('\n');
                    }
                } else if (c == '&') {
                    int e = scanEntityRef(entityBuffer, false);
                    if (e != -1) {
                        buffer.append((char) e);
                    } else {
                        buffer.append(entityBuffer);
                    }
                } else {
                    buffer.append((char) c);
                }
            }

            if (fScriptStripCommentDelims) {
                reduceToContent(buffer, "<!--", "-->");
            } else {
                reduceToContent(buffer, "<![CDATA[", "]]>");
            }

            if (buffer.length > 0 && fDocumentHandler != null && fElementCount >= fElementDepth) {
                fEndLineNumber = fCurrentEntity.lineNumber;
                fEndColumnNumber = fCurrentEntity.columnNumber;
                fDocumentHandler.characters(buffer, locationAugs());
            }
        }

        /**
         * Reads the next characters WITHOUT impacting the buffer content up to
         * current offset.
         * 
         * @param len
         *            the number of characters to read
         * @return the read string (length may be smaller if EOF is encountered)
         */
        private String nextContent(int len) throws IOException {
            final int originalOffset = fCurrentEntity.offset;
            final int originalColumnNumber = fCurrentEntity.columnNumber;

            char[] buff = new char[len];
            int nbRead = 0;
            for (nbRead = 0; nbRead < len; ++nbRead) {
                // read() should not clear the buffer
                if (fCurrentEntity.offset == fCurrentEntity.length) {
                    if (fCurrentEntity.length == fCurrentEntity.buffer.length) {
                        load(fCurrentEntity.buffer.length);
                    } else { // everything was already loaded
                        break;
                    }
                }

                int c = read();
                if (c == -1) {
                    break;
                } else {
                    buff[nbRead] = (char) c;
                }
            }
            fCurrentEntity.offset = originalOffset;
            fCurrentEntity.columnNumber = originalColumnNumber;
            return new String(buff, 0, nbRead);
        }

        /**
         * Returns true if the given element has an end-tag.
         */
        private boolean isEnded(String ename) {
            String content = new String(fCurrentEntity.buffer, fCurrentEntity.offset, fCurrentEntity.length - fCurrentEntity.offset);
            return content.toLowerCase().indexOf("</" + ename.toLowerCase() + ">") != -1;
        }

    }

    /**
     * Special scanner used for elements whose content needs to be scanned as
     * plain text, ignoring markup such as elements and entity references. For
     * example: &lt;SCRIPT&gt; and &lt;COMMENT&gt;.
     */
    protected AcreSpecialScanner acreSpecialScanner = new AcreSpecialScanner();

    public class AcreSpecialScanner extends SpecialScanner {

        /** A qualified name. */
        private final QName fQName = new QName();

        /** Sets the element name. */
        public Scanner setElementName(String ename) {
            fElementName = ename;
            fStyle = fElementName.equalsIgnoreCase("STYLE");
            fTextarea = fElementName.equalsIgnoreCase("TEXTAREA");
            fTitle = fElementName.equalsIgnoreCase("TITLE");
            return this;
        } // setElementName(String):Scanner
        
        /** Scan. */
        public boolean scan(boolean complete) throws IOException {
            boolean next;
            do {
                try {
                    next = false;
                    switch (fScannerState) {
                    case STATE_CONTENT: {
                        fBeginLineNumber = fCurrentEntity.lineNumber;
                        fBeginColumnNumber = fCurrentEntity.columnNumber;
                        int c = read();
                        if (c == '<') {
                            setScannerState(STATE_MARKUP_BRACKET);
                            continue;
                        }
                        if (c == '&') {
                            if (fTextarea || fTitle) {
                                scanEntityRef(fStringBuffer, true);
                                continue;
                            }
                            fStringBuffer.clear();
                            fStringBuffer.append('&');
                        } else if (c == -1) {
                            if (fReportErrors) {
                                fErrorReporter.reportError("HTML1007", null);
                            }
                            throw new EOFException();
                        } else {
                            fCurrentEntity.offset--;
                            fCurrentEntity.columnNumber--;
                            fStringBuffer.clear();
                        }
                        scanCharacters(fStringBuffer, -1);
                        break;
                    } // case STATE_CONTENT
                    case STATE_MARKUP_BRACKET: {
                        int delimiter = -1;
                        int c = read();
                        if (c == '!') {
                            if (skip("--", false)) {
                                fStringBuffer.clear();
                                boolean strip = (fStyle && fStyleStripCommentDelims);
                                if (strip) {
                                    do {
                                        c = read();
                                        if (c == '\r' || c == '\n') {
                                            fCurrentEntity.columnNumber--;
                                            fCurrentEntity.offset--;
                                            break;
                                        }
                                    } while (c != -1);
                                    skipNewlines(1);
                                    delimiter = '-';
                                } else {
                                    fStringBuffer.append("<!--");
                                }
                            } else if (skip("[CDATA[", false)) {
                                fStringBuffer.clear();
                                boolean strip = (fStyle && fStyleStripCDATADelims);
                                if (strip) {
                                    do {
                                        c = read();
                                        if (c == '\r' || c == '\n') {
                                            fCurrentEntity.columnNumber--;
                                            fCurrentEntity.offset--;
                                            break;
                                        }
                                    } while (c != -1);
                                    skipNewlines(1);
                                    delimiter = ']';
                                } else {
                                    fStringBuffer.append("<![CDATA[");
                                }
                            }
                        } else if (c == '/') {
                            String ename = scanName();
                            if (ename != null) {
                                if (ename.equalsIgnoreCase(fElementName)) {
                                    if (read() == '>') {
                                        ename = modifyName(ename, fNamesElems);
                                        if (fDocumentHandler != null && fElementCount >= fElementDepth) {
                                            fQName.setValues(null, ename, ename, null);
                                            fEndLineNumber = fCurrentEntity.lineNumber;
                                            fEndColumnNumber = fCurrentEntity.columnNumber;
                                            fDocumentHandler.endElement(fQName, locationAugs());
                                        }
                                        setScanner(acreContentScanner);
                                        setScannerState(STATE_CONTENT);
                                        return true;
                                    } else {
                                        fCurrentEntity.offset--;
                                        fCurrentEntity.columnNumber--;
                                    }
                                }
                                fStringBuffer.clear();
                                fStringBuffer.append("</");
                                fStringBuffer.append(ename);
                            } else {
                                fStringBuffer.clear();
                                fStringBuffer.append("</");
                            }
                        } else {
                            fStringBuffer.clear();
                            fStringBuffer.append('<');
                            fStringBuffer.append((char) c);
                        }
                        scanCharacters(fStringBuffer, delimiter);
                        setScannerState(STATE_CONTENT);
                        break;
                    } // case STATE_MARKUP_BRACKET
                    } // switch
                } // try
                catch (EOFException e) {
                    setScanner(fContentScanner);
                    if (fCurrentEntityStack.empty()) {
                        setScannerState(STATE_END_DOCUMENT);
                    } else {
                        fCurrentEntity = (CurrentEntity) fCurrentEntityStack.pop();
                        setScannerState(STATE_CONTENT);
                    }
                    return true;
                }
            } // do
            while (next || complete);
            
            return true;
        } // scan(boolean):boolean

    }

    /** Sets the input source. */
    public void setInputSource(XMLInputSource source) throws IOException {
        
        // reset state
        fElementCount = 0;
        fElementDepth = -1;
        fByteStream = null;
        fCurrentEntityStack.removeAllElements();

        fBeginLineNumber = 1;
        fBeginColumnNumber = 1;
        fEndLineNumber = fBeginLineNumber;
        fEndColumnNumber = fBeginColumnNumber;

        // reset encoding information
        fIANAEncoding = fDefaultIANAEncoding;
        fJavaEncoding = fIANAEncoding;

        // get location information
        String encoding = source.getEncoding();
        String publicId = source.getPublicId();
        String baseSystemId = source.getBaseSystemId();
        String literalSystemId = source.getSystemId();
        String expandedSystemId = expandSystemId(literalSystemId, baseSystemId);

        // open stream
        Reader reader = source.getCharacterStream();
        if (reader == null) {
            InputStream inputStream = source.getByteStream();
            if (inputStream == null) {
                URL url = new URL(expandedSystemId);
                inputStream = url.openStream();
            }
            fByteStream = new PlaybackInputStream(inputStream);
            String[] encodings = new String[2];
            if (encoding == null) {
                fByteStream.detectEncoding(encodings);
            } else {
                encodings[0] = encoding;
            }
            if (encodings[0] == null) {
                encodings[0] = fDefaultIANAEncoding;
                if (fReportErrors) {
                    fErrorReporter.reportWarning("HTML1000", null);
                }
            }
            if (encodings[1] == null) {
                encodings[1] = EncodingMap.getIANA2JavaMapping(encodings[0].toUpperCase());
                if (encodings[1] == null) {
                    encodings[1] = encodings[0];
                    if (fReportErrors) {
                        fErrorReporter.reportWarning("HTML1001", new Object[] { encodings[0] });
                    }
                }
            }
            fIANAEncoding = encodings[0];
            fJavaEncoding = encodings[1];
            /* PATCH: Asgeir Asgeirsson */
            fIso8859Encoding = fIANAEncoding == null || fIANAEncoding.toUpperCase().startsWith("ISO-8859")
                    || fIANAEncoding.equalsIgnoreCase(fDefaultIANAEncoding);
            encoding = fIANAEncoding;
            reader = new InputStreamReader(fByteStream, fJavaEncoding);
        }
        fCurrentEntity = new CurrentEntity(reader, encoding, publicId, baseSystemId, literalSystemId, expandedSystemId);

        // set scanner and state
        setScanner(acreContentScanner);
        setScannerState(STATE_START_DOCUMENT);

    } // setInputSource(XMLInputSource)

    /**
     * Immediately evaluates an input source and add the new content (e.g. the
     * output written by an embedded script).
     * 
     * @param inputSource
     *            The new input source to start evaluating.
     * @see #pushInputSource(XMLInputSource)
     */
    public void evaluateInputSource(XMLInputSource inputSource) {
        final Scanner previousScanner = fScanner;
        final short previousScannerState = fScannerState;
        final CurrentEntity previousEntity = fCurrentEntity;
        final Reader reader = getReader(inputSource);

        String encoding = inputSource.getEncoding();
        String publicId = inputSource.getPublicId();
        String baseSystemId = inputSource.getBaseSystemId();
        String literalSystemId = inputSource.getSystemId();
        String expandedSystemId = expandSystemId(literalSystemId, baseSystemId);
        fCurrentEntity = new CurrentEntity(reader, encoding, publicId, baseSystemId, literalSystemId, expandedSystemId);
        setScanner(acreContentScanner);
        setScannerState(STATE_CONTENT);
        try {
            do {
                fScanner.scan(false);
            } while (fScannerState != STATE_END_DOCUMENT);
        } catch (final IOException e) {
            // ignore
        }
        setScanner(previousScanner);
        setScannerState(previousScannerState);
        fCurrentEntity = previousEntity;
    } // evaluateInputSource(XMLInputSource)
    
    private Reader getReader(final XMLInputSource inputSource) {
        Reader reader = inputSource.getCharacterStream();
        if (reader == null) {
            try {
                return new InputStreamReader(inputSource.getByteStream(), fJavaEncoding);
            } catch (final UnsupportedEncodingException e) {
                // should not happen as this encoding is already used to parse
                // the "main" source
            }
        }
        return reader;
    }

    private boolean endCommentAvailable() throws IOException {
        int nbCaret = 0;
        final int originalOffset = fCurrentEntity.offset;
        final int originalColumnNumber = fCurrentEntity.columnNumber;

        while (true) {
            // read() should not clear the buffer
            if (fCurrentEntity.offset == fCurrentEntity.length) {
                if (fCurrentEntity.length == fCurrentEntity.buffer.length) {
                    load(fCurrentEntity.buffer.length);
                } else { // everything was already loaded
                    fCurrentEntity.offset = originalOffset;
                    fCurrentEntity.columnNumber = originalColumnNumber;
                    return false;
                }
            }

            int c = read();
            if (c == -1) {
                fCurrentEntity.offset = originalOffset;
                fCurrentEntity.columnNumber = originalColumnNumber;
                return false;
            } else if (c == '>' && nbCaret >= 2) {
                fCurrentEntity.offset = originalOffset;
                fCurrentEntity.columnNumber = originalColumnNumber;
                return true;
            } else if (c == '-') {
                nbCaret++;
            } else {
                nbCaret = 0;
            }
        }
    }

    private boolean endsWith(final XMLStringBuffer buffer, final String string) {
        final int l = string.length();
        if (buffer.length < l) {
            return false;
        } else {
            final String s = new String(buffer.ch, buffer.length - l, l);
            return string.equals(s);
        }
    }
     
    /**
     * To detect if 2 encoding are compatible, both must be able to read the meta tag specifying
     * the new encoding. This means that the byte representation of some minimal html markup must
     * be the same in both encodings
     */ 
    static boolean isEncodingCompatible(final String encoding1, final String encoding2) {
        final String reference = "<html><head><meta http-equiv=\"Content-Type\" content=\"text/html;charset=";
        try {
            final byte[] bytesEncoding1 = reference.getBytes(encoding1);
            final String referenceWithEncoding2 = new String(bytesEncoding1, encoding2);
            return reference.equals(referenceWithEncoding2);
        }
        catch (final UnsupportedEncodingException e) {
            return false;
        }
    }
    
    static void reduceToContent(XMLStringBuffer buffer, String startMarker, String endMarker) {
        int i = 0;
        int startContent = -1;
        final int l1 = startMarker.length();
        while (i < buffer.length - l1) {
            final char c = buffer.ch[buffer.offset + i];
            if (Character.isWhitespace(c)) {
                ++i;
            } else if (c == startMarker.charAt(0) && startMarker.equals(new String(buffer.ch, buffer.offset + i, l1))) {
                startContent = i + l1;
                break;
            } else {
                return; // start marker not found
            }
        }

        final int l2 = endMarker.length();
        i = buffer.length - 1;
        while (i > startContent + l2) {
            final char c = buffer.ch[buffer.offset + i];
            if (Character.isWhitespace(c)) {
                --i;
            } else if (c == endMarker.charAt(l2 - 1) && endMarker.equals(new String(buffer.ch, buffer.offset + i - l2 + 1, l2))) {
                buffer.length = i - startContent - 2;
                buffer.offset = startContent;
                return;
            } else {
                return; // start marker not found
            }
        }
    }

}
