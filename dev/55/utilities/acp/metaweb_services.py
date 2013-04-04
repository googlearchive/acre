try:
    import simplejson as json
except ImportError:
    import json

from freebase.api import HTTPMetawebSession, MetawebError
from freebase.api.session import urlencode_weak

import mql_queries

class MetawebServicesBundle(HTTPMetawebSession):
    def __init__(self, me_server, acre_server=None, username=None, password=None):
        if acre_server == None:
            self.acre_server = 'http://acre.%s' % me_server
        else:
            self.acre_server = acre_server

        super(MetawebServicesBundle, self).__init__(me_server,
                                       username=username, password=password)
        # Update mwlt cookie before accessing graph
        self.touch()

    def get_keys(self, guid):
        try:
            self.login()
        except Exception, e:
            return None

        form = {'method':'LIST','name':'xxx', 'appid':guid}
        qstr = '&'.join(['%s=%s' % (urlencode_weak(k), urlencode_weak(v))
                             for k,v in form.items()])
        try:
            resp_str = self._http_request(self.acre_server+'/acre/keystore', 'POST',
                                   qstr, {
                    'x-metaweb-request':'1',
                    'content-type':'application/x-www-form-urlencoded'
                    })
            # we needn't check status since an exception will be raised if it's not 200
        except Exception, e:
            print "get_keys failed"
            return None

        resp = json.loads(resp_str[1])
        if resp['code'] == '/api/status/error':
            # raise Exception("get_keys failed: "+resp_str[1])
            return None #XXX Alex - why does "Method 'LIST' not supported." happen?
        return resp['keys']

    def uberfetch_metadata(self, appid, asof=None):
        q = mql_queries.uberquery(appid)
        return self.mqlread(q, asof=asof)

    def version_metadata(self, appid, version):
        q = mql_queries.versions(appid + '/' + version)
        return self.mqlread(q)
