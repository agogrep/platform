import inspect, os.path
import sys, traceback
import pathlib
import logging
import pprint
import re

agog  = sys.modules[__package__]


def checkSqlFilter(sql):
    # print('checkSqlFilter = ========= = =   = =',sql)
    try:
        # raise Exception('My Error')
        keywords = ['action', 'add',
        # 'all',
        'alter', 'analyze', 'asensitive',
         'auto', 'bdb', 'before', 'berkeleydb', 'between', 'bigint', 'binary', 'bit',
         'blob', 'both', 'by', 'call', 'cascade', 'case', 'change', 'check', 'collate', 'column', 'columns', 'condition', 'connection', 'constraint',
         'continue', 'create', 'cross', 'current', 'current_date', 'current_timestamp',
         'cursor', 'database', 'databases', 'date', 'day', 'day_hour', 'dec', 'decimal',
         'declare', 'default', 'delayed', 'delete',  'describe', 'deterministic',
         'distinct', 'distinctrow', 'div', 'double', 'drop', 'else', 'elseif', 'enclosed',
         'enum', 'escaped', 'exists', 'exit', 'explain', 'false', 'fetch', 'fields', 'float',
         'for', 'force', 'foreign', 'found', 'frac', 'from', 'fulltext', 'grant', 'group',
         'having', 'high', 'hour', 'hour_minute', 'if', 'ignore', 'in', 'increment', 'index',
         'infile', 'inner', 'innodb', 'inout', 'insensitive', 'insert', 'int', 'integer',
         'interval', 'into', 'io_thread', 'is', 'iterate', 'join', 'key', 'keys', 'kill',
         'leading', 'leave', 'left', 'limit', 'lines', 'load', 'localtime',
         'localtmestamp', 'lock', 'long', 'longblob', 'longtext', 'loop', 'low_priority',
         'master_server_id', 'match', 'mediumblob', 'mediumint', 'mediumtext', 'microsecond',
         'middleint', 'minute', 'minute_microsecond', 'minute_second', 'mod', 'month',
         'natural', 'no', 'no_write_to_binlog', 'not', 'null', 'numeric', 'on', 'optimize',
         'option', 'optionally', 'order', 'out', 'outer', 'outfile', 'precision',
          'primary',
        #   'priority',
          'privileges', 'procedure', 'purge', 'read', 'real',
          'references', 'regexp', 'rename', 'repeat', 'replace', 'require', 'restrict',
          'return', 'revoke', 'right', 'rlike', 'second', 'second_microsecond', 'select',
          'sensitive', 'separator', 'set', 'show', 'smallint', 'some', 'soname', 'spatial',
           'specific', 'sql', 'sql_big_result', 'sql_calc_found_rows', 'sql_small_result',
           'sql_tsi_day', 'sql_tsi_frac_second', 'sql_tsi_hour', 'sql_tsi_minute',
           'sql_tsi_month', 'sql_tsi_quarter', 'sql_tsi_second', 'sql_tsi_week',
           'sql_tsi_year', 'sqlexception', 'sqlstate', 'sqlwarning', 'ssl', 'starting',
            'straight_join', 'striped', 'table', 'tables', 'terminated', 'text',
            'then', 'time', 'timestamp', 'timestampadd', 'timestampdiff', 'tinyblob',
            'tinyint', 'to', 'trailing', 'true', 'undo', 'union', 'unique', 'unlock',
            'unsigned', 'update', 'usage', 'use', 'user_resources', 'using', 'utc_date',
            'utc_time', 'utc_timestamp', 'values', 'varbinary', 'varchar', 'varcharacter',
            'varying', 'when', 'where', 'while', 'with', 'write', 'xor', 'year', 'zerofill']



        string = str(sql).lower()
        string = string.translate({ord(c): ' ' for c in '|<>=()'})
        stlist = string.split(' ')
        result = list(set(stlist) & set(keywords))
    except Exception as e:
        reqLog = agog.tools.customLogger('requests')
        reqLog.error( traceback.format_exc( agog.traceLevel ) )
        raise



    return False if len(result) else True




def journal(**arg):
    '''
    {
    table:      <str>,
    id_name:    <str>,
    id:         <int>,
    countrows:  <int>,
    sel_fields: <sql: name1,name2,name3 ...  >,

    filter: {
            order: <sql:  name1 [desc], name2 [desc],name3  [desc]...  >,
            search : <sql WHERE>,
            links : <sql WHERE>,
        }
    }
    '''
    # print('journal(**arg)==== ',arg)



    sel_fields = arg['sel_fields'] if 'sel_fields' in arg else '*'
    id = arg['id'] if 'id' in arg else None
    try:
        count = int(arg['countrows'])
        if type(id).__name__=='int':
            id_ = id
        else:
            try:
                id_ = int(id)
            except Exception:
                id_ = 0

        mediana = int(count//2)
        param = {
            'table': arg['table'],
            'id_name': arg['id_name'],
            'mediana':mediana,
            'countrows':count,
            'sel_fields': sel_fields,
            # 'size_id':'{size_id}'
        }

        search = '''select {sel_fields} from {table}  {partWhere} {partOrder} {limit}'''

        usualreq = '''select {sel_fields} from {table}
                where {id_name} >= (select b.{id_name} from (select {id_name} from {table}
                where {id_name} <= (select a.{id_name} from (select {id_name} from {table}
                where {id_name} <= (select if ({id_name}>1,{id_name}-1,{id_name}) as {id_name} from {table}
                order by {id_name} desc limit 1) order by {id_name} desc  limit {mediana}) a
                order by {id_name} limit 1)
                order by {id_name} desc  limit {mediana}) b
                order by {id_name} limit 1) limit {countrows}'''


        startlimitreq = '''select b.{id_name} from (select {id_name} from {table}
                                where {id_name} <= (select {id_name} from {table}
                                order by {id_name} desc limit 1)
                                order by {id_name} desc  limit {mediana}) b
                                order by {id_name} limit 1'''

        limitreq = '''select {sel_fields} from {table}
                        where {id_name} >= (select b.{id_name} from (select {id_name} from {table}
                        where {id_name} <= {size_id} order by {id_name} desc  limit {mediana}) b
                        order by {id_name} limit 1) limit {countrows}'''

        standart = '''select {sel_fields} from {table}'''

        hasSearch = False
        if 'filter' in arg:
            if 'order' in arg['filter']:
                if checkSqlFilter(arg['filter']['order']):
                    hasSearch = True
                else:
                    hasSearch = False


            if 'search' in arg['filter']:
                if checkSqlFilter(arg['filter']['search']):
                    hasSearch = True
                else:
                    hasSearch = False

            if 'links' in arg['filter']:


                if checkSqlFilter( arg['filter']['links'] ):
                    param['table'] = filterByLinkedTables(str(arg['table']), str(arg['filter']['links']) )


        base = agog.db.dbSql()
        rows = base.request('select count(*) from {table}'.format(**param))

        sizeTable = int(rows[0]['count(*)'])
        out =''

        if hasSearch:
            partWhere  = 'WHERE '+ arg['filter']['search'] if 'search' in arg['filter'] else ''
            partOrder = 'ORDER BY  '+ arg['filter']['order'] if 'order' in arg['filter'] else ''
            param['partWhere'] = partWhere
            param['partOrder'] = partOrder
            mode = arg.get('mode')
            param['limit'] = 'limit '+str(param['countrows']) if mode == 'fast' else ''
            out = search.format(**param)
        else:
            if sizeTable <= param['countrows']:
                out = standart.format(**param)
                pass
            else:
                if (id_ is None)or(id_==0):
                    out = usualreq.format(**param)
                else:
                    base = agog.db.dbSql()
                    rows = base.request(startlimitreq.format(**param))
                    if id_ >= int(rows[0][arg['id_name']]):
                        out = usualreq.format(**param)
                    else:
                        param['size_id']= id_
                        out = limitreq.format(**param)



    except Exception as e:
        raise

    # print('+++++++++++++++ ==== out ======== ',out)

    return out





def write(**arg):
    # режимы : write, delete
    # если id= 0  создает новую запись, если > - обновляет текущюю
    out = ''
    if 'id_name' in arg:
        param = {'id_name':arg['id_name'],
                'table': arg['table']}
        desc = agog.db.ConformDataBase().get('tables')
        dtabl = desc[arg['table']]['fields'] if arg['table'] in desc else None
    else:
        return out

    for data  in arg['data']:

        sql  = ''
        if '_line' in data :
            line = data.pop('_line')
            if 'is_deleted' in data:  # если задействовано мягкое удаление
                if data['is_deleted']:
                    if line=='delete':
                        if 'is_deleted' in desc[arg['table']]['fields']:
                            line = 'write'

            upd = []
            filds = []
            vals = []
            for k in data:
                if k in dtabl: # если filds есть в базе
                    upd.append(k+' = '+pprint.pformat(data[k]))
                    filds.append(k)
                    vals.append(pprint.pformat(data[k]))
            param['id'] = data[arg['id_name']]
            param.update({'upd':', '.join(upd),
                            'filds':', '.join(filds),
                            'vals':', '.join(vals)})

            if line=='write':
                if param['id']==0:
                    sql = '''INSERT INTO {table} ({filds}) VALUES ({vals});'''
                elif param['id']>0:
                    sql = '''UPDATE {table} SET {upd} WHERE {id_name} = {id};'''
            elif line=='delete':
                if (param['table']+'_del') in desc:
                    sql = '''START TRANSACTION;
                    INSERT INTO {table}_del SELECT * FROM {table} WHERE {id_name} = {id};
                    DELETE FROM {table} WHERE {id_name} = {id}  LIMIT 1;'''
                    #COMMIT;'''
                else:
                    sql ='''DELETE FROM {table} WHERE {id_name} = {id}  LIMIT 1;'''
        out = out + sql.format(**param)
    return out






def filterByLinkedTables(nameTable,links):
    ## подключение внешних источников
    tables = agog.db.ConformDataBase().get('tables')
    fields = agog.db.ConformDataBase().get('fields')

    def changeVal_(field,inVal):
        val = agog.tools.converter(inVal,fields[field]['type'],fields[field]['default'])
        if fields[field]['type'] in ('str','datetime'):
            return '"{0}"'.format(val)
        else:
            return val
        return inVal

    def optimizer(links):
        # убирает из года /* */ и сокращает && и ||
        def delOrAnd(inp):
            out = inp
            stack =re.findall(r'[&\|\s+]+',out) # пустые условия
            for val in stack:
                if val.strip():
                    subOper = ' && '
                    hasOR = re.findall(r'\|\|',val)
                    if len(hasOR):
                        subOper = ' || '
                    out = out.replace(val,subOper)
            return out
        out = re.sub(r'(/\*).+?(\*/)','',links) # удаление неактивных условий
        out = delOrAnd(out)
        out = re.sub(r'\([&\|\s+]+' , ' ( ' ,out) #
        out = re.sub(r'[&\|\s+]+\)' , ' ) ' ,out) #
        out = re.sub(r'\(\s*\)','',out) # пустые скобки
        out = delOrAnd(out)
        out = re.sub(r'^(&&|\|\|)|(&&|\|\|)$','',out.strip()) # концевые условия
        return out
    # ===================================
    # подготовка шаблонов для поиска выражений
    operators = [r'<>',r'=',r'>',r'<',r'LIKE']
    operPatt = r''
    for i, op in enumerate(operators):
        if i>0:
            # searchPatt = searchPatt + r'|'
            operPatt = operPatt + r'|'
        # searchPatt = searchPatt + r'\S+\s+{0}.+[^&\|]'.format(op)
        operPatt = operPatt + r'{0}'.format(op)

    mainFilter = re.sub(r'[""'']','',links)
    mainFilter = optimizer(mainFilter)
    # is_deleted = ""# r'\w+.is_deleted\s+\S\s+\S' регулярка для поиска is_deleted


    linkShellPartSQL = '(SELECT DISTINCT {mainTable}.{field} FROM {mainTable} {inner}) {mainTable}'
    linkExceptPartSQL = '(SELECT DISTINCT {mainTable}.{field} FROM {mainTable} {inner} USING({field}))'
    linkInnerPartSQL = 'INNER JOIN (SELECT DISTINCT {table}.{field} FROM {table} INNER JOIN {innerTable} USING({inId}) {where}) {table} {USING} '

    decompLinks = [] # decomposed Links

    def delEmpty(itm):
        return True if itm else False

    withoutBrackets = re.sub(r'[()]','',mainFilter.strip())
    dividedByOperator = filter(delEmpty,re.split(r'&&|\|\|', withoutBrackets))
    # print('dividedByOperator',re.split(r'&&|\|\|', withoutBrackets))

    for indX, el in enumerate( dividedByOperator ):
        print('indX',indX)
        oper = re.findall(operPatt,el)
        sp = el.split(oper[0])

        leftPart = sp[0].strip()
        if len(leftPart.split('.')) == 1:
            leftPart = nameTable +'.'+leftPart

        usedField = leftPart.split('.')[-1]
        decEL = { # decomposed element
            'original': el.strip(),
            'num':indX,
            'oper':oper[0].strip(),
            'left':leftPart,
            'right': changeVal_(usedField, sp[1].strip() ),
            'inner':'',
            'where':'',
        }

        # print('decEL',decEL)
        routeList = decEL['left'].split('@')
        routeList.reverse()
        sqlSTACK = ''
        lastTable = ''

        for indY, routEl in enumerate(routeList):
            mainTabDotField = routeList[ indY +1] if len(routeList) > indY +1 else nameTable
            mainTabDotFieldList = mainTabDotField.split('.')
            mainTab = mainTabDotFieldList[0]
            mainField = mainTabDotFieldList[1] if len(mainTabDotFieldList) > 1 else tables[mainTab]['primarykey']
            tabDotField = routEl.split('.')
            currTab = tabDotField[0]
            currField = tabDotField[1] if len(tabDotField) > 1 else tables[currTab]['primarykey']

            print('indY',indY)
            print('main',mainTab, mainField)
            print('curr',currTab,currField)



            if currTab in tables[mainTab]['links']:
                print('links' )
                transTable = tables[mainTab]['links'][currTab]['transTable']
                param = {
                'table':transTable,
                'field': tables[mainTab]['primarykey'],
                'inId': tables[currTab]['primarykey'],
                'where': '',
                'USING':''
                }
                if indY==0:
                    param['innerTable'] = currTab
                    oper = decEL['oper'] if decEL['oper'] != '<>' else '='
                    param['where'] = "WHERE {0} {1} {2}".format(currTab+'.'+currField, oper , decEL['right'])
                elif (indY > 0): #and (i != len(routeList)-1):
                    param['innerTable'] = sqlSTACK

                if (indY != len(routeList)-1):
                    param['USING'] = 'USING({0})'.format(tables[mainTab]['primarykey'])
                    sqlSTACK = linkShellPartSQL.format(**{
                    'field' : tables[mainTab]['primarykey'],
                    'mainTable': mainTab,
                    'inner': linkInnerPartSQL.format(**param),
                    })
                else:
                    if decEL['oper'] == '<>':
                        leftWhere = linkExceptPartSQL.format(**{
                        'field' : tables[mainTab]['primarykey'],
                        'mainTable': mainTab,
                        'inner': linkInnerPartSQL.format(**param),
                        })
                        decEL['inner'] = ''
                        decEL['where'] = '{0}.{1} NOT IN {2}'.format( mainTab ,mainField, leftWhere )
                    else:
                        decEL['inner'] = linkInnerPartSQL.format(**param).strip() + str(indX)
                        relationField = tables[mainTab]['primarykey']
                        decEL['where'] = '{0}.{1} = {2}.{3}'.format( transTable + str(indX) ,relationField ,mainTab ,relationField)
                lastTable = param.get('table')

            else:

                relShellPartSql = '(SELECT DISTINCT {field} FROM {mainTab} INNER JOIN {innerTable} {where})'
                print('modern relations')
                if nameTable != currTab:
                    if nameTable == mainTab:
                        if len(routeList)==1:
                            where = '{0} {1} {2}'.format( decEL['left'], decEL['oper'] ,decEL['right'])
                            decEL['where'] = where
                            decEL['inner'] = ''
                        else:
                            if sqlSTACK =='':
                                sqlSTACK = '(SELECT {0} FROM {1} WHERE {2} {3} {4}) {5}'.format(
                                tables[currTab]['primarykey'],
                                currTab,
                                currTab+'.'+currField,
                                decEL['oper'] if decEL['oper'] != '<>' else '=',
                                decEL['right'],
                                currTab
                                )
                            if decEL['oper'] == '<>':
                                decEL['inner'] = ''
                                decEL['where'] = '{0}.{1} NOT IN {2}'.format( mainTab ,mainField, re.sub(r'\b\w+$','',sqlSTACK) )
                            else:
                                # field = tables[lastTable]['primarykey']
                                where = '{0}.{1} = {2}.{3}'.format( mainTab  ,mainField ,currTab + str(indX) , tables[currTab]['primarykey'] )
                                sqlSTACK = 'INNER JOIN {0} '.format( sqlSTACK.strip() + str(indX))
                                decEL['inner'] = sqlSTACK
                                decEL['where'] = where
                        # print('decEL===============',decEL)
                    else:
                        param = {
                            'field': tables[mainTab]['primarykey'],
                            'where':'',
                            'mainTab':mainTab
                        }
                        if indY == 0:
                            oper = decEL['oper'] if decEL['oper'] != '<>' else '='
                            param['where'] = "WHERE {mainTab}.{mainField} = {currTab}.{currId}   && {currTab}.{currField} {oper} {right}".format(**{
                            'currId': tables[currTab]['primarykey'],
                            'mainField':mainField,
                            'currTab':currTab,
                            'mainTab': mainTab,
                            'currField':currField,
                            'oper':oper,
                            'right':decEL['right']
                            })
                            param['innerTable'] =  currTab
                        else:
                            print('else === currField',currField)
                            param['where'] = "WHERE {mainTab}.{mainField} = {currTab}.{currId}  ".format(**{
                            'currId': tables[currTab]['primarykey'],
                            'mainField': mainField,
                            'currTab': currTab,
                            'mainTab': mainTab,
                            'currField':currField
                            })
                            param['innerTable'] = sqlSTACK

                        if currTab != lastTable:
                            sqlSTACK = relShellPartSql.format(**param) + " " +mainTab
                        # sqlSTACK = relShellPartSql.format(**param)


                    lastTable = currTab

                elif (nameTable == currTab) and (indY == 0):
                    decEL['where'] = '{0} {1} {2}'.format(
                                                        decEL['left'],
                                                        decEL['oper'],
                                                        decEL['right']
                                                    )
            print('sqlSTACK', sqlSTACK)

        # print('decEL',decEL)
        decompLinks.append(decEL)
    # print(decompLinks)


    # =========================================
    # сборка
    mainFields = ''
    for field in tables[nameTable]['fields']:
        if mainFields !='':
            mainFields += ', '
        mainFields += nameTable + '.' + field

    outSql = '(SELECT DISTINCT {mainFields} FROM {nameTable} {nameTable} {outInner} {outWhere}) {nameTable}'

    outInner = ''
    outWhere = ''
    for decEL in decompLinks:
        if decEL['inner']:
            outInner = outInner + " " + decEL['inner']
        if decEL['where']:
            mainFilter = mainFilter.replace( decEL['original'], decEL['where'] )

    if mainFilter:
        outWhere = 'WHERE {0}'.format(mainFilter)
        outWhere = outWhere.replace('&&',' AND ').replace('||',' OR ')

    outSql = outSql.format(**{
        'mainFields': mainFields,
        'nameTable' : nameTable,
        'outInner' : outInner,
        'outWhere': outWhere
    })

    # print(outSql)
    return outSql


if __name__ == '__main__':
    pass
