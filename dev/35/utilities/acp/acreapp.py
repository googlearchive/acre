# BUGS:
# .txt appended to filenames (even images)
# _http_request needs better error handling

import os
import sys
import hashlib
import urlparse
try:
    import simplejson as json
except ImportError:
    import json
from mql_queries import uberquery, add_file_query, null, true, false, update_property_query
from extension_map import extension_for_file, type_for_extension

from freebase.api.mqlkey import quotekey, unquotekey

class AcreApp(object):
    def __init__(self, metadata, msb):
        self.msb = msb
        self.metadata = metadata

    def to_graph(self, app_id, msb=None, list_only=False, interactive=False):
        msb = msb or self.msb
        res_cur = InGraphAcreApp(app_id, msb)
        if msb != self.msb:
            res_asof = InGraphAcreApp(app_id, msb, res_cur.metadata['timestamp'])
        else:
            res_asof = InGraphAcreApp(app_id, msb, self.metadata['timestamp'])
        orig_files = res_asof.metadata['files']

        remote_files = res_cur.metadata['files']
        if not orig_files: orig_files = remote_files
        in_files = self.metadata['files']

        def continue_prompt():
            ok = False
            contin = False
            while not ok:
                res = raw_input("Continue anyway (y/n)? ")
                if len(res):
                    res = res.lower().strip()[0]
                    if res  == 'y':
                        contin = True
                        ok = True
                    elif res == 'n':
                        contin = False
                        ok = True
            return contin

        def merge_notice(f, local, removed):
            if local:
                print "File %s has been modified or removed on remote host since last sync" % f
                if interactive and continue_prompt():
                    if deleted:
                        if isinstance(changes.get(f, None), list):
                            changes[f].append(('-', a))
                        else:
                            changes[f] = [('-', a)]
                    else:
                        check_blobs(f)
                else:
                    sys.exit(1)
            else:
                print "File %s exists on remote host but not locally or in original copy" % f
                if interactive and continue_prompt():
                        if isinstance(changes.get(f, None), list):
                            changes[f].append(('-', a))
                        else:
                            changes[f] = [('-', a)]
                else:
                    sys.exit(1)


        def check_blobs(f, merge_ok=False):
            orig = orig_files.get(f,{})
            local = in_files.get(f,{})
            remote = remote_files.get(f,{})
            md_check = ['blob_id', 'content_type', 'handler']
            for a in md_check:
                o = orig.get(a, None)
                l = local.get(a, None)
                r = remote.get(a, None)
                if l == o and l != r:
                    if merge_ok:
                        # XXX might want to provide the option to revert to local
                        pass
                    else:
                        merge_notice(f, True, False)
                elif l == o:
                    pass
                elif l != o and o == r:
                    if isinstance(changes.get(f, None), list):
                        changes[f].append(('M', a))
                    else:
                        changes[f] = [('M', a)]
                elif l != o and o != r:
                    print l, o, r
                    if merge_ok:
                        if isinstance(changes.get(f, None), list):
                            changes[f].append(('M', a))
                        else:
                            changes[f] = [('M', a)]
                    else:
                        merge_notice(f, False, False)

        changes = {}
        for a in in_files:
            if a not in orig_files and a not in remote_files:
                if isinstance(changes.get(a, None), list):
                    changes[a].append(('+',))
                else:
                    changes[a] = [('+',)]
            elif a in orig_files and a not in remote_files:
                merge_notice(a, True, True)
            elif a in orig_files and a in remote_files:
                check_blobs(a)
            elif a not in orig_files and a in remote_files:
                merge_notice(a, False, False)

        for a in (set(remote_files.keys()) - set(in_files.keys())):
            if a in orig_files:
                merge_notice(a, False, False)
            else:
                check_blobs(a)

        for a in (set(orig_files.keys()) - set(remote_files.keys())):
            if a not in in_files:
                merge_notice(a, True, True)


        msb.login()
        for f, chgs in changes.iteritems():
            for c in chgs:
                if c[0] == '+':
                    print "add", f
                    if not list_only:
                        fi = in_files.get(f)
                        res = msb.upload(fi['contents'], fi['content_type'], permission_of=app_id)
                        q = add_file_query(app_id, f, fi['handler'], res['id'])
                        res = msb.mqlwrite(q, use_permission_of=app_id)
                elif c[0] == 'M' and c[1] == 'blob_id':
                    print "content change in", f
                    if not list_only:
                        fi = in_files.get(f)
                        res = msb.upload(fi['contents'], fi['content_type'], 
                                         app_id+'/'+f, app_id)
                elif c[0] == 'M':
                    print "change in property", c[1], "for file", f
                    if not list_only:
                        fi = in_files.get(f)
                        q = update_property_query(app_id, f, fi['handler'])
                        res = msb.mqlwrite(q, use_permission_of=app_id);
                    
        # if local but not in orig and not in remote, add to remote
        # if local and in orig but not in remote <merge notice>
        # if local and in orig and in remote <check blobs>
        # if local and not in orig but in remote <merge notice>
        # if not local and in orig and not in remote <merge notice?>
        # if not local and in orig and in remote <check blobs>
        # if not local and not in orig but in remote <merge notice>

        # <check blobs>
        #  if local blob == orig blob and local blob != remote_blob:
        #   <merge notice>
        #  if local blob == orig blob:
        #   skip
        #  if local blob != orig blob and orig blob == remote_blob:
        #   <merge to remote>
        #  if local blob != orig blob and orig blob != remote_blob:
        #   <merge notice>

        # <merge notice>
        #  if local:
        #    print File <local> has been modified on remote host since last sync
        #  else
        #    print File <remote> exists on remote host but not locally or in
        #          original copy

        # if in_self, but not in orig -> new file
        # if in_orig, but not in_self -> deleted file
        # if in_cur, but not in orig -> new file
        # if in_orig, but not in cur -> deleted file


    def to_disk(self, directory, force=False):
        def rmrf(directory):
            for f in os.listdir(directory):
                if f not in ['.', '..']:
                    os.remove(os.path.join(directory, f))
            os.rmdir(directory)

        if os.path.exists(directory):
            if not force:
                print  "Directory %s already exists. Use -f to override." % directory
                sys.exit(1)
            rmrf(directory)
        os.mkdir(directory)

        for k, f in self.metadata['files'].iteritems():
            fn = "%s.%s" % (unquotekey(f['name']), f['extension'])

            print "%s\t%s" %(fn, len(f['contents']))
            output = file(os.path.join(directory, fn), 'w');
            output.write(f['contents'])
            output.close()
        

        md = {}
        mfile = file(os.path.join(directory, '.metadata'), 'w')
        for k,v in self.metadata.iteritems():
            if k == 'files':
                continue
            md[k] = v
        json.dump(md, mfile)


class InGraphAcreApp(AcreApp):
    def __init__(self, app_id, msb, asof=None):
        self.app_id = app_id
        self.msb = msb
        super(InGraphAcreApp, self).__init__(self._metadata(asof), msb)

    def update_file_data(self, fn, content_type, data):
        res = msb.upload(data, content_type, self.app_id+'/'+f, self.app_id)
        return res

    def add_file(self, fn, data, handler, content_type):
        res = self.msb.upload(data, content_type, permission_of=self.app_id)
        q = add_file_query(app_id, fn, handler, res['id'])
        res = msb.mqlwrite(q, use_permission_of=self.app_id)
        return res

    def update_handler(self, fn, handler):
        q = update_property_query(self.app_id, fn, handler)
        res = msb.mqlwrite(q, use_permission_of=app_id);
        return res

    def _metadata(self, asof):
        res = self.msb.uberfetch_metadata(self.app_id, asof)
        app = {'id':null, 'write_user':null, 'files':{}}
        if res == None:
            return app

        app['id'] = res['id']
        app['guid'] = res['guid']
        if res['/type/domain/owners']:
            app['write_user'] = res['/type/domain/owners'].member.id

        app['keys'] = self.msb.get_keys(res['guid'])
        graph_url = urlparse.urlparse(self.msb.service_url)
        app['graph_host'] = graph_url.netloc
        app['timestamp'] = res['timestamp']

        for a in res['/type/namespace/keys']:
            script = {'id':null, 'handler':null, 'content_type':null,
                      'content_id':null}
            f = a['namespace']
            
            if not f or not f["doc:type"]:
                continue
            script['id'] = f.id
            script['name'] = a['value']
            script['handler'] = f['/freebase/apps/acre_doc/handler'].handler_key
            script['content_type'] = f['/common/document/content'].media_type.name
            script['content_id'] = f['/common/document/content'].id
            if script['content_type'].startswith('image'):
                script['contents'] = self.msb.raw(script['content_id'])
            else:
                script['contents'] = self.msb.unsafe(script['content_id'])
            script['blob_id'] = hashlib.sha256(script['contents']).hexdigest()
            script['extension'] = extension_for_file(script)
            app['files'][script['name']] = script
        return app

class OnDiskAcreApp(AcreApp):
    def __init__(self, directory, msb):
        super(OnDiskAcreApp, self).__init__(self._metadata(directory), msb)
    
    def _metadata(self, directory):
        mdpath = os.path.join(directory, '.metadata')
        if not os.path.exists(mdpath):
            raise Exception("Not an app directory! Missing .metadata")

        mdf = file(mdpath)
        metadata = json.load(mdf)

        def handle_file(f):
            script = {'id':null, 'name':null, 'handler':null,
                      'content_type':null, 'contents':null, 'extension':null}
            fn, ext = f.rsplit('.', 1)
            script['id'] = metadata['id'] + '/' + fn
            script['extension'] = ext
            script['name'] = quotekey(fn)
            script['contents'] = file(os.path.join(directory, f)).read()
            script['blob_id'] = hashlib.sha256(script['contents']).hexdigest()
            ct, handler = type_for_extension(fn, ext)
            script['handler'] = handler
            script['content_type'] = ct

            return script

        metadata['files'] = {}

        # Skip . .. .xxxx xxx.sh and directories
        for f in os.listdir(directory):
            basename, extension = os.path.splitext(f)
            if extension in ['.sh'] or f.startswith('.') or os.path.isdir(os.path.join(directory, f)):
                print >> sys.stderr, "Info: Skipping "+f
                continue

            d = handle_file(f)

            metadata['files'][d['name']] = d

        return metadata

