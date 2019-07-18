#!/usr/bin/env python3
# -*- coding: utf-8 -*-




def modulTest():
    print('===== start index test =======')
    import sys

###
#    envirList = [
#      '/usr/local/lib/python3.4/site-packages',
#      '/usr/local/lib/python3.4/lib-dynload',
#      '/usr/local/lib/python3.4/plat-linux',
#      '/usr/local/lib/python3.4',
#      '/usr/local/lib/python34.zip'
#      ]


#    for en in envirList:
#      sys.path.insert(0,en)
    print(sys.path)

    from lxml import etree
    print('===== lxml import etree =======')

    import mysql.connector
    print('===== mysql.connector =======')

    from crontab import CronSlices, CronTab
    print('===== crontab =======')



    import inspect, os.path
    import sys, traceback




    import pathlib, importlib
    print('===== pathlib, importlib =======')

    import hashlib
    print('===== hashlib =======')
    import ctypes, os
    import copy
    print("============= import copy")
    from lxml import html
    print("============= from lxml import html")

    from lxml import objectify
    print("============= from lxml import objectify")
    from configparser import ConfigParser
    print("============= from configparser import ConfigParser")
    from datetime import datetime,timedelta, date
    print("============= from datetime import datetime,timedelta, date")
    import pprint
    import logging
    import json
    import ast
    #import sys

    print("============= end test ==========")




def main(environ, startResponse):
    import sys
    import site
    print('sys.prefix',sys.prefix)
    print('getsitepackages',site.getsitepackages())
    print('python version',sys.version)
    print('python path ',sys.executable)
    print('mod_wsgi.version',str(environ['mod_wsgi.version']))


    method = environ.get('REQUEST_METHOD')
    print('REQUEST_METHOD',environ.get('REQUEST_METHOD'))
    print('HTTP_COOKIE',environ.get('HTTP_COOKIE'))



    print('CONTENT_TYPE',environ.get('CONTENT_TYPE'))

    #print('CONTENT_TYPE','ERROR')


    #print('environ.keys ',environ.keys())
    #print('environ.items ',environ.items())

    #print('environ.fromkeys ',environ.fromkeys())


    print('PATH_INFO',environ.get('PATH_INFO'))
    print('REMOTE_ADDR',environ.get('REMOTE_ADDR'))
    print('HTTP_USER_AGENT',environ.get('HTTP_USER_AGENT'))
    print('DATA',environ['wsgi.input'].read() if method == "POST"  else environ.get('QUERY_STRING'))







    modulTest()

    listTextType = 'text/html'
    out = b'HELLO'
    responseHeaders = [
                        ('Content-Type', listTextType),
                        ('Content-Length', str(len( out )))
                      ]
    startResponse( '200 OK' , responseHeaders )
    return [ out ]
application = main
