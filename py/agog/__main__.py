print('__main__.py')
import sys,json, pathlib,importlib,traceback
import time

nameBase = None
rootPath = None
_line = None
if len(sys.argv)>1:
    if sys.argv[1]:
        nameBase = sys.argv[2]
        rootPath = pathlib.Path(sys.argv[3])
        _line = sys.argv[1]
        # cnt = Control()
        # cnt.backupBase()
if not rootPath:
    rootPath = pathlib.Path('/var/www/buh/')

pyPath = rootPath / 'py'
basesPath = rootPath / 'bases'

sys.path.append( str(pyPath) )
sys.path.append( str(basesPath) )


import agog
agog.serverman.Storage().ini(rootPath)
agog.tools.Logger()


if _line == 'backup':
    agog.db.GlobVar().set('currentBase',nameBase)
    try:
        cont = agog.serverman.Control()
        cont.backupBase(nameBase)
        cont.backupStructure(nameBase)
    except Exception as e:
        agog.tools.customLogger('requests').error( traceback.format_exc( agog.traceLevel ) )
        raise

elif _line == 'currentEvents':
    agog.db.GlobVar().set('currentBase',nameBase)
    try:
        module = importlib.import_module(nameBase)
        if 'currentEvents' in dir(module):
            func = getattr(module, 'currentEvents')
            func()
    except Exception as e:
        agog.tools.customLogger('requests').error( traceback.format_exc( agog.traceLevel ) )
        raise

# ///////////////////////////////////////////////////////////////////////////////////////////////
# //////////////////////////////////////////////////////////////////////////////////////////////
# //////////////////////////////////////////////////////////////////////////////////////////////

#
agog.serverman.iniVar()

links = '( transactions.source@accounts.aid = 1 || transactions.dest@accounts.aid = 1 )  && transactions.is_deleted = 0'

print(agog.sqlgen.filterByLinkedTables('transactions',links))

# print(agog.serverman.AccessControl().check('fields','users_form.cassa','curr',1,'r'))

# agog.content.Profile().setLanguage({'language':'ru'})
# agog.content.Profile().availableLanguages()
# print(agog.content.ServiceData().namesOfForms('ru'))

# print(agog.db.UserConfig().get())

# agog.serverman.Control().backupStructure('buh')
# agog.db.GlobVar().set('currentBase','demo')
# agog.db.dbMan().create('buh')
# print(agog.db.dbMan().start())




# тестовый старт системы
# agog.tools.emptyFolder( '/var/www/buh/RAM/temp' )
# agog.serverman.Control().restart_apache()
# agog.serverman.Manager().start()

# print(agog.db.Config('buh').get())

# ============== sqlGen ========


# agog.serverman.Manager().start()
# print(agog.db.testDb('buh'))

# agog.tools.Logger()

# ================== dbSql ===========

# print(agog.db.dbSql('test').status)



# =================== control
# agog.serverman.Control().backupStructure()
# agog.serverman.Storage().setPermission('/var/www/buh/bases/buh/backup/db/test_1/test_2/file.f')
# agog.serverman.Control().restoreBase('buh_2019-05-08_13.58.51.842647.sql.gz')
# print( agog.db.GlobVar().get('baseList1','ramdisk') )
# agog.serverman.Control().getLocalFileList()
# ==================== Control ===============

# cont = agog.serverman.Control()
#
#
# ls = cont.manager({'_line':'getFileList'})
#
# for el in ls[0]['content']:
#     print(el)

# print('file list',ls)

# ================= sqlDb =================
# ms = agog.content.Message()
# ms.send('system',['u1','u2','u3'],'===========','window')
# links = 'mdest = u1 && mdest = ALL && mdest = g1'
# ==================== WEB loginGenerator ==============

# out = agog.serverman.Web({}).loginGenerator()
# print('out',out)





# ======================== Message ====================

# mess = agog.content.Message()
#
# param = {
#     '_line':'doNotShow',
#     # '_stampupdate': 1556298704.2321665,
#     # 'links': 'mdest = u1 && mdest = ALL'
#     'idList':[1,7]
# }
# print(mess.manager(param))


# =================== UpdateIndicator ========
# test = agog.tools.TimeOut()
# mess = agog.content.Message()
#
#
#
#
# test.start()
# test.rec('калибровка')
# print(test.out())
# test.reset()
#
#
#
# ui = agog.serverman.Indicator('qwerqwer')
#
# tm = ui.update()
# print(test.out())
# test.reset()
# test.start()
# # time.sleep(1)
# test.rec('tm2')
# tm2 = ui.update()
# print(test.out())
# test.reset()
# test.start()
#
# test.rec('has')
# ui.has(tm)
# print(test.out())
# test.reset()
#
# test.reset()
# test.start()
#
# test.rec('request')
# param = {
#     'links': 'mdest = u1 && mdest = ALL && mdest = g1'
# }
# mess.get(param)
# print(test.out())

# print('tm',tm)
# print('tm2',tm2)
# print('==>', ui.has(tm) )



# ========================== Start ===================
# agog.serverman.Manager().start()

# ==================== Storage =================

# st = agog.serverman.Storage()
# path = pathlib.Path('/var/www/buh/bases/buh/pattern/users_list.html')



# try:
#     f = open(str(path))
#     print(f)
# except Exception as e:
#     if e.args == 'Permission denied':
#
#         print(e.args)
#     # for obj in dir(e):
#     #     attr = getattr(e,obj)
#     #     print(obj,attr)
#     # print()
# def AEH(*arg):
#     '''access error handling'''
#     '''обработка ошибок доступа к файлу
#     arg :
#     1 = функция
#     2 = path (для проверки)
#     [3] = если None то функция выполняестя без аргументов
#     '''
#
#     call = arg[0]
#     path = arg[1]
#
#     param = None
#     if len(arg)==2:
#         param = arg[1:]
#     elif len(arg)>2:
#         if arg[2]:
#             param = arg[1:]
#
#
#     retryCount = 0
#     while True:
#         retryCount +=1
#         try:
#             if param:
#                 print('param',param)
#                 return call(*param)
#             else:
#                 return call()
#         except Exception as e:
#             if retryCount > 2:
#                 # break
#                 return None
#             # if e.args[0] == 13:
#             st.setPermission(path)
#             continue
#         # break
#         return None
#
# from lxml import html
# print(st.hasAccess(path))
# h = AEH(html.parse,str(path))

# h = html.parse(str(path))
# print(h)
# with open(str(path)) as f:
#     print(f)
# f =  AEH(open,str(path))
# print(f)

# ============================ WEB ===================================
# data = {
#     1:[
#         {
#             'target':{
#                     # 'location':'custom',
#                     'module':'serverman',
#                     'class':'Control',
#             },
#               'param': {
#                     '_line': "getFileList"
#                 }
#
#         }
#     ]
# }


# data = {
#     1:[
#         {
#             'target':{
#                 'module':'content',
#                 'class':'ReportGen',
#             },
#             'param':{
#                 '_line': "getReport",
#                 'dateRange': [ "2019-04-01", "2019-04-30" ],
#                 'links': "side = 0",
#                 'period': "4",
#                 'route': "balance",
#                 'scriptName': "allCounts",
#             }
#         }
#     ]
# }

# data = {
#     'servicedata':{
#         # 'cachedWords':{},
#         # 'conformDataBase':{},
#         'currentUser':{},
#         # 'namesOfForms' : { 'lang': "ru" },
#         # 'patterns':{},
#         # 'presets':{},
#         # 'reports':{},
#     }
# }
# Manager().start()
# data = {
#     1:[
#         {
#             'target':{
#                 'module':'content',
#                 'class':'Profile',
#             },
#             'param':{
#                 '_line': "getReport"
#
#             }
#         }
#     ]
# }
#
#
# data = json.dumps(data).encode('utf-8')
#
# # print(data)
#
# param = {
#     'cookie':'buh=1a0ba6ff1155bd1d2a35ca8b2939bf4e',
#     # 'path': '/buh/file/css/ico.css',
#     # 'data':b'login=admin&password=admin',
#     'data': data,
#     # 'data':'',
#     'type': 'application/json',
#     'path': '/buh/'
# }
# data = {
#         101:[
#         {
#             "target":{
#                 "module":"content",
#                 "class":"Form"
#                 },
#             "param":{
#                 "pp":"part",
#                 "path":"/setbudget/"
#                 }
#         }]
#     }
#
#
# param = {
#     'client': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:63.0) Gecko/20100101 Firefox/63.0',
#     'path': '/file/html/welcome_page.html',
#     'method': 'GET',
#     # 'data': json.dumps(data).encode('utf-8'),
#     'data':'',
#     'cookie': 'buh=0e1f07935ffc1a5ba9f45923e0c9306a; ml=ru',
#     'type': 'application/json',
#     'ip': '127.0.0.1',
#     'queue': '1559983221157977'
#     }
# #
# #
# #
# #
# #
# w = agog.serverman.Web(param)
# print(w.do())


# ==================== TaskMan =================
#
# def testTaskMan():
#     agog.serverman.iniVar()
#     tm = agog.serverman.TaskMan()
#     # tm.configToCron()
#     tm.removeAllTask()

# testTaskMan()
