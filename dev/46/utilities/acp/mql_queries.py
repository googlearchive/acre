null, true, false = None, True, False

def versions(appid):
    return {
        "id": appid,
        "type": "/freebase/apps/acre_app_version",
        "as_of_time": null
    }

def uberquery(appid):
    return {
        "/freebase/apps/acre_app_version/acre_app" : {
            "/type/namespace/keys" : [{
                "namespace" : {
                    "id" : appid
                },
                "value" : null
            }],
            "id" : null,
            "optional" : true
        },
        "/freebase/apps/acre_app_version/as_of_time" : null,
        "/type/domain/owners" : {
            "id" : null,
            "limit" : 1,
            "member" : {
                "/freebase/apps/acre_write_user/apps" : {
                    "id" : appid
                },
                "id" : null
            },
            "optional" : true
        },
        "/type/namespace/keys" : [
            {
                "limit":500,
                "namespace" : {
                    "permission":null,
                    "/common/document/content" : {
                        "id" : null,
                        "media_type":{'name':null},
                        "optional" : true
                    },
                    "/freebase/apps/acre_app_version/acre_app" : {
                        "id" : null,
                        "guid" : null,
                        "optional" : true
                    },
                    "/freebase/apps/acre_app_version/as_of_time" : {
                        "optional" : true,
                        "value" : null
                    },
                    "/freebase/apps/acre_doc/handler" : {
                        "handler_key" : null,
                        "optional" : true
                    },
                    "/type/content/media_type" : null,
                    "doc:type" : {
                        "id" : "/freebase/apps/acre_doc",
                        "optional" : true
                    },
                    "forbid:/freebase/apps/acre_app_version/acre_app" : {
                        "id" : appid,
                        "optional" : "forbidden"
                    },
                    "guid" : null,
                    "id" : null,
                    "doc:type" : {
                        "id" : "/freebase/apps/acre_doc",
                        "optional" : true
                    },
                    "lib:type" : {
                        "id" : "/freebase/apps/acre_app",
                        "optional" : true
                    },
                    "libver:type" : {
                        "id" : "/freebase/apps/acre_app_version",
                        "optional" : true
                    },
                    "name" : null,
                    "optional" : true
                },
                "optional" : true,
                "value" : null
            }
        ],
        "permission":null,
        "guid" : null,
        "id" : appid,
        "timestamp":null
    };


def update_property_query(app_id, name, handler=None, content_type=None):

    q = {'id':app_id+"/"+name}

    if handler:
        q['/freebase/apps/acre_doc/handler'] = {
            'handler_key':handler,
            'connect':'update'
            }

    else:
        # XXX this is probably wrong
        q['/common/content/media_type'] = {
            'value':content_type,
            'connect':'update'
            }
    return q

def add_file_query(app_id, name, handler, content_id):
    return {
        'id': app_id,
        '/type/namespace/keys' : {
            'connect': 'insert',
            'value': name,
            'namespace': {
                'create': 'unconditional',
                'guid': null,
                'type': ['/freebase/apps/acre_doc','/common/document'],
                'name': {
                    'value': name,
                    'lang': '/lang/en',
                    'connect': 'insert'
                    },
                '/common/document/content': content_id,
                '/freebase/apps/acre_doc/handler': {
                    'handler_key': handler,
                    'connect': 'insert'
                    }
                }
            }
        }
