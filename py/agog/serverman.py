#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import mysql.connector
import inspect, os, re, time, base64
import sys, traceback
import pathlib, importlib, shutil
import hashlib
import ftplib
import smtplib
import json, hjson
import flock
import mimetypes
import calendar
from lxml import html
from decimal import Decimal

from datetime import datetime,timedelta, date
import pprint
import logging
import subprocess
import getpass
from crontab import CronSlices, CronTab

agog  = sys.modules[__package__]

def sendmail(message):
    try:
        mailini = agog.db.Config().get('mail')
        smtpObj = smtplib.SMTP( mailini.get('smtp') , 587)
        smtpObj.starttls()
        smtpObj.login( mailini.get('login') , mailini.get('password') )
        smtpObj.sendmail( mailini.get('login') , mailini.get('sendto') ,message)
        smtpObj.quit()
    except Exception as e:
        reqLog = agog.tools.customLogger('requests')
        reqLog.error( traceback.format_exc( agog.traceLevel ) )




class ChangeDetect:
    '''Инструмент для слежения за обновлением информации'''
    def __init__(self, name):
        nameBase = agog.db.GlobVar().get('currentBase')
        self.name = nameBase +'.chndt.'+ name

    def update(self):
        stor = Storage()
        f = stor.getFileObject(('temp',self.name),'w')
        currTime = time.time()
        f.write(str(currTime))
        f.close()
        return currTime

    def has(self):
        stor = Storage()
        path = stor.changePath(('temp',self.name))
        if path:
            cont = stor.open(path)
            currTimeStamp = float(cont)
            return currTimeStamp
        else:
            return self.update()




class TaskMan:
    '''управляет Задачами в Cron'''
    def __init__(self):
        self.mainlog = logging.getLogger('main')

    def removeAllTask(self):
        sysUserName = getpass.getuser()
        cron = CronTab(user=sysUserName)
        pattern = re.compile('TaskMan*')
        jobs = cron.find_comment(pattern)
        for j in jobs:
            cron.remove(j)
        cron.write()


    def configToCron(self,baseName=None):
        db = agog.db
        if not baseName:
            curBase = db.GlobVar().get('currentBase')
        else:
            curBase = baseName
        tasks = db.Config(baseName).get('tasks')
        sysUserName = getpass.getuser()
        cron = CronTab(user=sysUserName)

        FILENAME = inspect.getframeinfo(inspect.currentframe()).filename
        scriptPath = pathlib.Path(os.path.dirname(os.path.abspath(FILENAME)))

        lineParam = 'python3 {pythonScript} {task} {nameBase} {ROOTPATH}'

        for task in tasks:
            if CronSlices.is_valid(task[1]):
                name = 'TaskMan.'+curBase+'.'+task[0]
                cron.remove_all(comment=name)
                command  = lineParam.format(**{
                    'pythonScript': str(scriptPath),
                    'task' : task[0],
                    'nameBase' : curBase,
                    'ROOTPATH' : str(Storage().ROOTPATH)
                })
                job = cron.new(command=command,comment=name)
                job.setall(task[1])
            else:
                self.mainlog.error('error cron value:' + name + ' '+ task[1])
        cron.write()


class Manager:
    '''Управление многопоточными задачами и скрипты старта системы'''
    def __init__(self):
        pass
    def executeMonopoly(self,call,param,domen,taskName,mode='pass'):
        '''mode = pass / wait'''
        ''' функция гарантирует что call будет выполнено только одним процессом или потоком'''
        st = Storage()
        mainlog = logging.getLogger('main')
        name = domen+'.'+taskName
        hasPath = st.hasPath(('temp','system.task.'+name))
        f = st.getFileObject(('temp','system.task.'+name),'w')

        '''system.task.** - системный файл (system), задача (task),'''

        def runTask(_param):
            try:
                call(_param)
            except Exception as e:
                mainlog.error(e)
                f.write('fail')
                f.close()
                mainlog.error('task %s is not complete'%name)
                raise

        if mode=='wait':
            with flock.Flock(f, flock.LOCK_EX):
                if not hasPath:
                    '''функция call выполняестя тем процессом, которы первый создал task'''
                    runTask(param)

        elif mode=='pass':
            try:
                with flock.Flock(f, flock.LOCK_EX|flock.LOCK_NB):
                    if not hasPath:
                        runTask(param)
            except Exception as e:
                pass
        f.close()



    def start(self):
        agog.tools.Logger()
        mainlog = logging.getLogger('main')
        mainlog.info('system startup')
        self.executeMonopoly(self.buildingListBases,None,'main','start','wait')
        baseList = agog.db.GlobVar().get('baseList','ramdisk')
        if baseList:
            for base in baseList:

                def createStructure(_base):
                    agog.db.GlobVar().set('currentBase',_base)
                    agog.db.ConformDataBase().createStructure()

                self.executeMonopoly(createStructure,base,base,'createStructure','pass')
        else:
            mainlog.warning('no base!')




    def buildingListBases(self,param):
        mainlog = logging.getLogger('main')

        try:
            treeList = []
            st = Storage()
            path = str(st.changePath(('bases','')))
            tree = os.walk(path)

            for i in tree:
                treeList.append(i)
            baseList = treeList[0][1]
            agog.db.GlobVar().set('baseList',baseList,'ramdisk')
            mainlog.info('database list created: '+pprint.pformat(baseList))

            # установка событий в cron
            tm = TaskMan()
            tm.removeAllTask()
            for base in baseList:
                tm.configToCron(base)
                mainlog.info('set event in cron for  '+base)

        except Exception as e:
            mainlog.error( traceback.format_exc( agog.traceLevel ) )
            raise






class Storage(object):
    '''
    roles: profile, pattern, currentConfig, js, css

    path = 'str'
        or    PosixPath
        or    (role, fileName)
    '''
    ROOTPATH = None

    def __init__(self):
        pass

    def __new__(cls, *args, **kw):
        if not hasattr(cls, '_instance'):
            orig = super(Storage, cls)
            cls._instance = orig.__new__(cls, *args, **kw)
        return cls._instance

    def ini(self, ROOTPATH ):
        self.ROOTPATH = ROOTPATH

    def setPermission(self,path):
        _path = pathlib.Path(str(path))
        retryCount = 0
        while True:
            retryCount +=1
            try:
                line = 'sudo chmod -R 777 '+str(_path)
                # print(str(_path))
                with subprocess.Popen(line, shell=True,stdout=subprocess.PIPE) as proc:
                    proc.stdout.read()
                if not _path.exists():
                    raise Exception('no file '+str(_path))
                else:
                    return True
            except Exception as e:
                logging.getLogger('main').debug(e)
                if retryCount > agog.accessDepth:
                    return None
                _path = _path.parent
                continue
            return None




    def hasAccess(self,path):
        strPath = str(path)
        read = os.access(strPath, os.R_OK)
        write = os.access(strPath, os.W_OK)
        return (read and write)


    def AEH(self,*arg,**kw):
        '''access error handling
            обработка ошибок доступа к файлу
            arg :
            1 = функция
            2 = path (для проверки)
            [3] = если None то функция выполняестя без аргументов
        '''

        call = arg[0]
        path = arg[1]

        param = None
        if len(arg)==2:
            param = arg[1:]
        elif len(arg)>2:
            if arg[2]:
                param = arg[1:]

        retryCount = 0

        while True:
            retryCount +=1
            try:
                if param:
                    return call(*param,**kw)
                else:
                    return  call()
            except Exception as e:
                if retryCount > 2:
                    return None
                if not self.hasAccess(path):
                    self.setPermission(path)
                    continue
            return None


    def roleToPath(self,rolePath,default=True):
        globalVar = agog.db.GlobVar()

        pathList = []
        if (rolePath[0] == 'profile'): # хранит настроики и данные пользователя
            session = agog.db.Session().currentSession()
            uid = session.get('uid')
            currentBase = globalVar.get('currentBase')
            # uid = globalVar.get('cookie').get('uid')
            pathList.append(self.ROOTPATH /  'bases' / currentBase/ 'profiles' / str(uid) / rolePath[len(rolePath)-1] )
            if default:
                pathList.append(self.ROOTPATH / 'bases' / currentBase / 'profiles' / 'default' / rolePath[len(rolePath)-1])

        elif (rolePath[0] == 'backup'):
            currentBase = globalVar.get('currentBase')
            pathList.append(self.ROOTPATH / 'bases' / currentBase /  'backup' / rolePath[len(rolePath)-1] )

        elif (rolePath[0] == 'temp'): # констаны и временные данные относящиеся к конктной базе
            pathList.append(self.ROOTPATH / 'RAM' / 'temp' / rolePath[len(rolePath)-1] )

        elif (rolePath[0] == 'bases'):
            pathList.append(self.ROOTPATH / 'bases' / rolePath[len(rolePath)-1] if len(rolePath)>1 else '' )
        elif (rolePath[0] == 'root'):
            pathList.append(self.ROOTPATH / rolePath[len(rolePath)-1] if len(rolePath)>1 else '' )

        elif (rolePath[0] == 'mainlog'):
            pathList.append(self.ROOTPATH / 'logs' / rolePath[len(rolePath)-1] if len(rolePath)>1 else '' )

        elif (rolePath[0] == 'session'):
            pathList.append(self.ROOTPATH / 'RAM' / 'session' / rolePath[len(rolePath)-1] )

        elif (rolePath[0] == 'pattern'):
            currentBase = globalVar.get('currentBase')
            pathList.append(self.ROOTPATH / 'bases' / currentBase /  'pattern' / rolePath[len(rolePath)-1] )
            if default:
                pathList.append(self.ROOTPATH / 'pattern' / rolePath[len(rolePath)-1] )
        elif (rolePath[0] == 'lang'):
            currentBase = globalVar.get('currentBase')
            pathList.append(self.ROOTPATH / 'bases' / currentBase /  'lang' / rolePath[len(rolePath)-1] )
        elif (rolePath[0] == 'accesscontrol'):
            currentBase = globalVar.get('currentBase')
            pathList.append(self.ROOTPATH / 'bases' / currentBase /  'accesscontrol' / rolePath[len(rolePath)-1] )

        return pathList


    def resolve(self,path,default=True):

        typeName = type(path).__name__
        if((typeName == 'tuple') or (typeName == 'list')):
            return self.roleToPath(path,default)
        elif (typeName == 'str'):
            return [pathlib.Path(path)]
        elif (typeName == 'PosixPath'):
            return [path]

    def rightPath(self,pathList):
        for el in pathList:
            if self.AEH(el.exists,el,None):
                return el

    def hasPath(self,path):
        if self.rightPath(self.resolve(path)):
            return True
        else:
            return False

    def save(self, path, data):

        def saveFile(realPath):
            f = self.AEH(open, str(realPath),'w', encoding='utf-8')
            f.write(data)
            f.close()

        pathList = self.resolve(path,False)
        if len(pathList):
            parentFolder = pathList[0].parent
            if not self.AEH(parentFolder.exists,path,None):
                parentFolder.mkdir(parents=True)
            saveFile(pathList[0])
            return 'DONE'

    def open(self, path):
        realPath = self.changePath(path)
        if realPath:
            with open(str(realPath),'r',encoding="utf-8") as f:
                return f.read()

    def changePath(self,path):
        pathList = self.resolve(path)
        return self.rightPath(pathList)

    def getFileObject(self,path,mode):
        '''mode: w,r,bw,br'''
        pathList = self.resolve(path,False)
        if len(pathList):
            realPath = pathList[0]
            if not self.AEH(realPath.parent.exists,realPath,None):
                if mode.find('w')>-1:
                    parentFolder = realPath.parent
                    parentFolder.mkdir(parents=True)
                else:
                    return None
            if mode.find('w')>-1:
                return self.AEH(open,str(realPath),mode)
                # return open(,mode)
            elif mode.find('r')>-1:
                if realPath.exists():
                    return open(str(realPath),mode)


class FormsAccessControl:
    href = ''
    lcode = ''
    uid = 0
    base = None
    timeLock = 10
    _line = ''

    def __init__(self):
        '''
        JSON:
        param = {
            href: <str>,
            lcode: <str>,
            uid: <int>,
            _line:<str>
        }
        '''
        '''! оптимизировать код'''

        self.base = agog.db.dbSql()

    def manager(self,param):
        self.href = param.get('href')
        self.lcode = param.get('lcode')
        #self.uid = param.get('uid')
        self.uid = agog.db.GlobVar().get('session').get('uid')

        self._line = param.get('_line')


        return getattr(self, self._line)()

    def update(self):
        sql = '''
            UPDATE temp_formlock SET tlock = "{0}" WHERE lcode = "{1}"
        '''
        self.base.request2(sql.format(
                    str(datetime.now()),
                    self.lcode
                    ),'w')
    def set(self):
        rows = self.has()
        out  = [
        {'report': rows,
        'status': 'RECORDLOCK'}
        ]
        def newSet():
            sql = '''
                INSERT INTO temp_formlock (href,uid,tlock,lcode)
                VALUES ("{0}","{1}","{2}","{3}")
            '''
            result = self.base.request2(sql.format(
                        self.href,
                        self.uid,
                        str(datetime.now()),
                        self.lcode
                        ),'w')
            return result

        if len(rows)==0 :
            self.delete()
            out = newSet()
        return out


    def has(self):
        dt = datetime.now()-timedelta(minutes=self.timeLock)
        sql = '''
        SELECT tf.href, tf.uid,DATE_FORMAT(tf.tlock, "%Y-%m-%d %T") tlock , us.login
             FROM temp_formlock tf
            INNER JOIN users us ON us.uid = tf.uid
            WHERE href = "{0}" AND tlock > "{1}"
            '''
        return self.base.request2(sql.format(self.href,str(dt)))

    def allHas(self):
        dt = datetime.now()-timedelta(minutes=self.timeLock)
        sql = '''
        SELECT tf.href, tf.uid,DATE_FORMAT(tf.tlock, "%Y-%m-%d %T") tlock , us.login
             FROM temp_formlock tf
            INNER JOIN users us ON us.uid = tf.uid
            WHERE  tlock > "{0}"
            '''
        return self.base.request2(sql.format(str(dt)))

    def allowFormWritten(self):
        out = False
        sql = '''
        SELECT * FROM temp_formlock WHERE lcode = "{0}"
        '''
        if self.lcode:
            rows = self.base.request2(sql.format(self.lcode))
            if len(rows):
                out = True
        return out

    def delete(self):
        '''Если есть href, удаляет по нему у всех пользователей. если нет -
        удаляет все блокировки текущего пользователя'''
        if self.href:
            where = 'href = "{0}"'.format(self.href)
        else:
            where = 'uid = "{0}"'.format(self.uid)
        sql = 'DELETE FROM temp_formlock WHERE ' + where
        self.base.cursor.execute(sql)
        self.base.conn.commit()
        return []


class Control:
    _line = None

    def __init__(self):
        stor = Storage()
        self.backupPath = stor.changePath(('backup',''))
        self.backupConfig = agog.db.Config().get('backup')


        loc = self.backupConfig.get('local')
        self.localPath  = loc.get('path')
        if not self.localPath :
            self.localPath  = self.backupPath / 'data'


        self.useftp = True



    def ftpconnect(self):
        try:
            ftpini = self.backupConfig.get('ftp')
            ftp = ftplib.FTP()
            ftp.connect(ftpini['host'],int(ftpini['port']))
            ftp.login(ftpini['user'],ftpini['password'])
            ftp.cwd(ftpini['path'])
            return ftp
        except Exception as e:
            agog.tools.customLogger('requests').error( traceback.format_exc( agog.traceLevel ) )
            self.useftp = False
            raise




    def manager(self,param):
        '''
        JSON:
        param = {
            _line:<str>
        }
        '''
        self._line = param.pop('_line')
        return [{ 'target': self._line, 'content': getattr(self, self._line)(**param)}]

    def logout(self):
        session = agog.db.GlobVar().get('session')
        agog.db.Session().delete(session.get('sessionId'))


    def restart_apache(self):
        result = 'error'
        with subprocess.Popen('sudo /etc/init.d/apache2 restart', shell=True,stdout=subprocess.PIPE) as proc:
            result = proc.stdout.read()
            logging.info(result)

        return result

    def reboot_server(self):
        formLock = FormsAccessControl().allHas()
        if not len(formLock):
            with subprocess.Popen('sudo shutdown -r now', shell=True,stdout=subprocess.PIPE) as proc:
                logging.info(proc.stdout.read())
        else:
            return formLock



    def quotaCheck(self,fileList,storage):
        amount = 0
        for el in fileList:
            amount += el[1]

        conf = self.backupConfig.get(storage)
        quota = int(conf.get('quota'))

        if amount > quota:
            sendmail('Backup has increased quota. '+str(amount)+' byte')
            return True



    def getAllFile(self):
        try:
            ftpList = self.getFtpFileList()
        except Exception as e:
            ftpList = []
            agog.tools.customLogger('requests').error(e)
        localList = self.getLocalFileList()

        out = {
            'ftp': ftpList,
            'local': localList
        }
        return out

    def getLocalFileList(self):
        tree = os.walk( str(self.localPath) )
        fileList = []
        out = []
        for i in tree:
            fileList = i[2]

        for name in fileList:
            size = os.stat( str( self.localPath / name ) ).st_size
            out.append([name,size])
        return out



    def getFtpFileList(self):
        try:
            ftp = self.ftpconnect()
            fileList = []
            def add(el):
                thisEl = el.split(None)
                fileList.append( [ thisEl[-1].lstrip() , int(thisEl[-5]) ] )
            ftp.retrlines("LIST",add)
            ftp.quit()

            return fileList
        except Exception as e:
            return None

    def execute(self,cmd):
        with subprocess.Popen(cmd, shell=True,stdout=subprocess.PIPE) as proc:
            proc.stdout.read()
            agog.tools.customLogger('requests').debug(cmd)


    def backupStructure(self,nameBase=None):
        # список таблиц с системными данными, которые нужно оставить в чистой базе
        tableList = ['agog', 'enumerations', 'reportscripts']

        if not nameBase:
            nameBase = agog.db.GlobVar().get('currentBase')

        dbini = agog.db.Config(nameBase).get('mysql')
        stor = Storage()
        backPath = self.backupPath / 'empty_db'
        path = backPath  / 'structure.sql'
        stor.setPermission(path)
        dbini['path'] = str(path)
        copyStucture = 'mysqldump  --user="{user}" --password="{password}" -h {host} --no-data  {database} | sed "s/ AUTO_INCREMENT=[0-9]*\\b//" > {path}'

        cmd = copyStucture.format(**dbini)

        # print(cmd)
        self.execute(cmd)
        path = backPath  / 'initfill.sql'
        stor.setPermission(path)
        dbini['path'] = str(path)
        dbini['tablelist'] = ' '.join(tableList)
        copyInit = 'mysqldump  --user="{user}" --password="{password}" -h {host}  --no-create-info -n {database} {tablelist} > {path}'
        self.execute(copyInit.format(**dbini))
        agog.tools.customLogger('requests').info('created structure database for '+nameBase)


    def backupBase(self,nameBase=None):
        if not nameBase:
            nameBase = agog.db.GlobVar().get('currentBase')
        stor = Storage()
        dbini = agog.db.Config(nameBase).get('mysql')
        tempPath = self.backupPath / 'temp'
        _datetime = str(datetime.now())
        _datetime = _datetime.replace(':','.').replace(' ','_')
        fileName = nameBase+'_'+_datetime+'.sql.gz'

        def copyToFtp():
            self.localToFtp( str(fileName) )
            fileList = self.getFtpFileList()
            if self.quotaCheck( fileList , 'ftp' ):
                self.copyControlFtp(fileList)

        def copyToLocal():
            shutil.copy( str(path) , str(dest) )
            fileList = self.getLocalFileList()
            if self.quotaCheck( fileList , 'local'):
                self.copyControlLocal(fileList)


        path = tempPath / fileName
        dest = self.localPath / fileName
        stor.setPermission(dest)
        stor.setPermission(path)
        dbini['path'] = str(path)
        cmd = 'mysqldump  --user="{user}" --password="{password}" -h {host}  {database}  | gzip > {path}'
        self.execute(cmd.format(**dbini))
        if path.exists():
            log = agog.tools.customLogger('requests').info
            log('created a copy database for '+nameBase)
            if self.backupConfig.get('default')=='ftp':
                try:
                    copyToFtp()
                    log('send to ftp server a copy database '+nameBase)
                except Exception as e:
                    log(e)
                    copyToLocal()
                    log('database '+nameBase+ ' copy saved local')
            elif self.backupConfig.get('default')=='local':
                copyToLocal()
                log('database '+nameBase+ 'copy saved local')

            agog.tools.emptyFolder( str(tempPath) )

        self.backupStructure(nameBase)


    def restoreBase(self,namefile,fromStorage):
        if fromStorage == 'ftp':
            self.ftpToLocal(namefile)
            path = self.backupPath / 'temp' / namefile
        elif fromStorage == 'local':
            path = self.backupPath / 'data' / namefile

        out = None
        if path.exists():
            log = agog.tools.customLogger('requests').info
            log('copied backup file '+namefile)
            dbini = agog.db.Config().get('mysql')
            dbini['path'] = str(path)
            cmd = 'gunzip < {path} | mysql --user="{user}" --password="{password}" -h {host}  {database}'
            with subprocess.Popen(cmd.format(**dbini), shell=True,stdout=subprocess.PIPE) as proc:
                out = proc.stdout.read()
                log('database  restore from backup '+namefile)

        agog.tools.emptyFolder( str(self.backupPath / 'temp') )
        return out

    def localToFtp(self,namefile):
        ftp = self.ftpconnect()
        path = self.backupPath / 'temp' / namefile
        with open( str(path), 'rb') as fobj:
            ftp.storbinary('STOR ' + namefile, fobj, 1024)
        ftp.quit()


    def ftpToLocal(self,namefile):
        ftp = self.ftpconnect()
        path = self.backupPath / 'temp' / namefile
        Storage().setPermission(path)
        with open( str(path), 'wb') as local_file:
            ftp.retrbinary('RETR ' + namefile, local_file.write)
        ftp.quit()


    def copyControlFtp(self,fileList):
        ftp = self.ftpconnect()
        def call(name):
            ftp.delete(name)
        self.deleteCopies(call,fileList,'ftp')
        ftp.quit()

    def copyControlLocal(self,fileList):
        def call(name):
            os.remove( str(self.localPath / name) )
        self.deleteCopies(call,fileList,'local')





    def deleteCopies(self,call,fileList,storage):
        fileList.reverse()
        backConf = self.backupConfig.get(storage)
        mincop = int(backConf.get('mincopies'))
        minday = timedelta(days=int(backConf.get('minday')))
        currDate = datetime.now()
        def checkDate(namefile):
            datefile = datetime.strptime( namefile.split('_')[1] ,"%Y-%m-%d")
            dalta = currDate - datefile
            return dalta > minday

        i = 0
        for el in fileList:
            i += 1
            if i > mincop:
                if checkDate(el[0]): # удалаяет только если файл старше чем указанное число дней
                    call(el[0])






class AccessControl:
    """ Каждый файл (например tables.ac и groups.ac) - набор правил
        содержит секции с ключами ( например секция fields с ключем users.password ).
        каждый ключ может содержать разрешения для групп. пустой ключ означает запрет для всех

        Внимание UID хранится в вормате string для совместимоти с hjson
    """
    error = ''
    def setDefault(self): ## дописать
        default = {
            "fields":{
                    "users_list.journal": {
                                      "password": {
                                      },
                                  },
            },

            "groups":{
                    "group": [
                            "root"
                     ],
                      "uid": {

                      }

            }
        }
        # root = agog.db.Config().get('root')
        default["groups"]["uid"][0] = ["root"]
        for name in default.keys():
            try:
                f = Storage().getFileObject(('accesscontrol',name+'.ac'),'w')
                json.dump(default[name],f,indent=10)
                # print(name+' ok')
                f.close()
            except Exception as e:
                self.errorLog( traceback.format_exc( agog.traceLevel ) )

    def __init__(self):
        self.fields = {}
        self.groups = {}
        self.loadRules()
        self.errorLog = agog.tools.customLogger('requests').error

    def _open(self,name):
        dv = agog.db.GlobVar()
        nameBase = dv.get('currentBase')
        rulesObj = dv.get(nameBase+'.accnt.'+name,'ramdisk')
        if not rulesObj:
            rules = agog.serverman.Storage().open(('accesscontrol',name+'.ac'))
            rulesObj = hjson.loads(rules)
            dv.set(nameBase+'.accnt.'+name,rulesObj,'ramdisk')

        return rulesObj

    def loadRules(self):
        err = ''
        for name in self.__dict__.keys():
            try:
                # f = Storage().getFileObject(('accesscontrol',name+'.ac'),'r')

                self.__dict__[name] = self._open(name)
                # f.close()
            except Exception as e:
                err = traceback.format_exc( agog.traceLevel )
                self.errorLog( err )
        self.error = err


    def dumpRules(self): ## дописать
        for name in self.__dict__.keys():
            try:
                f = Storage().getFileObject(('accesscontrol',name+'.ac'),'w')
                json.dump(self.__dict__[name],f,indent=10)
                f.close()
            except Exception as e:
                self.errorLog( traceback.format_exc( agog.traceLevel ) )

    def ruleAnalysis(self,rules,objName,uid,mode):

        permissions = {}
        # print('rules',rules)
        if 'all' in rules:
            permissions  = rules['all']
        elif objName in rules:
            permissions  = rules[objName]
        else:
            return True

        if len(permissions):
            stackGroup  = self.groups['uid'].get(str(uid))
            if stackGroup is None:
                stackGroup  = ['all']
            # print('==',stackGroup,permissions)

            if stackGroup:
                allowed = False

                # print('===',set(stackGroup),set(permissions))

                result  = set.intersection(set(stackGroup),set(permissions))
                if len(result):
                    for g in result:
                        if mode in permissions[g]:
                            allowed = True
                    return allowed
                else:
                    return False
            else:
                return False
        else:
            return False




    def check(self,fileNameAc,part,objName,uid,mode): # mode = 'r' & 'w'
        if self.error:
            return False
        if fileNameAc in self.__dict__:
            if part in self.__dict__[fileNameAc]:
                if len(self.__dict__[fileNameAc][part]):
                    return self.ruleAnalysis(self.__dict__[fileNameAc][part],objName,uid,mode)
                else:
                    return True
            else:
                return True
        else:
            return True



    def reviseDict(self,fileNameAc,part,objectDict,uid,mode):
        '''returns only keys that can be accessed'''
        if self.error:
            return {}
        if fileNameAc in self.__dict__:
            if part in self.__dict__[fileNameAc]:
                if len(self.__dict__[fileNameAc][part]):
                    rules = self.__dict__[fileNameAc][part]
                    if 'all' in rules:
                        '''if the rules specify ALL then we check the rights for any field'''
                        for nameObj in objectDict:
                            if self.ruleAnalysis(rules,nameObj,uid,mode):
                                return objectDict
                            else:
                                return {}
                    namesIntersection  = set.intersection(set(rules),set(objectDict))
                    newDict = objectDict
                    if len(namesIntersection):
                        for nameObj in namesIntersection:
                            if not self.ruleAnalysis(rules,nameObj,uid,mode):
                                newDict.pop(nameObj)
                        return newDict
                    else:
                        return objectDict
                else:
                    return objectDict
            else:
                return objectDict
        else:
            return objectDict





class Web:
    def __init__(self,input):
        self.input = input
        self.out = {
            'data':'',
            'type':'',
            'cookie': [],
            'status':'500 Internal Server Error'
        }
        self.bases = agog.db.GlobVar().get('baseList','ramdisk')
        self.allowedZones = {
            'css',
            'js',
            'ico',
            'fonts',
            'test',
            'html'
        }
        self.mainlog = logging.getLogger('main')
        self.cookieDict = None
    def pathToList(self,path):
        ls = path.split('/')
        for i in  range(ls.count('')):
            ls.remove('')
        return ls

    def contype(self,path):  #определение запрашиваемого контента
        suf = pathlib.Path(path).suffix
        if suf!='':
            mimetypes.init()
            try:
                return mimetypes.types_map[suf]
            except KeyError:
                return 'application/octet-stream'
        else:
            return None

    def fileMeneger(self,pathAsList,domain='main'):
        # print('fileMeneger === ',pathAsList)

        '''domain - размещение файлов и обЪектов. : 'main' - основное, <baseName> -  база
        pathAsList - относительный путь'''
        stor = Storage()
        def openFile(rootPath):

            if pathAsList[0] in self.allowedZones:
                realPath = rootPath / "/".join(pathAsList)
                f = stor.AEH( open, str(realPath), "rb" )
                out = f.read()
                f.close()
                #print('out === ',out)
                return out


        if domain=='main':
            rootPath = stor.changePath(('root',''))
        else:
            rootPath = stor.changePath(('bases',domain))

        try:
            self.out['data'] = openFile(rootPath)
            self.out['status'] = '200 OK'
            self.out['type'] = self.contype( pathAsList[-1:][0] )
        except Exception as e:
            self.mainlog.error( traceback.format_exc( agog.traceLevel ) )
            self.out['status'] = '500 Internal Server Error'
            info = traceback.format_exc( agog.traceLevel )
            self.out['data'] = self.createErrorPage( info ).encode('utf-8')






    def queryToDict(self,query):
        try:
            a_buf = query.split('&')
            b_buf = [v.split('=') for v in a_buf]
            c_buf = dict(b_buf)
            return c_buf
        except Exception:
            return {}


    def resolveCookie(self,cookie):
        sDict = {}
        try:
            if cookie:
                s1 = cookie.split(';')
                for el in s1:
                    s2 = el.strip()
                    if s2:
                        s3 = s2.split('=')
                        sDict[ s3[0] ] = s3[1]
        except Exception as e:
            pass
        return sDict


    def cookie(self,value=None):
        if not self.cookieDict:
            cookText = self.input.get('cookie')
            self.cookieDict = self.resolveCookie(cookText)
        if self.cookieDict:
            if value:
                return self.cookieDict.get(value)
            else:
                return self.cookieDict



    def hasSession(self):
        try:
            currentBase = self.input.get('currentBase')
            if currentBase:
                sessionId = self.cookie(currentBase)
                if sessionId:
                    self.input['sessionId'] = sessionId
                    session = agog.db.Session().get(sessionId)

                    if session:
                        # self.mainlog.info('sessionId '+str(sessionId)+' found ')
                        session['sessionId'] = sessionId
                        agog.db.GlobVar().set('session',session)
                        return True
                    else:
                        self.mainlog.info('sessionId '+str(sessionId)+' not found ')
            return False
        except Exception as e:
            self.mainlog.error( traceback.format_exc( agog.traceLevel ) )
            raise



    def retryCount(self, mode='set'):
        # set / reset - установка / сброс счетчика
        # дописать счетчик
        return True

    def loginCheck(self):
        try:
            data = None
            inData = self.input.get('data')
            if type(inData).__name__== 'bytes':
                try:
                    data = inData.decode()
                    data = self.queryToDict(data)
                except Exception as e:
                    pass
            if data:
                root  = agog.db.Config().get('root')
                login = data.get('login')
                password = data.get('password')

                uid = -1
                currentBase = agog.db.GlobVar().get('currentBase')
                if self.retryCount():
                    if (( login == root.get('login') )and( password == root.get('password') )):
                        uid = 0
                    else:
                        statusError = agog.db.GlobVar().get(currentBase+'.statusError','ramdisk')
                        if statusError:
                            raise Exception(statusError)

                        base = agog.db.dbSql()
                        if agog.sqlgen.checkSqlFilter(login):
                            rows = base.request('SELECT * FROM users WHERE login ="{l}"'.format(l=login))
                            if len(rows)>0:
                                passw = rows[0].get('password')
                                if (passw is not None) and (passw == password):
                                    uid = rows[0].get('uid')
                    if uid > -1:
                        param = {
                            'login': login,
                            'uid': uid
                        }
                        sessionId = agog.db.Session().set(param)
                        agog.db.GlobVar().set('session',param)
                        self.out['cookie'].append( currentBase + '=' + sessionId +'; path=/'+currentBase +';')


                        info = '''login {0} is correct. created new sessionId {1} client: {2}; ip: {3}'''.format(login,sessionId,self.input.get('client'),self.input.get('ip'))
                        self.mainlog.info(info)
                        agog.tools.customLogger('requests').info(info)
                        self.loadDesctop()
                    else:
                        self.loadLoginPage('error')
                else:
                    self.loadLoginPage('limit')
            else:
                self.loadLoginPage()

        except Exception as e:
            err = traceback.format_exc( agog.traceLevel )
            self.mainlog.error( err )
            self.out['data'] = self.createErrorPage( err ).encode('utf-8')
            pass



    def hasDemo(self):
        cnfMain = agog.db.Config().get('main')
        if cnfMain:
            return cnfMain.get('demo')

    def paramMeneger(self):

        '''
        multi mode:
        inData = {
            <numRequest>:[
                {
                    target:{
                        location:'', default- main
                        module:'', default- content
                        class:'', default- текущая function
                        function:'', default- manager
                    }
                    param = {...}
                }
            ]
        }
        out = {
            <numRequest>:[
                {
                    target = "..."
                    content = ...
                }
            ]

        }
        -------------------------
        mono mode:
        inData = {
            target:{
                location:'', default- main
                module:'', default- content
                class:'', default- текущая function
                function:'', default- manager
            }
            param = {...}
        }
        out = byte
        type = ?
        '''
        # queryObject
        currentBase = agog.db.GlobVar().get('currentBase')
        session = agog.db.GlobVar().get('session')
        reqlog = logging.getLogger(currentBase+'.requests')

        def jsondefault(obj):
            if isinstance(obj, Decimal):
                return float(obj)
            return str(obj)

        def proRequest(request):


            target = request['target']
            location = target.get('location','main')
            module = target.get('module','content')
            function = target.get('function','manager')
            path = ''
            if location == 'main':
                path = 'agog.'+module
            if location == 'custom':
                path = currentBase + '.py.'+ module
            module = importlib.import_module(path)
            curFunc = None
            if target.get('class'):
                curClass= getattr(module, target.get('class'))
                curFunc = getattr(curClass(),function)
            else:
                curFunc = getattr(module,function)



            return curFunc(request['param'])

        # if self.input.get('type') == 'application/json':

        try:
            # data = self.input.get('data')
            # if self.input.get('queryObject'):
            #     inData = self.input.get('queryObject')
            # else:
            #     inObjStr = data.decode()
            #     inData = json.loads(inObjStr)


            inData = self.input.get('queryObject');
            reqlog.debug((session,inData))
            out = {}
            errorList = []

            mode = 'multi'
            if 'target' in inData:
                mode = 'mono'


            if mode == 'multi':
                for num in inData:
                    partList = []
                    for request in inData[num]:
                        try:
                            partList.extend( proRequest(request) )
                        except Exception as e:
                            err = traceback.format_exc( agog.traceLevel )
                            reqlog.error( err )
                            errorList.extend([{
                                'request': request,
                                'log': err if agog.showErrorResponse else 'look in the requests log'
                            }])
                            partList.extend([{'status': 'ERROR'}])
                            pass
                    out[num] = partList
                    if errorList:
                        out['error'] = errorList
                self.out['data'] = json.dumps(out,default=jsondefault).encode('utf-8')
                self.out['type'] = 'application/json'
                self.out['status'] = '200 OK'

            elif mode == 'mono':
                newOut = proRequest( inData )
                # self.out['data'] =
                # self.out['type'] = 'text/html'
                self.out.update(newOut)
                self.out['status'] = '200 OK'



        except Exception as e:
            err = traceback.format_exc( agog.traceLevel )
            reqlog.error( err )
            self.out['data'] = self.createErrorPage( err ).encode('utf-8')
            pass



    def loginGenerator(self):
        try:
            sql = 'SELECT uid FROM users ORDER BY uid DESC LIMIT 1'
            db = agog.db.dbSql()
            lastId = db.request2(sql)
            newLogin = 'user'+str(lastId[0]['uid']+1)
            newPass = hashlib.md5(newLogin.encode('utf-8')).hexdigest()[:8]
            newSql = 'INSERT INTO users (login,password) VALUES ("{0}","{1}")'.format(newLogin,newPass)
            resultList =  db.request2(newSql,'w')
            if len(resultList):
                result = resultList[0]
                if result.get('status')=="DONE":
                    id = result['id']
                    mess = [
                        'system',
                        ['u'+str(id)],
                        '<iframe src = /page/welcome_page.html ></iframe>',
                        'window'
                    ]
                    agog.content.Message().send(*mess)
                    out = newLogin+'&'+newPass
                    self.out['data'] = out.encode('utf-8')
                    self.out['status'] = '200 OK'
                    self.out['type'] ='application/x-www-form-urlencoded'
        except Exception as e:
            err = traceback.format_exc( agog.traceLevel )
            self.mainlog.error( err )
            self.out['data'] = err.encode('utf-8')
            pass



    def createErrorPage(self,info):
        if agog.showErrorResponse:
            err = info
        else:
            err = "look in the main log"
        return '<h1>Internal Server Error</h1><p><details><pre>%s</pre></details></p>'%err



    def loadDesctop(self):
        try:
            profile = agog.content.Profile()
            out = profile.openDesktop()
            self.out['data'] = out.encode('utf-8') #.encode('utf-8')
            self.out['status'] = '200 OK'
            self.out['type'] = 'text/html'

            currentBase = agog.db.GlobVar().get('currentBase')
            lang = agog.db.UserConfig().get('language')
            if lang:
                self.out['cookie'].append( 'cl =' + lang +'; path=/'+currentBase +';')
                self.out['cookie'].append( 'ml =' + lang +'; path=/;')
        except Exception as e:
            err = traceback.format_exc( agog.traceLevel )
            self.mainlog.error( err )
            self.out['data'] = self.createErrorPage( err ).encode('utf-8')
            pass



    def loadLoginPage(self, message=''):
        st = Storage()
        path = st.changePath(('pattern','login.html'))
        fileHtml = html.parse(str(path))
        fileHtml = agog.tools.htmlStrip(fileHtml)

        if self.hasDemo():
            head = fileHtml.findall('head')
            script = '<script type="text/javascript" src="/file/js/demo.js"></script>'
            head[0].append( html.fromstring(script) )

        body =  fileHtml.findall('body')
        body[0].findall('.//*[@id="message"]')[0].text = message
        self.out['data'] = html.tostring(fileHtml, encoding ="unicode", method="html").encode('utf-8')
        self.out['type'] = 'text/html'
        self.out['status'] = '200 OK'

    def loadStartPage(self):
        self.fileMeneger(['html','index.html'])

    def loadAdminPanel(self,pathAsList):
        inPath = '/'.join(pathAsList)
        root = Storage().ROOTPATH
        out = open(str( root / 'admin' /  inPath ),encoding="utf-8").read()
        self.out['data'] = out.encode('utf-8')
        self.out['type'] = self.contype( pathAsList[-1:][0] )
        self.out['status'] = '200 OK'
        pass

    def do(self):
        path = self.input.get('path')
        if path:
            # print('if path: ---')
            pathAsList = self.pathToList(path)
            if len(pathAsList):

                if pathAsList[0] == 'file':
                    self.fileMeneger(pathAsList[1:])
                elif pathAsList[0] == 'page':
                    list = ['html', self.identifyLang() ]
                    list.extend(pathAsList[1:])
                    self.fileMeneger(list)
                elif pathAsList[0] in  self.bases:
                    self.input['currentBase'] = pathAsList[0]
                    agog.db.GlobVar().set('currentBase',pathAsList[0])

                    if self.hasSession():
                        if len(pathAsList)>1:
                            if pathAsList[1] == 'file' :
                                self.fileMeneger(pathAsList[2:],pathAsList[0])
                            elif pathAsList[1] == 'page':
                                list = ['html', self.identifyLang() ]
                                list.extend(pathAsList[2:])
                                self.fileMeneger(list,pathAsList[0])
                            elif pathAsList[1] == 'admin':
                                if len(pathAsList)==2:
                                    self.loadAdminPanel(['index.html'])
                                else:
                                    self.loadAdminPanel(pathAsList[2:])
                        else:
                            if self.input.get('type')=='application/json':
                                data = self.input.get('data')
                                inObjStr = data.decode()
                                self.input['queryObject'] = json.loads(inObjStr)
                                self.paramMeneger()
                            else:
                                # currentBase = agog.db.GlobVar().get('currentBase')
                                # statusError = agog.db.GlobVar().get(currentBase+'.statusError','ramdisk')
                                # if statusError:
                                #     raise Exception(statusError)

                                if self.input.get('query'):
                                    query = self.input.get('query')
                                    if agog.tools.isBase64(query):

                                        param = json.loads(base64.b64decode(query).decode())
                                        self.input['queryObject'] = param
                                        data = self.input.get('data')
                                        # if type(data).__name__=='bytes'
                                        # hash = hashlib.md5(data).hexdigest()

                                        # print('python hash',hash)
                                        # f = open('/var/www/buh/logs/test.txt','bw')
                                        # f.write(data)
                                        # f.close()
                                        agog.db.GlobVar().set('inData',data)
                                        self.paramMeneger()
                                    else:
                                        self.loadDesctop()
                                else:
                                    self.loadDesctop()



                    else:
                        if self.input.get('data'):
                            data = self.input.get('data')
                            if type(data).__name__ != 'bytes':
                                data = data.encode('utf-8')

                            if data.find(b'set_new')>=0:
                                if self.hasDemo():
                                    self.loginGenerator()
                            elif data.find(b'login')>=0:
                                self.loginCheck()
                            else:
                                self.loginCheck()
                        else:
                            self.loginCheck()
                else:
                    self.loadStartPage()
            else:
                self.loadStartPage()
        else:
            self.loadStartPage()
        return self.out

    def identifyLang(self):
        '''сокет содержит:
        ml (mainLang) и cl (customLang)
        '''
        customLang = self.cookie('cl')
        if customLang:
            return customLang

        mainLang = self.cookie('ml')
        if mainLang:
            return mainLang

        return 'en'

    def __del__(self):
        '''удалаяем глобальные переменные определенные в вызове'''
        agog.db.GlobVar().delete()


############ modul events #################################################

class Event:
    base = None
    def __init__(self):
        self.base = agog.db.dbSql()
        pass


    def manager(self,param):
        line = param.pop('_line')
        if line=='set':
            return self.answer(self.set(param))
        elif line=='delete':
            return self.answer(self.set(**param))

    def answer(self,data):
        '''Forms a standard package for a response from a web form'''
        out = [
        {'target':'profile',
        'content':data}]
        return out


    def dayWeekToDate(self,year,month,monthweek,weekday):
        '''takes the week number and day of the week. returns the day of the month'''
        primaday = date(year,month,1).weekday()
        pre = 7-primaday+weekday
        pre = pre if pre <= 7 else pre - 7
        mn = (monthweek-1)*7
        day = pre + mn
        return day


    def dateGen(self,param,predate = False):
        '''
        predate - True/False
        param - JSON:
        {
            dateRange : ['',''],
            years: [list]
            months: [list] # Number
            days: [1,2,3] or [[week,day],[1,3]]
        }
        '''
        startdate = datetime.strptime(param['dateRange'][0],"%Y-%m-%d")
        enddate = datetime.strptime(param['dateRange'][1],"%Y-%m-%d")
        years = param['years']
        months = param['months']
        days = param['days']
        dateList = []


        if predate:
            primDate = startdate - timedelta(days=1)
            dateList.append(primDate)

        for y in years:
            if (y >= startdate.year) and (y <= enddate.year):
                for m in months:
                    for d in days:
                        tp = type(d).__name__
                        if tp == 'list':
                            day = self.dayWeekToDate(y,m,d[0],d[1])
                        elif tp == 'int':
                            monthrange = calendar.monthrange(y, m)
                            if d <= 0:
                                '''determine the number of days in a
                                month and take away
                                from the end of the month'''
                                day = monthrange[1]+d
                            elif d > monthrange[1]:
                                day = monthrange[1]
                            else:
                                day = d

                        currDate = datetime(y, m, day)

                        if (startdate <= currDate) and (enddate >= currDate):
                            dateList.append(currDate)
        return dateList



    def set(self,param):
        try:
            relclass = param.pop('relclass')
            relid = param.pop('relid')
            self.delete(relclass,relid)
            priority = param.pop('priority')
            dateList = param.get('datelist')
            values = ''
            if dateList is None:
                predate = (relclass == 'reportperiods')
                dateList = self.dateGen(param, predate)
            for i, el in enumerate(dateList,1):
                values += '("{0}",{1},"{2}",{3})'.format(relclass,relid,el,priority)
                if i < len(dateList):
                    values += ', '
            sql = '''INSERT INTO events (relclass,relid,edate,priority) VALUES {0}'''.format(values)
            self.base.cursor.execute(sql)
            self.base.conn.commit()

            # добавление enddate
            dateRange = param.get('dateRange')
            if dateRange:
                masterFeild = agog.db.ConformDataBase().get('tables')[relclass]['primarykey']
                sql = 'UPDATE {relclass} set enddate = "{enddate}" WHERE {masterFeild} = {relid}'
                sql = sql.format(**{
                    'relclass':relclass,
                    'enddate':dateRange[1],
                    'masterFeild':masterFeild,
                    'relid':relid
                })
                self.base.cursor.execute(sql)
                self.base.conn.commit()
            return {'status': 'DONE'}
        except Exception as e:
            agog.tools.customLogger('requests').error( traceback.format_exc( agog.traceLevel ) )
            return {'status': 'ERROR'}




    def delete(self,relclass,relid):
        sql = 'DELETE FROM events WHERE relclass = "{0}" AND relid = {1} AND done = 0'.format(relclass,relid)
        self.base.cursor.execute(sql)
        self.base.conn.commit()

    def deleteAllUnrelated(self):

        desc = agog.db.ConformDataBase().get('tables')
        sqlAllClass = '''
            SELECT DISTINCT relclass FROM events;
        '''
        self.base.cursor.execute(sqlAllClass)
        classRows = self.base.cursor.fetchall()

        sqlStack = ''

        for row in classRows:
            table = row['relclass']
            masterFeild = desc[table]['primarykey']
            sqlpart = '''
                SELECT e.eid FROM events e
                LEFT OUTER JOIN {table} cl ON e.relid = cl.{masterFeild}
                WHERE relclass = "{table}" AND schedule IS NULL
                '''.format(table=table,masterFeild=masterFeild)
            sqlStack = sqlStack + sqlpart if not sqlStack else sqlStack + ' UNION '+sqlpart
        sqlStack = '({0})'.format(sqlStack)

        sqlfin = 'DELETE FROM events WHERE eid in (SELECT * FROM {0} as ev)'.format(sqlStack)

        self.base.cursor.execute(sqlfin)
        self.base.conn.commit()


def iniVar(): # инициализация  для запуска в режиме отладки
    globalVar = agog.db.GlobVar()
    globalVar.set('session',{'uid':'1',
                            'login':'admin'
                            })
    globalVar.set('currentBase','buh')


if __name__ == '__main__':
    pass
