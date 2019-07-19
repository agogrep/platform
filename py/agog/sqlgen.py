import inspect, os.path
import sys, traceback
import pathlib
import logging
import pprint

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
    '''filter by linked tables'''

    # print('filterByLinkedTables',links)


    tables = agog.db.ConformDataBase().get('tables')
    fields = agog.db.ConformDataBase().get('fields')
    primarykey = tables[nameTable]['primarykey']
    dictLinks = tables[nameTable]['links']
    session = agog.db.Session().currentSession()
    uid = session.get('uid')
    inDictLinks = {
        nameTable :{}
    }

    listInLinks = links.split(' && ')
    operList = ['=','<>','<','>']

    acControl = agog.serverman.AccessControl()

    for el in listInLinks:
        elDict = {}
        for op in operList:
            if (' '+ op +' ') in el:
                elList = el.split(op)
                elDict[op] = elList[1].split(',')
                obj = elList[0].strip().split('.')
                if len(obj)==1:
                    fieldName = obj[0]
                    table = nameTable
                elif len(obj)==2:
                    fieldName = obj[1]
                    table = obj[0]

                if table not in inDictLinks:
                    inDictLinks[table] = {}



                if acControl.check('fields',table+'_list.journal',fieldName,uid,'r'):

                    if fieldName in inDictLinks[table]:
                        if op in inDictLinks[table][fieldName]:
                            inDictLinks[table][fieldName][op].extend(elDict[op])
                        else:
                            inDictLinks[table][fieldName].update(elDict)
                    else:
                        inDictLinks[table][fieldName] = elDict

    intersect = set.intersection(set(inDictLinks),set(dictLinks))


    def changeVal_(field,inVal):
        val = agog.tools.converter(inVal,fields[field]['type'],fields[field]['default'])
        if fields[field]['type'] in ('str','datetime'):
            return '"{0}"'.format(val)
        else:
            return val


    def convertToIn_(dictVal,nameField):
        val = '('
        i = 1
        for el in dictVal:

            val = val + ' {0}'.format(changeVal_(nameField,el.strip()))
            if i < len(dictVal):
                val = val + ','
            i = i + 1
        val = val + ')'
        return val


    def constructorWhere_(table,field,oper,data,currentWhere,logicalOperation='AND'):
        outWhere = currentWhere
        realOper = oper
        if oper == '=':
            if (len(data)>1):
                realOper = 'IN'
                val = convertToIn_(data,field)
            else:
                val = ' {0}'.format(changeVal_(field,data[0].strip()))
            if outWhere.strip() != 'WHERE':
                outWhere = outWhere + ' {0}'.format(logicalOperation)
            outWhere = outWhere + ' {0}.{1} {2} {3}'.format(table,field,realOper,val)
        else:
            for el in data:
                val = ' {0}'.format(changeVal_(field,data[0].strip()))
                if outWhere.strip() != 'WHERE':
                    outWhere = outWhere + ' {0}'.format(logicalOperation)
                outWhere = outWhere + ' {0}.{1} {2} {3}'.format(table,field,realOper,val)

        return outWhere



    startPartExceptSQL = ''' {idname} NOT IN
                        (Select DISTINCT {table}.{idname} From {table} {table}'''.format(**{
                                            'table': nameTable,
                                            'idname': primarykey
                                            })
    wehereExceptSQL = ' WHERE'
    wehereSQL = ' WHERE'
    partExceptSQL = ''
    partSQL = ''
    mode = '' # ex - Except , us = Usual


    for table in inDictLinks:
        mode = ''
        for field in inDictLinks[table]:
            for oper in inDictLinks[table][field]:
                data = inDictLinks[table][field][oper]
                if table in dictLinks:
                    mode = 'us'
                    if (oper == '<>'):
                        mode = 'ex'
                        wehereExceptSQL = constructorWhere_(dictLinks[table]['transTable'],field,'=',data,wehereExceptSQL,'OR')
                    else:
                        wehereSQL = constructorWhere_(dictLinks[table]['transTable'],field,oper,data,wehereSQL)
                else:
                    wehereSQL = constructorWhere_(table,field,oper,data,wehereSQL)

        if mode == "us":
            partSQL = partSQL + ''' INNER JOIN {transTable} {transTable} USING({idname})'''.format(**{
            'transTable':dictLinks[table]['transTable'],
            'idname':primarykey
            })


        elif mode == 'ex':
            partExceptSQL = partExceptSQL +''' Left OUTER join {transTable} {transTable}
                        USING({idname})'''.format(**{
                        'transTable':dictLinks[table]['transTable'],
                        'idname':primarykey
                        })

    mainFields = ''
    for field in tables[nameTable]['fields']:
        if mainFields !='':
            mainFields += ', '
        mainFields += nameTable + '.' + field

    outSql = '(SELECT DISTINCT {mainFields} FROM {nameTable} {nameTable}'.format(nameTable = nameTable,mainFields = mainFields)

    if partSQL:
        outSql = outSql + partSQL

    if wehereSQL.strip() != 'WHERE':
        outSql = outSql + wehereSQL

    if partExceptSQL:
        partWhere = ''
        if wehereSQL.strip() != 'WHERE':
            partWhere = ' AND'
        else:
            partWhere = ' WHERE'
        outSql = outSql + partWhere + startPartExceptSQL +partExceptSQL+ wehereExceptSQL +')'

    outSql = outSql + ') '+nameTable

    print('outSql',outSql)
    return outSql




if __name__ == '__main__':
    pass
