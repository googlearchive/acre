def invert_index(idx):
    out = {}
    for k,v in idx.iteritems():
        out[v] = k

    return out

FILE_TYPES = {
    'png':'image/png',
    'jpg':'image/jpeg',
    'gif':'image/gif',
    'html':'text/html',
    'css':'text/css',
    'js':'text/javascript'
}

EXTENSION_TYPES = invert_index(FILE_TYPES)

def extension_for_file(f):
    handler = f['handler']
    ctype = f['content_type']

    if handler in ['binary', 'passthrough']:
        return EXTENSION_TYPES.get(ctype, 'txt')
    elif handler == 'mqlquery':
        return "mql"
    elif handler == 'mjt':
        return "mjt"
    elif handler == 'acre_script':
        return "sjs"

def type_for_extension(f, ext):
    ct = FILE_TYPES.get(ext, 'text/plain')

    if ct == 'text/plain' and ext == 'sjs':
        return (ct, 'acre_script')
    elif ct == 'text/plain' and ext == 'mql':
        return (ct, 'mqlquery')
    elif ct == 'text/plain' and ext == 'mjt':
        return (ct, 'mjt')
    elif ct == 'text/plain':
        return (ct, 'passthrough')
    elif ct.startswith('image'):
        return (ct, 'binary')
    else:
        return (ct, 'passthrough')
