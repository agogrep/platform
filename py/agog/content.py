#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import mysql.connector
import inspect, os.path
import sys, traceback
import pathlib, importlib
import hashlib
import ctypes, os
import copy

from lxml import html
from lxml import etree
from lxml import objectify
from configparser import ConfigParser
from datetime import datetime,timedelta, date
import pprint
import logging
import json
import ast
import sys



agog  = sys.modules[__package__]



def shieldingBrackets(s):
    return  s.replace('{','&|').replace('}','|&')


def unShieldingBrackets(s):
    return  s.replace('&|','{').replace('|&','}')


def isEmptyString(s):
    if s is None:
        return True
    else:
        buf = s.strip()
        if buf:
            return False
        else:
            return True


class format_dict(dict):
    def __missing__(self, key):
        # logging.error(key)
        return ""






class Profile:
    def __init__(self):
        pass

    def manager(self,param):
        '''{
        _line: команда,
            data: что то
        }
        '''
        if param.get('_line') in dir(self):
            line = param.pop('_line')
            script = getattr(self,line)
            return self.answer(script(param))


    def getConfig(self):
        '''дописать'''
        pass

    def setConfig(self,data):
        return agog.db.UserConfig().set(data)


    def answer(self,data):
        '''Forms a standard package for a response from a web form'''
        out = [
        {'target':'profile',
        'content':data}]
        return out

    def saveDesktop(self,param):

        selector = './/*[@id="desktop"]'
        stor = agog.serverman.Storage()
        desktop =  html.parse( str(stor.changePath(('profile','desktop.html'))) )
        data = html.fromstring(param.get('data'))
        body = desktop.findall('body')[0]

        el = desktop.findall(selector)
        if len(el):
            body.remove(desktop.findall(selector)[0])
        body.append(data)
        htm = html.tostring(desktop, encoding ="unicode", method="html")
        status = stor.save(('profile','desktop.html'),htm)
        return {'status': status}


    def openDesktop(self):
        stor = agog.serverman.Storage()
        index = html.parse( str(stor.changePath(('profile','index.html'))) )
        mainmenu = html.parse( str(stor.changePath(('profile','mainmenu.html'))) )
        desktop =  html.parse( str(stor.changePath(('profile','desktop.html'))) )
        root = index.findall('.//*[@id="root"]')[0]
        root.append( mainmenu.findall('.//*[@id="mainmenu"]')[0] )
        root.append( desktop.findall('.//*[@id="desktop"]')[0] )
        return html.tostring(agog.tools.htmlStrip(index), encoding ="unicode", method="html", doctype="<!DOCTYPE html>")

    def availableLanguages(self,param):
        treeList = []
        st = agog.serverman.Storage()
        path = str(st.changePath(('lang','')))
        tree = os.walk(path)
        for i in tree:
            treeList.append(i)
        langList = treeList[0][2]
        return [el.replace('.csv','') for el in langList]

    def setParam(self,param):
        agog.db.UserConfig().set(param)








class ReportGen:
    def __init__(self):
        pass
    def manager(self,param):
        if param.get('_line') in dir(self):
            line = param.pop('_line')
            script = getattr(self,line)
            return self.answer(script(param))

    def getList(self,param):
        base  = agog.db.dbSql()
        rows = base.request2('SELECT * FROM reportscripts')
        return rows


    def getReport(self,param):
        if 'scriptName' in param:
            scriptName = param.pop('scriptName')
            curBase = agog.db.GlobVar().get('currentBase')

            # print('hasPath',agog.serverman.Storage().hasPath(('bases',curBase+'/py/reportscripts.py')))
            if agog.serverman.Storage().hasPath(('bases',curBase+'/py/reportscripts.py')):
                # print('importlib', importlib.import_module(curBase+'.py.reportscripts'))
                repScrModule = importlib.import_module(curBase+'.py.reportscripts')


                # print('repScrModule',repScrModule)
                if scriptName in dir(repScrModule):
                    script = getattr(repScrModule, scriptName)
                    # print('script',script)
                    return script(**param)


    def answer(self,data):
        '''Forms a standard package for a response from a web form'''
        stamp = None
        if '_stampupdate' in data:
            stamp = data.pop('_stampupdate')

        out = [
            {
                'target':'report',
                'content':data
            }
        ]

        if (stamp is not None):
            out[0]['_stampupdate'] = stamp

        return out

    def loadToServiceDate(self):
        # print('loadToServiceDate')
        out = agog.reportscripts.loadToServiceDate()

        # print('out',out)
        param = { 'scriptName': 'loadToServiceDate' }
        customuot = self.getReport(param)
        out.update( customuot)
        return out








class ServiceData:
    logStack = []

    def __init__(self):
        pass

    def log(self,text):
        self.logStack.append(text)

    def manager(self,param=None):

        '''
        returns an object with service information (presets, current user data,
         access rights, cached words of search queries,names of forms in different languages)
        JSON out:
        currentUser: {
                info: {},
                accessRights:{},
            },
        presets:{},
        cachedWords:{},
        namesOfForms:{},
        patterns:{
            reports:{}
            }
        },
        conformDataBase:{
            tables:{},
            fields:{}
        }
        reports:{
            <namescript>:
        }
        '''
        self.cookie = {}# рудимент
        if (param is None) or (param=={}):
            inParam = {
                'currentUser':{},
                'presets':{},
                'cachedWords':{},
                'namesOfForms':{},
                'patterns':{},
                'conformDataBase':{},
                'reports':{}
                }
        else:
            if 'cookie' in param: # рудимент
                self.cookie = param.pop('cookie')# рудимент

            inParam = param

        data = {}
        for line in inParam:
            if inParam[line]:
                data[line] = getattr(self,line)(**inParam[line])
            else:
                data[line] = getattr(self,line)()
        out = {
            'target':'servicedata',
            'content': data,
            'log': self.logStack
        }

        return [out]
    def currentUser(self):
        return agog.db.GlobVar().get('session')

    def cachedWords(self):
        pass

    def patterns(self):
        repStor = agog.serverman.Storage().changePath(('pattern','reports'))
        fileNameList = os.listdir( str(repStor) )
        patterns = {
            'reports':{}
        }

        for fname in fileNameList:
            htmlFile = agog.tools.htmlStrip(html.parse( str(repStor / fname) ))
            patterns['reports'][fname.replace('.html','')] = html.tostring(htmlFile, encoding ="unicode", method="html")

        return patterns

    def presets(self):
        # downloading the presets
        presets = {}
        base = agog.db.dbSql()
        base.open()

        # base.cursor.execute('show table status WHERE Comment = "presets"')
        # tables = base.cursor.fetchall()
        # for el in tables:
        #     sql = 'SELECT * FROM '+ el['Name']
        #     base.cursor.execute(sql)
        #     tContent = base.cursor.fetchall()
        #     presets[el['Name']] = tContent

        session = agog.db.Session().currentSession()

        if 'login' in session:
            login = session['login']
        else:
            login = 'ALL'

        # sql = '''SELECT * FROM journalpresets WHERE login in ("ALL","{0}")'''.format(login)
        # base.cursor.execute(sql)
        # presTables = base.cursor.fetchall()
        # for el in presTables:
        #     if el['tablename'] not in presets:
        #         presets[ el['tablename'] ] = {}
        #     tablename = el.pop('tablename')
        #     gname = el.pop('gname')
        #     jpid = el.pop('jpid')
        #     presets[ tablename ][ jpid ] = el


        sql = '''SELECT * FROM presets WHERE login in ("ALL","{0}")'''.format(login)
        base.cursor.execute(sql)
        presReports = base.cursor.fetchall()
        for el in presReports:
            if el['class'] not in presets:
                presets[ el['class'] ] = {}
            classname = el.pop('class')
            prid = el.pop('prid')
            presets[ classname ][ prid ] = el

        base.close()
        return presets

    # def namesOfForms_(self,lang='en'):
    #     sysword = []
    #     usedword = []
    #     dictWords = {}
    #     stor = agog.serverman.Storage()
    #     try:
    #         sysword  = stor.open(('lang','sysword'))
    #         sysword = sysword.split('\n')
    #         usedword = stor.open(('lang',lang +'.ln'))
    #         usedword = usedword.split('\n')
    #     except Exception as e:
    #         pass
    #
    #     try:
    #         if sysword and usedword:
    #             i = 0
    #             for word in sysword:
    #                 dictWords[word] = usedword[i]
    #                 i = i+1
    #     except Exception as e:
    #         reqLog = agog.tools.customLogger('requests')
    #         reqLog.error( traceback.format_exc( agog.traceLevel ) )
    #
    #     return dictWords

    def namesOfForms(self,lang='en'):
        _lang = agog.db.UserConfig().get('language')
        if not _lang:
            _lang = lang
        dictWords = {}
        stor = agog.serverman.Storage()
        try:
            text  = stor.open(('lang',_lang +'.csv'))
            usedword = text.split('\n')
            for line in usedword:
                if line:
                    wlist = line.split(';')
                    dictWords[wlist[0]] = wlist[1:]
        except Exception as e:
            reqLog = agog.tools.customLogger('requests')
            reqLog.error( traceback.format_exc( agog.traceLevel ) )


        return dictWords



    def conformDataBase(self):
        return agog.db.ConformDataBase().get()

    def reports(self):
        return ReportGen().loadToServiceDate()











class Form:

    pattern_name = ''

    def __init__(self, name=None):
        self.pattern_name = name
        self.patternStor = agog.serverman.Storage().changePath(('pattern',''))

    def manager(self,request):
        mode = ''
        if not self.pattern_name:
            path = request.get('path')
            self.pattern_name = path.replace('/','')

        if 'mode' in request:
            mode = request.pop('mode')

        if mode == 'write':
            answer = {'target': 'data-savrecord', #'[id=sysmessage]',
                        'content': []} #['Запись успешно сохранена',]}
            allow = True
            if '_lcode' in request:
                fac  = agog.serverman.FormsAccessControl()
                allow = fac.manager({'lcode':request.pop('_lcode'),
                                                '_line':'allowFormWritten'})
                if allow:
                    fac.update() # обновление времени блокировки

            if allow:
                content = self.maintenance(request)
            else:
                content = [{'status':'ERROR'}]

            answer['content'] = content

            return [answer]

        elif mode == 'cache':
            return self.search(request)
        elif mode == 'getpreset':
            return self.getPreset(request)
        elif mode == 'uniqcontrol':
            return self.uniqcontrol(request)
        else:
            if mode=='fast':
                request['mode'] = 'fast'
            return self.collector(request)



    def uniqcontrol(self,in_param):
        desc = agog.db.ConformDataBase().get('tables')
        table = in_param.get('table')
        field = in_param.get('field')
        value = in_param.get('value')

        err = ''
        out = [{'result':False,
                'status':'ERROR',
                'targer':'uniqcontrol'}]
        if ' ' in value:
            err = 'value'
        if table not in desc:
            err = 'table'
        if field not in desc:
            err = 'field'
        if not err:
            data = agog.db.dbSql()
            masterField = desc[table]['primarykey']

            id = in_param.get('id')
            if type(id).__name__ == 'int':
                masterCondition = ' AND {0}<>{1}'.format(masterField,id)
            else:
                masterCondition = ''

            sql  = 'SELECT {0} FROM {1} WHERE {0}="{2}"{3}'.format(field,table,value,masterCondition)
            # log(sql)
            rows = data.request(sql)
            if rows:
                out[0]['result'] = True
            out[0]['status'] = 'DONE'
        return out


    def query_determ(self,part,in_param,mode,master_fild={}):
        arguments = part.findall('sql/argument')

        if type(in_param).__name__=='list':
            list_fix_param = []
            for el_par in in_param:
                fix_param = self.check_param(el_par,self.etreetodict(arguments))
                fix_param.update(master_fild) # олновной id добавляется для всех побочных елементов
                list_fix_param.append(fix_param)
        elif  type(in_param).__name__=='dict':
            fix_param  = self.check_param(in_param,self.etreetodict(arguments))

        query = part.findtext('sql/'+mode+'query')

        if (query is None)or(isEmptyString(query)):#(not query.strip()):
            sql_gen_name = part.findtext('sql/'+mode+'generator/scriptname')

            if (sql_gen_name is not None)or(not isEmptyString(sql_gen_name)):#(sql_gen_name.strip()):
                curBase = agog.db.GlobVar().get('currentBase')
                gen = None
                # вызов функции из модуля
                if agog.serverman.Storage().hasPath(('bases',curBase+'/py/customsqlgen.py')):
                    customModul = importlib.import_module(curBase+'.py.customsqlgen')
                    if (sql_gen_name in dir(customModul)):
                        gen = getattr(customModul, sql_gen_name)
                if not gen:
                    if (sql_gen_name in dir(agog.sqlgen)):
                        gen = getattr(agog.sqlgen, sql_gen_name)


                def_param = self.etreetodict(part.findall('sql/'+mode+'generator/param')) # загрузка  параметров


                if mode=='read':
                    def_param.update(fix_param)

                    param = def_param

                elif mode=='write':
                    param = def_param
                    param['data'] = list_fix_param

                try:
                    if gen:
                        query = gen(**param)
                    else:
                        query = ''

                except Exception as e:
                    raise
        else:
            query = query.format(**fix_param)

#проверить как работает query_determ
        return query




    def replaceshield(self,text):
        reptext = text.replace('%7B','{') # возвращает экранированные скобки
        reptext = reptext.replace('%7D','}')

        return reptext


    def etreetodict(self,part):
        # преобразует часть xml объекта в словарь
        try:
            xml_str = etree.tostring(part[0],encoding ="unicode")
            xml_obj = objectify.fromstring(xml_str)
            root = xml_obj.__dict__
            if type(root).__name__=='dict':
                for kr in root:
                    if type(root[kr]).__name__=='ObjectifiedElement':
                        level = root[kr].__dict__
                        root[kr] = level
            return root
        except Exception as e:
            return {}


    def xpathtocss(self, path):
        try:
            s = path[path.index('['):len(path)]
            s = s.replace('"','')
            s = s.replace('@','')
        except Exception:
            s = ''
        # извлекает только 1 атрибут
        return s



    def timeout(self,exempl,param):
        start = datetime.now()
        exempl(param)
        finish = datetime.now()


    def check_param(self,param,pattern):
        xmlroot =  etree.parse(str(self.patternStor/'default_type.xml'))
        def_pattern = self.etreetodict(xmlroot.findall('var'))
        def_pattern.update(pattern)
        fix_param = param

        for kp in param:
            if kp in def_pattern:
                tp = def_pattern[kp]['type'] if 'type' in def_pattern[kp] else ''
                df = def_pattern[kp]['default'] if 'default' in def_pattern[kp] else ''
                fix_param[kp] = agog.tools.converter(param[kp],tp,df)

        return fix_param



    def maintenance(self,importdata):
        buff = copy.deepcopy(importdata)
        master_fild = {}
        sqlquery = ''
        try:
            AEH = agog.serverman.Storage().AEH
            xmlroot = AEH( etree.parse, str(self.patternStor/(self.pattern_name + '.xml')) ) #etree.parse( str(self.patternStor/(self.pattern_name + '.xml')))
            partxml = xmlroot.findall('part')
            answer  = []
            i_part = 0
            session = agog.db.Session().currentSession()
            login = session.get('login')
            uid = session.get('uid')
            acControl = agog.serverman.AccessControl()

            for part in partxml:
                i_part = i_part + 1
                cel_buffer = part.findtext('section/parentselector')
# проверить реакцию на отсутствие cel_buffer
                if cel_buffer is not None:
                    id_sec = cel_buffer[cel_buffer.find('"')+1:cel_buffer.rfind('"')]
                    arguments = part.findall('sql/argument')
                    if id_sec in importdata:
                        partName = part.findtext('name')
                        if partName is None:
                            partName = ''
                        ruleName = self.pattern_name+(('.'+partName) if partName else '')
                        inData = []
                        for data in importdata.get(partName):
                            inData.append(acControl.reviseDict('fields',ruleName,data,uid,'w'))
                        sqlquery = self.query_determ(part,inData,'write',master_fild)


                        if sqlquery:
                            base = agog.db.dbSql()
                            quantity = len(importdata[id_sec])

                            a_buf = base.request(sqlquery,'w',quantity)
                            agog.db.Cache().stamp()

                        else:
                            a_buf = None
# проверить результат елсли опреция не проведена
                        if a_buf is not None:
                            if len(a_buf):
                                result = {}
                                result = a_buf[0]
                                result['form']=id_sec
                                answer.append(result)
                            # первая запись - основная. ее номер сохраняется в
                            # master_fild и зтем используется в других записях (если нужно)
                            if i_part==1:
                                name_fild = xmlroot.findtext('masterfield')

                                if name_fild:
                                    if result['id']:
                                        val_fild = result['id']
                                    else:
                                        if len(importdata[id_sec]):
                                            if name_fild in importdata[id_sec][0]:
                                                val_fild = importdata[id_sec][0][name_fild]
# проверить работу master_fild
                                    master_fild[name_fild] = val_fild
                                    # print(master_fild)

            user = 'u'+str( session.get('uid') )
            mess = user+' #'+self.pattern_name+' #'+json.dumps(master_fild)+' #'+json.dumps(buff)
            agog.tools.customLogger('register').info(mess)

            agog.serverman.ChangeDetect(self.pattern_name).update()


            return answer
        except Exception:
            reqLog = agog.tools.customLogger('requests')
            reqLog.error( pprint.pformat(buff))
            raise




    def search(self,param):
        session = agog.db.Session().currentSession()
        user = session.get('login')
        countrows = 8 # countrows
        siz_d = 1 # size
        if 'countrows' in param:
             countrows = agog.tools.converter(param['countrows'],'int',countrows)
        else:
            # загрузка параметров по умолчанию из xml
            AEH = agog.serverman.Storage().AEH
            xmlroot = AEH( etree.parse, str(self.patternStor /(self.pattern_name + '.xml')) ) #etree.parse( str(self.patternStor /(self.pattern_name + '.xml')))
            partxml = xmlroot.findall('part')
            list_def_param = []
            for part in partxml:
                list_def_param.append(self.etreetodict(part.findall('sql/readgenerator/param')))
            if len(list_def_param) >0:
                try:
                    countrows = int(list_def_param[0]['countrows'])
                except Exception as e:
                    pass

        size = agog.tools.converter(param['size'] if 'size' in param else siz_d,'int',siz_d)
        start = (size * countrows)-countrows
        finish = start + countrows
        sli = [start,finish]
        param_str = json.dumps(param)
        hsh = hashlib.md5(param_str.encode('utf-8')).hexdigest()
        cache = agog.db.Cache()
        res_cache = None# cache.get(user,hsh,sli)

        if res_cache is not None:
            res_cache['countrows'] = countrows
            return [res_cache]
        else:
            res_coll = self.collector(param)
            if len(res_coll):
                cache.set(user,hsh,res_coll[0])
                data = {
                    'target':res_coll[0]['target'],
                    'content': res_coll[0]['content'][slice(*sli)], ##[slice(*sli)]
                    'cache_len':len(res_coll[0]['content']),
                    'countrows': countrows
                }
                return [data]

        return []


    def collector(self,param):
        reqLog = agog.tools.customLogger('requests')
        globalVar = agog.db.GlobVar()

        try:
            AEH = agog.serverman.Storage().AEH
            htmlroot = AEH( html.parse , str(self.patternStor / (self.pattern_name + '.html')) ) #html.parse( str(self.patternStor / (self.pattern_name + '.html')) )
            # удаление пробелов из шаблона
            htmlroot = agog.tools.htmlStrip(htmlroot)
            xmlroot = AEH( etree.parse, str(self.patternStor /(self.pattern_name + '.xml')) ) # etree.parse( str(self.patternStor /(self.pattern_name + '.xml')) )

        except Exception:
            raise



        partxml = xmlroot.findall('part')
        part_list = []
        part_page_mode = ''

        acControl = agog.serverman.AccessControl()


        for part in partxml:

            content_list = []
            cel_buffer = part.findtext('section/selector')
            tar_buffer =  part.findtext('section/parentselector')

            if (cel_buffer is not None) and (tar_buffer is not None):


                newrRootHtml = htmlroot.findall(tar_buffer)


                if len(newrRootHtml) > 0:
                    pattern_parthtml = newrRootHtml[0].findall(cel_buffer)
                else:
                    pattern_parthtml = []




                if len(pattern_parthtml) > 0:
                    txt_pattern = html.tostring(pattern_parthtml[0], encoding ="unicode", method="html")

                    try:
                        htmlroot.findall(tar_buffer)[0].remove(pattern_parthtml[0])
                    except: pass#удаление содержимого контейнера
                    part_page_mode = param['pp'] if 'pp' in param else 'full'
                    requestInDatabase = False

                    if 'new' in param:
                        tp = type(param['new']).__name__
                        newVal = 0
                        if tp =='str':
                            if param['new'].isdigit():
                                newVal = int(param['new'])
                        elif tp =='int':
                            newVal = param['new']
                        if newVal:
                            pass
                            # try: # рудимент
                            #     query = part.findtext('sql/bypresetquery')
                            #     query = query.format(new = newVal)
                            #     requestInDatabase = True
                            # except Exception as e:
                            #     raise

                    else:
                        reqLog.debug( param )
                        query = self.query_determ(part,param,'read')

                        if query is not None:
                            requestInDatabase = True

                    if requestInDatabase:
                        try:
                            base = agog.db.dbSql()
                            rows = base.request(query)
                            # reqLog.debug( query )
                        except Exception:
                            raise

                    else:
                        #загружаем шаблон
                        arguments = part.findall('sql/argument')
                        fix_param  = self.check_param(param,self.etreetodict(arguments))

                        arg = self.etreetodict(arguments)
                        def_param = {}
                        for key in arg:
                            def_param[key] = str(arg[key]['default']) if 'default' in arg[key] else ''
                        rows =(def_param,)

                    partName = part.findtext('name')
                    if partName is None:
                        partName = ''
                    ruleName = self.pattern_name+(('.'+partName) if partName else '')
                    session = agog.db.Session().currentSession()
                    uid = session.get('uid')

                    for _row in rows:

                        row = acControl.reviseDict('fields',ruleName,_row.copy(),uid,'r')
                        locReadFields = set(_row).difference(set(row))

                        for lrf in locReadFields:
                            _row[lrf] = 'ntvlbl'  # сокращение от not_available

                        rowTemp = acControl.reviseDict('fields',ruleName,_row.copy(),uid,'w')
                        locWriteFields = set(_row).difference(set(rowTemp))

                        # row = _row

                        parthtml = html.fromstring(txt_pattern)
                        delClass = _row.get('is_deleted')

                        # attrEl = parthtml.attrib
                        # attClass = attrEl.get('class')
                        # if attClass and delClass:
                        #     parthtml.set('class',attClass+" deleted")
                        if delClass:
                            self.addClass(parthtml,'deleted')

                        for el in part.findall('layout/element'):
                            cel_el = el.findtext('selector')
                            attr_el = el.findtext('attribute')
                            fild_el = el.findtext('fild')


                            # print('parthtml.findall(cel_el)[0]',cel_el,parthtml.findall(cel_el))

                            curElList = parthtml.findall(cel_el)
                            if len(curElList):
                                curEl = curElList[0]

                            if (cel_el is not None) and (len(curElList)):
                                if (fild_el is not None) and (fild_el!=''):
                                    if fild_el in row:
                                        row_val = row[fild_el]
                                        '''экранинование фигурных скобок '''
                                        if type(row_val).__name__ == 'str':
                                            row_val = row_val.replace('{','{{').replace('}','}}')

                                        if (attr_el is not None) and not (attr_el == ''):
                                            # если в HTML форме есть значения по умолчанию
                                            val = curEl.attrib[attr_el]
                                            val = self.replaceshield(val) # возвращает экранированные скобки

                                            if val!='':
                                                val = val.format(**row)
                                                curEl.set(attr_el,val)
                                            else:
                                                curEl.set(attr_el,
                                                    agog.tools.converter(row_val,'str',''))
                                        else:
                                            curEl.text = agog.tools.converter(
                                                        row_val,'str','')
                                    else:
                                        try:
                                            # parthtml.remove(parthtml.findall(cel_el)[0])

                                            # attrUnEl = curEl.attrib
                                            # attUnClass = attrUnEl.get('class')
                                            # curEl.set('class',attUnClass+" view-not-available")
                                            if fild_el in locReadFields:
                                                self.addClass(curEl,'view-not-available')
                                            else:
                                                parthtml.remove(parthtml.findall(cel_el)[0])


                                        except Exception:
                                            pass
                                else:
                                    text = curEl.text
                                    curEl.text = text.format(**format_dict(_row))

                                if fild_el in locWriteFields:
                                    self.addClass(curEl,'only-reading')


                        html_str = html.tostring(parthtml, encoding ="unicode", method="html")
                        try:
                            html_str = html_str.replace('{}','').format(**format_dict({})) # удаление всех {value}
                        except Exception as e:
                            pass

                        content_list.append(html_str)
                        htmlroot.findall(tar_buffer)[0].append(parthtml)

            if part_page_mode=='part':
                pr = {}
                pr['target'] = self.xpathtocss(tar_buffer)
                pr['content'] = content_list

                if len(content_list)>0 :
                    part_list.append(pr)

        if part_page_mode=='part':

            return part_list
        else:
            return html.tostring(htmlroot, encoding ="unicode", method="html")

    def addClass(self,htmlEl,className):
        attrUnEl = htmlEl.attrib
        attUnClass = attrUnEl.get('class')
        text = ''
        if attUnClass:
            text = attUnClass
        htmlEl.set('class',text+" "+className)


    def getPreset(self,param):
        tableName = self.pattern_name+'preset'
        desc = agog.db.ConformDataBase().get('tables')
        if tableName in desc:
            query = 'SELECT * FROM '+tableName
            base = agog.db.dbSql()
            rows = base.request(query)
            out = {
            'target': tableName,
            'content': rows
            }
            return [out]


class Message:
    def __init__(self):
        pass

    def manager(self,param):
        line = param.pop('_line')
        timeStamp = param.pop('_stampupdate') if '_stampupdate' in param else None
        currentStamp = agog.serverman.ChangeDetect('messages').has()
        if ( (timeStamp == None) and (currentStamp == None) or (currentStamp != timeStamp)):
            func = getattr(self,line)
            return [{'target':'Message','content':func(param),'_stampupdate':currentStamp}]
        else:
            return []


    def send(self,source,destList,mess,type):
        ''' type : window, notice, chat
            source/dest: system, u1,
            dest: ALL, g1, u1,
        '''

        strDestList = ''
        count = 0
        for dest in destList:
            blok = '(NOW(),"{0}","{1}","{2}","{3}")'.format(source,dest,mess,type)
            if count == 0:
                strDestList = blok
            else:
                strDestList = strDestList + ', ' + blok
            count += 1
        sql = '''INSERT INTO messages (mdate, msource, mdest,mess,type) VALUES {0}'''.format(strDestList)
        db = agog.db.dbSql()
        db.cursor.execute(sql)
        db.conn.commit()
        db.close()

    def doNotShow(self,param):
        idList = param.get('idList')
        idListString = ','.join( str(i) for i in idList )
        sql = 'UPDATE messages SET is_read = 1 WHERE mid in ({0})'.format(idListString)
        db = agog.db.dbSql()
        return db.request(sql,'w')

    def get(self,param):
        linkgen = agog.sqlgen.filterByLinkedTables
        maingen = agog.sqlgen.journal
        links  = param.get('links')

        if agog.sqlgen.checkSqlFilter(links):
            mainParam = {
                'table':      'messages',
                'id_name':    'mid',
                'id':         0,
                'countrows':  10,
                'filter': {
                        'links' : links,
                    }
            }
            sql = '''SELECT mess.mdate, mess.is_read, mess.mess, mess.msource,
                    mess.is_deleted, mess.mid, mess.type, mess.mdest
                    FROM ( SELECT * FROM {window}
                    UNION   SELECT * FROM {notice}  ) mess'''

            sql = sql.format(**{
                # 'chat': maingen(**mainParam), # будет использоваться в новой версии
                'window': linkgen('messages', links + ' && type = window && is_read = 0'),
                'notice': linkgen('messages', links + ' && type = notice && is_read = 0 && mdate > templateForDate')
            })
            sql = sql.replace('"templateForDate"', '(NOW() - INTERVAL 5 MINUTE)')

            return agog.db.dbSql().request(sql)



if __name__ == '__main__':
    pass
