#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import inspect
import os
import pathlib
import sys
import logging
import time

FILENAME = inspect.getframeinfo(inspect.currentframe()).filename
ROOTPATH = pathlib.Path(os.path.dirname(os.path.abspath(FILENAME)))
sys.path.append(str(ROOTPATH.joinpath('py')))
sys.path.append(str(ROOTPATH.joinpath('bases')))

from agog import serverman, tools

serverman.Storage().ini( ROOTPATH )
serverman.Manager().start()

tools.Logger()
mainlog = logging.getLogger('main')

mainlog.info('================= system started successfully, PID: %s'%str(os.getpid()))
# print('mainlog',mainlog)


def main(environ, startResponse):
    # time.sleep(1)

    listTextType = ('text/html', 'text/plain')

    method = environ.get('REQUEST_METHOD')

    # print('========== wsgi.queue =========')
    # print(environ['mod_wsgi.queue_start'])

    param = {
        'cookie': environ.get('HTTP_COOKIE'),
        'data': environ['wsgi.input'].read() if method == "POST"  else environ.get('QUERY_STRING'),
        'type':environ.get('CONTENT_TYPE'),
        'path': environ.get('PATH_INFO'),
        'method': method,
        'queue': '', #environ['mod_wsgi.queue_start'],
        'ip': environ.get('REMOTE_ADDR'),
        'client':  environ.get('HTTP_USER_AGENT'),
    }

    mainlog.debug(param)

    out = serverman.Web(param).do()

    if out['type'] in listTextType:
        out['type'] = out['type'] + '; charset=utf-8'

    if not out.get('data'):
        out['data'] = '''
            <html>
              <head>
                <link rel="icon" href="data:;base64,iVBORw0KGgo=">
                <meta charset="utf-8">
              </head>
              <body>
              </body>
            </html>
        '''.encode('utf-8')

    responseHeaders = [
                        ('Content-Type', out['type']),
                        ('Content-Length', str(len( out['data'])))
                      ]

    if out.get('cookie'):
        for cook in out.get('cookie'):
            responseHeaders.append( ('Set-cookie',cook) )

    startResponse( out['status'] , responseHeaders )

    # mainlog.debug( out )
    return [ out['data'] ]


application = main
