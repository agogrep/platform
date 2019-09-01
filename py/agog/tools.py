from datetime import datetime
import time, re
import pprint
import os, shutil, sys, traceback
import ast
import hjson
import logging
import logging.config
import logging.handlers
import importlib

agog  = sys.modules[__package__]

def isBase64(string):
    reg = r'^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$'
    return True if re.search(reg,string) else False

def importModule(name):
    '''помогает импортировать модуль для custom'''
    currentBase = agog.db.GlobVar().get('currentBase')
    return importlib.import_module(currentBase+".py."+name)

def customLogger(name):
    '''помогает импортировать logger для custom'''
    currentBase = agog.db.GlobVar().get('currentBase')
    return logging.getLogger(currentBase+'.'+name)

def htmlStrip(lxmlObj):
    # удаление пробелов из шаблона
    '''only lxml Object'''
    for elem in lxmlObj.iter('*'):
        if elem.tail is not None:
            elem.tail = elem.tail.strip()
    return lxmlObj

def emptyFolder(folder):
    for the_file in os.listdir(folder):
        file_path = os.path.join(folder, the_file)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
            #elif os.path.isdir(file_path): shutil.rmtree(file_path)
        except Exception as e:
            print(e)


def converter(original_object, expected_type, default_val ):

    def _ats(obj):    # any to string
        tp = type(obj).__name__
        if tp == 'str':
            return obj, ''
        elif tp == 'datetime':
            return str(obj), ''
        elif tp == 'date':
            return str(obj), ''
        elif tp == 'Decimal':
            return str(obj),''

        else:
            return pprint.pformat(obj), ''#'error type. object ('+pprint.pformat(obj)+') is not str'

    def _ati(obj): #any to int
        tp = type(obj).__name__
        try:
            if tp=='int' or tp=='float':
                return obj,''
            else:
                return ast.literal_eval(obj),''

        except :
            return None, ''

    err = ''
    if expected_type == 'str':
        result, err = _ats( original_object )
        if (result=='') and (default_val!=''):
            result = default_val
    elif expected_type == 'int':
        result, err = _ati(original_object)
        if (result is None):
            try:
                if default_val:
                    result = int(default_val)
                else:
                    result = 0
            except:
                result = 0
    elif expected_type == 'datetime':
        result, err = _ats(original_object)
    else:
        result = 0
        err = 'error. not expected_type: '+expected_type
    if len(err)>0:
        pass
    return result




def form(text,dictWords,markers=["<[","]>"]):
    '''универсальный шаблонизатор'''

    class format_dict(dict):
        def __missing__(self, key):
            try:
                result = eval(key)
                if key!=result:
                    return result
            except Exception as e:
                return ""
            return ""
    openTeg = '<(>'
    closeTeg = '<)>'
    step1 = text.replace('{',openTeg).replace('}',closeTeg)
    step2 = step1.replace(markers[0],'{').replace(markers[1],'}')
    step3 = step2.format(**format_dict(dictWords))
    return step3.replace(openTeg,'{').replace(closeTeg,'}')







class TimeOut(object):
    timebank = []
    def __new__(cls, *args, **kw):
      if not hasattr(cls, '_instance'):
        orig = super(TimeOut, cls)
        cls._instance = orig.__new__(cls, *args, **kw)
      return cls._instance

    def reset(self):
        self.timebank = []

    def start(self):
        self.timebank.append(
            {
                'label':'start',
                'time':datetime.now()
            }
        )

    def rec(self,label=None):
        if label==None:
            label='tl_'+str(len(self.timebank))

        self.timebank.append(
            {
                'label':label,
                'time':datetime.now()
            }
        )

    def out(self):
        report = ''
        for i in range(len(self.timebank)):
            if i > 0:
                tm = self.timebank[i]['time'] - self.timebank[0]['time']
                row = str(i)+' '+self.timebank[i]['label']+' : '+str(tm)
                report = report + row +'\n'
        return report




class Logger(object):
    def __init__(self):
        logging.config.dictConfig( self.loadConfig() )

    def loadConfig(self):

        try:
            baseList = agog.db.GlobVar().get('baseList','ramdisk')
            st  = agog.serverman.Storage()
            syslogConfig = st.open(('root','logconfig.hjson'))
            mainlogPath = str(st.changePath(('mainlog','')))
            syslogConfig = form(syslogConfig,{'MAINLOG':mainlogPath})
            syslogOrdDict = hjson.loads(syslogConfig)
        except Exception as e:
            '''ошибку пишем в лог WSGI сервера '''
            print(traceback.format_exc( agog.traceLevel ))
            raise

        if baseList:
            basesPath = st.changePath(('bases',''))
            for baseName in baseList:
                try:
                    currentBase = basesPath / baseName
                    baseLogConf = st.open( currentBase / 'logconfig.hjson' )
                    if baseLogConf:
                        baseLogConf = form( baseLogConf, {'CURRENTBASE':str(currentBase)})
                        baselogOrdDict = hjson.loads(baseLogConf)
                        for el in baselogOrdDict['handlers']:
                            name = baseName+'.'+el
                            syslogOrdDict['handlers'][ name ] = baselogOrdDict['handlers'][el]
                            syslogOrdDict['loggers'][ name ] = { 'handlers': [ name ] }
                except Exception as e:
                    logging.getLogger('main').error( traceback.format_exc( agog.traceLevel ) )
                    pass

        return syslogOrdDict




# применить TimeOut для анализа задержек (исли стнаница не перезагружается - задержки увеличиваются до 14 с!!)





if __name__ == '__main__':
    pass
