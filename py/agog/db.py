#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import mysql.connector
from datetime import datetime, timedelta
import inspect, os.path
import sys, traceback
import pathlib
import hashlib
import pprint
import ctypes, os, re
import pickle
import json, hjson
import itertools
import glob

import logging


agog  = sys.modules[__package__]



class ConformDataBase(object):
    '''Для хранения и быстрого доступа к структуре базы
        {
            tables:{
                <tableName>:{
                    primarykey: <str>, # name main field
                    showprimary: [ <str>,]  # main field list for selectionbox
                    fields: {
                        <nameField> : {
                            type: <str>,
                            long: <int>,
                            default: <??>,
                            relatedObject: <str>
                        }
                    },
                    relations: {
                        <nameField>: <tableName>,
                    },
                    links:{ # for relatiion from many to many
                        <tableName>:{  # name related table
                            'field': <str>, # name field (master key) rel. table
                            'transTable':<str> # name intermediate teble
                        }
                    },
                    enumerations:{
                        <fieldName>: <enumName>
                    }

                }
            },
            fields:{
                <nameField> : {
                    type: <str>,
                    long: <int>,
                    default: <??>
                }
            },
            enumerations:{
                <enumname>:{
                    <NAME>: <value>
                }
            }

        }
    '''

    def __init__(self,nameBase=None):
        self.mainlog = logging.getLogger('main')

        self.conform ={
            'tables' : {},
            'fields' :{},
            'enumerations' : {}
        }
        if not nameBase:
            dv = GlobVar()
            self.nameBase = dv.get('currentBase')
        else:
            self.nameBase = nameBase



    def type_reform(self,sqltype):

        sqlpytype = {
            'tinyint':'int',
            'smallint':'int',
            'mediumint':'int',
            'int':'int',
            'integer':'int',
            'bigint':'int',
            'float':'float',
            'double':'float',
            'real':'float',
            'date':'date',
            'time':'time',
            'datetime':'datetime',
            'decimal': 'decimal'
        }
        step1 = sqltype.split(')')
        step2 = step1[0].split('(')

        pytype = sqlpytype[step2[0]] if step2[0] in sqlpytype else 'str'

        try:
            pylong = int(step2[1]) if len(step2)>1 else None
        except Exception as e:
            pylong = None

        return pytype, pylong



    def get(self,nameObject='all'):
        gv = GlobVar()
        if nameObject=='all':
            for name in self.conform:
                self.conform[name] = gv.get(self.nameBase+'.'+name,'ramdisk')
            return self.conform
        else:
            if nameObject in self.conform:
                self.conform[nameObject] = gv.get(self.nameBase+'.'+nameObject,'ramdisk')
                return self.conform.get(nameObject)
            else:
                return None

    def saveStructure(self):
        gv = GlobVar()
        for name in self.conform:
            gv.set(self.nameBase+'.'+name,self.conform.get(name),'ramdisk')


    def createStructure(self):
        print('==================== createStructure for '+str(self.nameBase))
        try:
            if not dbMan(self.nameBase).start():
                raise Exception('Database Error')

            dbconfig = Config(self.nameBase).get('mysql')
            conn = mysql.connector.connect(**dbconfig)
            cursor = conn.cursor(dictionary=True)
            cursor.execute('show tables')
            rows = cursor.fetchall()
            tables = []
            for row in rows:
                for key in row:
                    tables.append(row[key])
            dict_tables = {}
            dict_fields = {}
            dict_enum = {}
            for tb_name in tables:
                sql = 'desc ' + tb_name
                cursor.execute(sql)
                rows = cursor.fetchall()
                table = {
                    'primarykey':'',
                    'fields':{},
                    'links':{}
                    }
                for row in rows:
                    field = {}
                    field['type'], field['long'] = self.type_reform(row['Type'])
                    field['default'] = row['Default']
                    if row['Key'] == 'PRI':
                        table['primarykey'] = row['Field']
                    table['fields'][row['Field']] = field
                    dict_fields[row['Field']] = field

                sqlGetLinks = '''
                        SELECT DISTINCT a.relation, a.main, a.field  FROM agog a
                                INNER JOIN agog b on a.main = b.main
                                WHERE b.relation = '{tb_name}' and a.relation <> '{tb_name}' and a.used = 'link';
                '''
                cursor.execute(sqlGetLinks.format(tb_name=tb_name))
                listLinks = cursor.fetchall()
                for el in listLinks:
                    table['links'][el['relation']] = {
                        'field': el['field'],
                        'transTable': el['main'],
                    }

                sqlGetRelations = ''' SELECT * FROM agog WHERE main = "{0}";'''
                cursor.execute(sqlGetRelations.format(tb_name))
                listRel= cursor.fetchall()
                table['relations'] = {}
                table['enumerations'] = {}
                for el in listRel:
                    if el['relation'].strip() != '':
                        table['relations'][el['field']] = el['relation']
                        table['fields'][ el['field'] ]['relatedObject'] = 'relations'

                    if el['enumeration'].strip() != '':
                        table['enumerations'][ el['field'] ] = el['enumeration']
                        table['fields'][ el['field'] ]['relatedObject'] = 'enumerations'

                    if el['showprimary'] > 0:
                        if 'showprimary' not in table:
                            table['showprimary'] = []

                        table['showprimary'].append(el['field'])

                dict_tables[tb_name] = table

            sqlEnum = '''SELECT * FROM enumerations;'''
            cursor.execute(sqlEnum)
            listEnum = cursor.fetchall()

            for el  in listEnum:
                if el['enumname'] not in dict_enum:
                    dict_enum[ el['enumname'] ] = {}
                dict_enum[ el['enumname'] ][ el['name'] ] = el['value']

            self.conform['tables'] = dict_tables
            self.conform['fields'] = dict_fields
            self.conform['enumerations'] = dict_enum

            cursor.close()
            conn.close()
            self.saveStructure()

            self.mainlog.info('structure for database %s created successfully'%self.nameBase)
        except Exception as e:
            self.mainlog.error('structure not create for database '+self.nameBase)
            self.mainlog.error( traceback.format_exc( agog.traceLevel ) )
            raise











class GlobVar(object):
    multidata = {}
    libc = ctypes.cdll.LoadLibrary('libc.so.6')

    def __new__(cls, *args, **kw):
        if not hasattr(cls, '_instance'):
            orig = super(GlobVar, cls)
            cls._instance = orig.__new__(cls, *args, **kw)
        return cls._instance

    def __init__(self):
        self.mainlog = logging.getLogger('main')
        pass

    def gettid(self):
        """Get TID as displayed by htop."""
        for cmd in (186, 224, 178):
            tid = self.libc.syscall(cmd)
            if tid != -1:
                return tid

    def set(self,varName,data,level='thread'):
        '''level: disc,ramdisk, process, thread'''
        try:
            pid = str(os.getpid())
            def puchData(id):
                if id not in self.multidata:
                    self.multidata[id] = {}
                self.multidata[id][varName] = data
            if level=='process':
                puchData(pid)
            elif level=='thread':
                tid = str(self.gettid())
                puchData(pid+tid)
            elif level=='ramdisk':
                self.setToDisk(varName,data)
        except Exception as e:
            self.mainlog.error( traceback.format_exc( agog.traceLevel ) )
            raise


    def get(self,varName,level='thread'):

        pid = str(os.getpid())
        def popData(id):
            if id in self.multidata:
                if varName in self.multidata[id]:
                    return self.multidata[id][varName]
        if level=='process':
            return popData(pid)
        elif level=='thread':
            tid = str(self.gettid())
            return  popData(pid+tid)
        elif level=='ramdisk':
            return self.getFromDisk(varName)


    def delete(self,varName='ALL',level='thread'):
        pid = str(os.getpid())
        def delete(id):
            if id in self.multidata:
                if varName=='ALL':
                    del self.multidata[id]
                else:
                    if varName in self.multidata[id]:
                        del self.multidata[id][varName]
        if level=='process':
            delete(pid)
        elif level=='thread':
            tid = str(self.gettid())
            delete(pid+tid)
        elif level=='ramdisk':
            stor = agog.serverman.Storage()
            path = stor.changePath(('temp',varName+'.dmp'))
            try:
                if path:
                    os.remove(str(path))
            except BaseException as e:
                self.mainlog.error( traceback.format_exc( agog.traceLevel ) )


    def setToDisk(self,varName,data,role='temp'):
        # print('varName',varName)
        '''file name =  <basename>.<varname>  '''
        stor = agog.serverman.Storage()
        file = stor.getFileObject((role,varName+'.dmp'),'wb')
        pickle.dump(data, file, pickle.HIGHEST_PROTOCOL)
        file.close()

    def getFromDisk(self,varName,role='temp'):

        stor = agog.serverman.Storage()
        file = stor.getFileObject((role,varName+'.dmp'),'rb')
        if file:
            data = pickle.load(file)
            file.close()
            return data


class Session:
    def __init__(self):
        pass

    def currentSession(self):
        '''функция для совместимости между старои новой версией'''
        gv = GlobVar()

        session = gv.get('session')
        if not session:
            session = gv.get('cookie')

        return session


    def delete(self,sessionId):
        login = GlobVar().get('session').get('login')
        Cache().deleteTemp(login) # удаляем мусор сессии

        sql  = 'DELETE FROM temp_cookie WHERE cookie = "{0}"'
        db = dbSql();
        sql = sql.format(sessionId)
        db.request(sql.format(sessionId),'w')
        st  = agog.serverman.Storage()
        path = st.changePath(('session',sessionId))
        if path:
            os.remove(str(path))


    def get(self,sessionId):
        st  = agog.serverman.Storage()
        path = st.changePath(('session',sessionId))
        if path:
            f = st.getFileObject(path,'r')
            if f:
                try:
                    return json.load(f)
                except Exception as e:
                    pass

    def set(self,param):
        stack = ''
        for el in param:
            stack = stack + str(param[el])

        stack = stack + str(datetime.now())
        sessionId = hashlib.md5(stack.encode('utf-8')).hexdigest()
        st  = agog.serverman.Storage()

        f = st.getFileObject(('session',sessionId),'w')
        if f:
            try:
                json.dump(param,f)
                currentBase = agog.db.GlobVar().get('currentBase')
                statusError = agog.db.GlobVar().get(currentBase+'.statusError','ramdisk')
                if not statusError:
                    sql  = 'INSERT INTO temp_cookie (cookie,login) VALUES ("{cookie}","{login}")'
                    db = dbSql();
                    db.request(sql.format(cookie=sessionId,login=param['login']),'w')

                Cache().deleteTemp(param['login']) # удаляем мусор прошлых сессий
                return sessionId
            except Exception as e:
                raise




class Cache(object):  # рудимент

    lastChangeTime = '' #datetime.now() # временная метка последних изменнений в базе
    lastRequestTime  = '' # datetime.now() # временная метка. последнее обращение а кешу
    usersCache = {}
    cookie = {}
    openForms = {}

    def __new__(cls, *args, **kw):
      if not hasattr(cls, '_instance'):
        orig = super(Cache, cls)
        cls._instance = orig.__new__(cls, *args, **kw)
      return cls._instance

    def __init__(self):
        if self.lastChangeTime == '':
            self.lastChangeTime = datetime.now()
        if self.lastRequestTime == '':
            self.lastRequestTime = datetime.now()

    def setCookie(self,login,password):
        data = login+password+str(datetime.now())
        cookie = hashlib.md5(data.encode('utf-8')).hexdigest()

        def recInBase():
            try:
                sql  = 'INSERT INTO temp_cookie (cookie,login) VALUES ("{cookie}","{login}")'
                db = dbSql();
                rows = db.request(sql.format(cookie=cookie,login=login),'w')
            except Exception as e:
                pass


        def recInStorage():
            ROOTPATH = agog.serverman.Storage().ROOTPATH
            # path = str(ROOTPATH.joinpath('RAM'))+'/session/'
            path = ROOTPATH / 'RAM' / 'session'
            f = open(str(path / cookie),'a')
            f.write(login)
            f.close()
            f = open(str(path / login),'a')
            f.write(str(datetime.now())+'  setCookie '+cookie+'\n')
            f.close()

        recInBase()
        recInStorage()
        return cookie


    def delCookie(self,login):
        sql  = 'DELETE FROM temp_cookie WHERE login = "{0}"'
        db = dbSql();
        sql = sql.format(login)
        print(sql)
        db.request(sql.format(login),'w')


    def hasCookie(self,cookie): # рудимент
        ROOTPATH = agog.serverman.Storage().ROOTPATH
        return os.path.exists( str(ROOTPATH / 'RAM'/ 'session' / cookie)) # проверка существования файла


    def logUserActivity(self,login,info):
        ROOTPATH = agog.serverman.Storage().ROOTPATH
        path = ROOTPATH / 'RAM' / 'session' / login
        f = open(str(path),'a',encoding='utf-8')
        f.write(str(datetime.now())+' '+pprint.pformat(info)+'\n')
        f.close()



    def stamp(self):
        self.lastTimeStamp = datetime.now()

    def set(self,user,label,target,data):              # set cache search request

        stor = agog.serverman.Storage()
        path = 'temp/{0}_{1}.temp'.format(user,label)
        file = stor.getFileObject(('profiles',path),'w',encoding='utf-8')

        file.write(target+'\n')
        if type(data).__name__=='list':
            for line in data:
                line = re.sub(r'[\n|\Z]','',line)
                file.write(line+'\n')


    def get(self,user,label,range):             # get cache search request
        ''' user - str, label - str, range - list  '''
        stor = agog.serverman.Storage()

        path = 'temp/{0}_{1}.temp'.format(user,label)
        file = stor.getFileObject(('profiles',path),'r',encoding='utf-8')

        if file:
            terget = re.sub(r'\n','',file.readline())
            # file.seek(0)
            out = list([  re.sub(r'\n','',line) for line in  itertools.islice(file, *range)] )
            return [terget, out]

    def deleteTemp(self,userName):
        stor = agog.serverman.Storage()
        pach = stor.changePath(('profiles','temp'))
        if pach:
            masc = str(pach / userName)+'*'
            fileList = glob.glob(masc)
            for file in fileList:
                os.remove(file)


class UserConfig:
    def __init__(self):
        pass

    def _load(self):
        confstr = agog.serverman.Storage().open(('profile','userconfig.hjson'))
        config = hjson.loads(confstr)
        return config

    def get(self,name=None):
        config = self._load()
        if not name:
            return config
        else:
            return config.get(name)


    def set(self,data={}):
        config = self._load()
        config.update(data)
        confstr = hjson.dumps(config)
        return agog.serverman.Storage().save(('profile','userconfig.hjson'),confstr)




class Config:
    '''Хрантит и подгружает конфиги'''
    data = {}
    def __init__(self,nameBase=None):
        ''' если nameBase не указано, загружает из GlobVar текущее название'''
        gv = GlobVar()
        if not nameBase:
            currentBase = gv.get('currentBase')
        else:
            currentBase = nameBase

        if agog.enabledCachingConfig:
            self.data = gv.get(currentBase+'.config','ramdisk')
        else:
            self.data = None

        if not self.data:
            st = agog.serverman.Storage()
            strConf = st.open(('bases',currentBase+'/config.hjson'))
            self.data = hjson.loads(strConf)

            if agog.enabledCachingConfig:
                gv.set(currentBase+'.config',self.data,'ramdisk')

    def get(self,part=None):
        if part:
            return self.data.get(part)
        else:
            return self.data


# def testDb(nameBase):
#     mainlog = logging.getLogger('main')
#     mainlog.info('check database '+nameBase)
#     config = Config(nameBase)
#     try:
#         conn = mysql.connector.connect(**config.get('mysql'))
#         cursor = conn.cursor(dictionary=True)
#         sql = 'SELECT * FROM passport_db ORDER BY pdid LIMIT 1;'
#         cursor.execute(sql)
#         results = cursor.fetchone()
#         if results:
#             passport = config.get('passport_db')
#             if (passport.get('svcode')==results['svcode'])and(passport.get('version')==results['version']):
#                 mainlog.info('successfully')
#                 return True
#             else:
#                 mainlog.error('incorrect database version')
#                 GlobVar().set(nameBase+'.statusError','incorrect database version','ramdisk')
#         else:
#             return False
#     except Exception as e:
#         mainlog.error(e)
#         GlobVar().set(nameBase+'.statusError',e,'ramdisk')
#         return False



class dbMan:
    def __init__(self,nameBase=None):
        if not nameBase:
            self.nameBase = GlobVar().get('currentBase')
        else:
            self.nameBase = nameBase

        self.mainlog = logging.getLogger('main')

    def manager(self,param):
        '''
        JSON:
        param = {
            _line:<str>
        }
        '''
        self._line = param.pop('_line')
        return [{ 'target': self._line, 'content': getattr(self, self._line)(**param)}]


# mainlog = logging.getLogger('main')
# mainlog.info('check database '+nameBase)
# mainlog.info('successfully')
# mainlog.error('incorrect database version')
# GlobVar().set(nameBase+'.statusError','incorrect database version','ramdisk')
# mainlog.error(e)
# GlobVar().set(nameBase+'.statusError',e,'ramdisk')
    def status(self):
        '''errors:
        2003: Can't connect to MySQL server (нет соединения)
        1049 (42000): Unknown database      (нет базы)
        1045 (28000) : Access denied for user (не правильный логин/пароль)
        1146, "Table 'buh.passport_db' doesn't exist" (нет паспорта, т.е. база пустая или не подходит к платформе)
        ----------------------
        3001 : no version installed (не установлениа версия)
        3002 : wrong version (не правильная версия)
        4001 : other error (все другие ошибки Exception)
        1 : ok
        '''
        nameBase = self.nameBase
        config = Config(nameBase)
        try:
            conn = mysql.connector.connect(**config.get('mysql'))
            cursor = conn.cursor(dictionary=True)
            sql = 'SELECT * FROM passport_db  ORDER BY pdid LIMIT 1;'
            cursor.execute(sql)
            results = cursor.fetchone()
            if results:
                passport = config.get('passport_db')
                if (passport.get('svcode')==results['svcode'])and(passport.get('version')==results['version']):
                    return 1 , 'ok'
                else:
                    return 3002 , 'wrong version'
            else:
                return 3001 , 'no version installed'
        except (mysql.connector.errors.InterfaceError,
                mysql.connector.errors.ProgrammingError) as e:
            return e.errno, e.msg
        except Exception as e:
            return 4001, traceback.format_exc( agog.traceLevel )

    def start(self):
        varName = self.nameBase+'.statusError'
        globVar = GlobVar()
        self.mainlog.info('>>> start database '+ self.nameBase)
        stat, mess = self.status()
        errMessage = 'Error: '+str(stat)+' '+mess
        if stat == 1:
            self.mainlog.info(mess)
            globVar.delete(varName,'ramdisk')
            return True
        elif stat in (2003,1045,1146,3001,3002):
            self.mainlog.error(errMessage)
            globVar.set(varName,errMessage,'ramdisk')
            return False
        elif stat == 1049:
            self.mainlog.error(errMessage)
            try:
                self.mainlog.info('attempt to create a base')
                self.create(self.nameBase)
                globVar.delete(varName,'ramdisk')
                return True
            except Exception as e:
                self.mainlog.error('failed to create database')
                err = traceback.format_exc( agog.traceLevel)
                self.mainlog.error(err)
                globVar.set(varName,errMessage +"\n"+ err,'ramdisk')
                return False
        else:
            globVar.set(varName,errMessage,'ramdisk')
            self.mainlog.error(errMessage)
            return False




    def create(self,nameBase):
        config = Config(nameBase).get('mysql')
        nameSqlBase = config.pop('database')
        sql = 'CREATE DATABASE %s;'%nameSqlBase
        try:

            conn = mysql.connector.connect(**config)
            cursor = conn.cursor()
            cursor.execute(sql)
            conn.close()

        except Exception as e:
            raise
        config['database'] = nameSqlBase
        try:
            conn = mysql.connector.connect(**config)
            cursor = conn.cursor()
            stor =  agog.serverman.Storage()
            struct = stor.open(('backup','empty_db/structure.sql'))
            lineList = struct.split(';\n')
            init = stor.open(('backup','empty_db/initfill.sql'))
            lineList.extend(init.split(';\n'))
            for line in lineList:
                cursor.execute(line)
            passport_db = Config(nameBase).get('passport_db')
            sql  = 'INSERT INTO passport_db (pdate,svcode,version) VALUES (NOW(),"{0}","{1}")'.format(
                passport_db.get('svcode'),
                passport_db.get('version')
            )
            cursor.execute(sql)
            conn.commit()
            conn.close()
            self.mainlog.info('created new sql database '+nameSqlBase)
            mess = 'Warning!\nThe loader did not find the database specified \n in the configurator and created a new one.'
            agog.content.Message().send('system',['ALL'],mess,'window')

        except Exception as e:
            raise






class dbSql:
    cursor = None
    conn = None
    def __init__(self):
        self.config = Config().get('mysql')
        self.reqLog = agog.tools.customLogger('requests')
        self.open()


    def open(self):
        dbconfig = Config().get('mysql')
        self.conn = mysql.connector.connect(**dbconfig)
        self.cursor = self.conn.cursor(dictionary=True)

    def close(self):
        self.conn.close()
        self.cursor.close()

    def request2(self,sql,mode='r',quantity = 1):
        # print('request2 ===>> \n',sql)
        #r - read, w - write
        # quantity  колличество полезных операций (для режима write)
        try:
            mode_delete   =  'transfer'
            warnings = []
            operations = ['INSERT','UPDATE','DELETE','REPLACE']
            report = [] # рапорт для подсчета удачных операций
            rows = []
            status = ''
            if mode=='r':
                self.cursor.execute(sql)
                rows = self.cursor.fetchall()
            elif mode=='w':
                result = self.cursor.execute(sql,multi=True)
                for res in result:
                    # проверка мягкого удаления записи (была ли записть перенесена в таблицу ..del)
                    ind = res.statement.find(' ')
                    line = res.statement[0:ind if ind >=0 else len(res.statement)].upper()
                    if line=='DELETE':
                        if mode_delete == 'transfer':
                            if len(report):
                                previous_el = len(report)-1
                                # print(report[previous_el])
                                pr_line = report[previous_el]['line']
                                pr_rowcount = report[previous_el]['rowcount']
                                if (pr_line == 'INSERT') and (pr_rowcount > 0) and (res.rowcount==1) :
                                    # не позволяет удалить больше одной записи за одну команду
                                    del report[previous_el]

                    if line in operations: # рапорт об завершении транзакции
                        if res.rowcount >=0:
                            report.append({
                                'lastrowid':res.lastrowid,
                                'rowcount':res.rowcount,
                                #'statement': res.statement,
                                'line': line
                                })
                        if res.rowcount <=0:
                            warnings.append({
                            'lastrowid':res.lastrowid,
                            'line': line,
                            'desc':'the record was not changed'
                            })
                if quantity == len(report):
                    self.conn.commit()
                    status = 'DONE'
                else:
                    warnings.append({
                    'lastrowid':0,
                    'line': 'commit',
                    'desc':'The transactions has not been commit'
                    })
                    status = 'ERROR'
                out = {
                    'warnings':warnings,
                    'report':report,
                    'id': report[0]['lastrowid'] if len(report)>0 else 0,
                    'status': status
                }
                rows.append(out)
            return rows
        except Exception as e:
            self.reqLog.error( sql )
            raise



    def request(self,sql,mode='r',quantity = 1):
        #r - read, w - write
        # quantity  колличество полезных операций (для режима write)
        try:
            mode_delete   =  'transfer'
            warnings = []
            operations = ['INSERT','UPDATE','DELETE','REPLACE']

            dbconfig = Config().get('mysql')
            conn = mysql.connector.connect(**dbconfig)
            cursor = conn.cursor(dictionary=True)

            report = [] # рапорт для подсчета удачных операций

            rows = []
            status = ''
            if mode=='r':
                cursor.execute(sql)
                rows = cursor.fetchall()

            elif mode=='w':
                result = cursor.execute(sql,multi=True)
                for res in result:
                    # проверка мягкого удаления записи (была ли записть перенесена в таблицу ..del)
                    ind = res.statement.find(' ')
                    line = res.statement[0:ind if ind >=0 else len(res.statement)].upper()
                    if line=='DELETE':
                        if mode_delete == 'transfer':
                            if len(report):
                                previous_el = len(report)-1
                                # print(report[previous_el])
                                pr_line = report[previous_el]['line']
                                pr_rowcount = report[previous_el]['rowcount']
                                if (pr_line == 'INSERT') and (pr_rowcount > 0) and (res.rowcount==1) :
                                    # не позволяет удалить больше одной записи за одну команду
                                    del report[previous_el]

                    if line in operations: # рапорт об завершении транзакции
                        if res.rowcount >=0:
                            report.append({
                                'lastrowid':res.lastrowid,
                                'rowcount':res.rowcount,
                                #'statement': res.statement,
                                'line': line
                                })
                        if res.rowcount <=0:
                            warnings.append({
                            'lastrowid':res.lastrowid,
                            'line': line,
                            'desc':'the record was not changed'
                            })



                if quantity == len(report):
                    conn.commit()
                    status = 'DONE'
                else:

                    warnings.append({
                    'lastrowid':0,
                    'line': 'commit',
                    'desc':'The transactions has not been commit'
                    })
                    status = 'ERROR'
                out = {
                    'warnings':warnings,
                    'report':report,
                    'id': report[0]['lastrowid'] if len(report)>0 else 0,
                    'status': status
                }
                rows.append(out)



            cursor.close()
            conn.close()

            return rows

        except Exception as e:
            self.reqLog.error( '=============== self.reqLog.error =============' )
            self.reqLog.error( sql.encode('utf-8'))
            raise

if __name__ == '__main__':
    pass
