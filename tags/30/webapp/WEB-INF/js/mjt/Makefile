

#
#  this is no way to maintain a website
#

# this is the distribution version (api version) - it
#  goes into the <script src=""> path of mjt apps.
# mjt.VERSION in mjt.js defines the actual running version.
VERSION = 0.9.3

SHELL=bash
CPTREE=cp -pr

STYLE_URL = /doc/style.css

TARGET_HOST = mjtemplate.org
#TARGET_HOST = mjtemplate.z
TARGET_PATH = 

#TARGET_HOST = localhost
#TARGET_PATH = /newmjt
#TARGET_PATH = /mjt/site

#TARGET_HOST = taco.metaweb.com
#TARGET_PATH = /mjt

#TARGET_HOST = mqlx.com
#TARGET_PATH = /~nix/mjt


SITE=/m/mjtemplate.org

DIST_URL = http://$(TARGET_HOST)$(TARGET_PATH)/dist/mjt-$(VERSION)

DISTDIR = $(SITE)/dist/mjt-$(VERSION)


MKDIR = mkdir -p

# convert rst to html
RST2HTML = rst2html.py

# mkkeys extracts only the specified host keys from google-api-keys.js
MKKEYS = python tools/mkkeys.py -t $(TARGET_HOST) -t www.$(TARGET_HOST)

# fixurls fixes paths in script tags to use DIST_URL
FIXURLS = python tools/mkdemo.py -u $(DIST_URL) 

# java is needed for trang and rhino
JAVA = java


# taco is missing zip(1)
# ZIP = echo
ZIP = zip

#  trang is an xml schema tool
#  it can generate .rng from .rnc among other things
TRANG= $(java) -jar server/trang-20030619/trang.jar

# rhino is a javascript interpreter
RHINODIR = ./server
RHINOCP = "$(RHINODIR)/js.jar;$(RHINODIR)/xbean.jar"
RHINO = $(JAVA) -cp $(RHINOCP) org.mozilla.javascript.tools.shell.Main

# jsdoc2-tk needs rhino
#JSDOC2DIR=./server/jsdoc_tk-0.5.2
#JSDOC2 = $(RHINO) $(JSDOC2DIR)/lib/JsDoc.js 
JSDOC2DIR=../js/jsdoctk
JSDOC2 = $(JAVA) -jar -Djsdoc.dir=$(JSDOC2DIR) $(JSDOC2DIR)/app/js.jar $(JSDOC2DIR)/app/run.js 



WEBSITE = \
	favicon.ico \
	index.html \
	index.txt \
	examples \
	examples/index.html \
	examples/rison.html \
	examples/minimal.html \
	examples/inlinescript.html \
	examples/google \
	examples/google/feed.html \
	examples/google/feedstyle.css \
	examples/google/google-api-keys.js \
	examples/dbslayer \
	examples/dbslayer/dbslayer.js \
	examples/freebase \
	examples/freebase/MochiKit-DateTime.js \
	examples/freebase/history.html \
	examples/freebase/history2.html \
	examples/freebase/posts.html \
	examples/freebase/comments.html \
	examples/freebase/names.html \
	examples/freebase/signin.html \
	examples/freebase/chrome.css \
	examples/schemas \
	examples/schemas/Iso8601Date.js \
	examples/schemas/index.html \
	examples/schemas/all_domains_detail.html \
	examples/schemas/instance_list.html \
	examples/schemas/chrome.css \
	examples/schemas/domain.html \
	examples/schemas/lib.html \
	examples/schemas/type.html \
	examples/schemas/util.js \
	examples/yahoo \
	examples/yahoo/yahooapi.js \
	examples/yahoo/imagesearch.html \
	doc \
	doc/taskdoc.html \
	doc/freebaseapi.html \
	doc/taskstate.html \
	doc/intro-tour.html \
	doc/run-mjt-examples.js \
	doc/style.css \
	test \
	test/mjt.for.html \
	test/nruns.html \
	test/taskdemo.html \
	test/test.html \
	test/ttask.js \
	tools/mjt.rnc


MJT_CORE_JS =  \
        src/header.js \
        src/json2.js \
        src/util.js

MJT_BROWSERIO_JS =  \
        src/task.js \
        src/pager.js \
        src/browserio.js \
        src/crc32.js \
        src/jsonp.js \
        src/xhr.js

MJT_FREEBASE_JS =  \
        src/freebase/api.js \
        src/freebase/isodate.js \
        src/freebase/misc.js \
        src/freebase/mqlkey.js \
        src/freebase/freebasexhr.js

MJT_TEMPLATE_JS = \
        src/markup.js \
        src/template.js \
        src/linker.js \
        src/eval.js \
	src/compile.js

MJT_PAGEAPP_JS = \
        src/runtime.js \
        src/mjtjquery.js \
	src/pageapp.js


MJT_JS =  \
	$(MJT_CORE_JS) \
	$(MJT_BROWSERIO_JS) \
	$(MJT_FREEBASE_JS) \
	$(MJT_TEMPLATE_JS) \
	$(MJT_PAGEAPP_JS)


EXTRA_JS =  \
	src/label-packages.js \
	src/freebase/mqlschema.js \
	src/freebase/mqlquery.js \
	src/freebase/mqlinspect.js \
	src/freebase/mqlhistory.js \
	src/freebase/uri_template.js \
	#test/tsetse.js

#
# /dist/ is for files that we are expecting to serve
#
DIST = \
	$(DISTDIR)/mjt.js \
	$(DISTDIR)/mjt.min.js \
	$(DISTDIR)/rison.js \
	$(DISTDIR)/mjtinline.js \
	$(DISTDIR)/src \
	$(DISTDIR)/src/freebase \
	$(patsubst %,$(DISTDIR)/%,$(MJT_JS)) \
	$(patsubst %,$(DISTDIR)/%,$(EXTRA_JS))



DOCSRC = $(MJT_JS) rison.js


all: doc/intro-tour.html doc/taskdoc.html doc/freebaseapi.html index.html


clean: 
	rm -rf index.html doc/intro-tour.html

# -l= $(JSDOC2DIR)/plugins/min.js
$(SITE)/jsdoc:
	$(JSDOC2) -d=$@ -t=$(JSDOC2DIR)/templates/json $(DOCSRC)
.PHONY: $(SITE)/jsdoc

#$(SITE)/mjt.js: minmjt.js
#	cp $^ $@
#
#$(SITE)/mjt-src.js: mjt.js
#	cp $^ $@


$(SITE)/examples:
	@-[ -d $@ ] || $(MKDIR) $@
$(SITE)/examples/yahoo:
	@-[ -d $@ ] || $(MKDIR) $@
$(SITE)/examples/google:
	@-[ -d $@ ] || $(MKDIR) $@
$(SITE)/examples/freebase:
	@-[ -d $@ ] || $(MKDIR) $@
$(SITE)/examples/schemas:
	@-[ -d $@ ] || $(MKDIR) $@


$(SITE)/dist:
	@-[ -d $@ ] || $(MKDIR) $@
$(DISTDIR): $(SITE)/dist
	@-[ -d $@ ] || $(MKDIR) $@
$(DISTDIR)/src: $(DISTDIR)
	@-[ -d $@ ] || $(MKDIR) $@
$(DISTDIR)/src/freebase: $(DISTDIR)
	@-[ -d $@ ] || $(MKDIR) $@

# cat and minify the source js
$(DISTDIR)/mjt.min.js: $(MJT_JS) $(DISTDIR)
	cat $(MJT_JS) | python tools/jsmin.py > $@
	wc -c $(MJT_JS)
	wc -c $@


# not currently used
$(DISTDIR)/mjt_src.js: $(MJT_JS) $(DISTDIR)
	cat $(MJT_JS) > $@

$(DISTDIR)/mjt_loader.js: $(MJT_JS) $(DISTDIR)
	cp mjt.js $@

$(DISTDIR)/mjtcore.js: $(MJT_CORE_JS) $(DISTDIR)
	cat $(MJT_CORE_JS) | python tools/jsmin.py > $@

$(DISTDIR)/mjtfreebase.js: $(MJT_BROWSERIO_JS) $(MJT_FREEBASE_JS) $(DISTDIR)
	cat $(MJT_BROWSERIO_JS) $(MJT_FREEBASE_JS) | python tools/jsmin.py > $@

$(DISTDIR)/mjtacre.js: $(MJT_CORE_JS) $(MJT_BROWSERIO_JS) $(MJT_FREEBASE_JS) $(MJT_TEMPLATE_JS) $(DISTDIR)
	cat $(MJT_CORE_JS) $(MJT_BROWSERIO_JS) $(MJT_FREEBASE_JS) $(MJT_TEMPLATE_JS) | python tools/jsmin.py > $@


# for other files in DIST, copy and swizzle
#  - should swizzle the <script src="mjt.js"> to the global version here?
$(DISTDIR)/%: % $(DISTDIR)
	cp -p $< $@



# this used to be done for mjtinline.js, but it shouldn't
# be necessary now.
#   sed -e "s=mjtinline.MJT_JS_URL='$(DIST_URL)/mjt.js'=g" $< > $@
# this used to be done to compute the origin of the stylesheet for RST output
# `echo "$<" | sed -e "s=^[^/][^/]*/=./=g" -e "s=[^/]*\$$=="`

$(SITE)/examples/google/google-api-keys.js: examples/google/google-api-keys.js tools/mkkeys.py
	$(MKKEYS) $< $@


$(SITE)/%.html: %.html tools/mkdemo.py
	@echo 'patching <script> tags in '$@
	$(FIXURLS) $< $@

$(SITE)/%: %
	-if [ -d $^ -a \! -d $@ ] ; then mkdir $@ ; else cp $^ $@ ; fi


#tour/%.html: tour/%.txt tools/mkdemo.py
#	$(RST2HTML) --initial-header-level=2 --link-stylesheet --stylesheet="./style.css" $< $@

# rewrite the style url for non-tour pages
doc/intro-tour.html: doc/intro-tour.txt doc/tour-template.txt
	$(RST2HTML) --initial-header-level=2 --link-stylesheet --template=doc/tour-template.txt --stylesheet="$(STYLE_URL)" $< $@


# rewrite the style url for non-tour pages
examples/%.html: examples/%.txt doc/template.txt
	$(RST2HTML) --initial-header-level=2 --link-stylesheet --template=doc/template.txt --stylesheet="../$(STYLE_URL)" $< $@

# rewrite the style url for non-tour pages
%.html: %.txt doc/template.txt
	$(RST2HTML) --initial-header-level=2 --link-stylesheet --template=doc/template.txt --stylesheet="$(STYLE_URL)" $< $@



# %.html: %.txt
# 	$(RST2HTML) --initial-header-level=2 --link-stylesheet --stylesheet="$(STYLE_URL)" $< $@



.PHONY: echo_mjt_js_files site

# this is useful if you want to do your own packing
echo_mjt_js_files:
	@echo $(MJT_JS)

site: clean all
	for f in $(WEBSITE) ; do $(MAKE) $(SITE)/$$f ; done
	for f in $(DIST) ; do $(MAKE) $$f ; done
#	(cd $(SITE)/dist; zip mjt-$(VERSION).zip mjt-$(VERSION))
#	(cd $(SITE)/dist; tar czf mjt-$(VERSION).tgz mjt-$(VERSION))

#  use trang to generate .rng files
#   .rnc files are "compact relaxng schema" and used by emacs nxml among others.
#   .rng files are xml format of the same thing, useful for tools that
#        don't understand the .rnc format
schema/mjt.rng:
	cd schema ; $(TRANG) ../tools/mjt.rnc mjt.rng

