import re

tablesEXP = {
    'transactions':{
        'fields': {},
        'relations':{
            'dcassa': "users",
            'dest': "accounts",
            'scassa': "users",
            'source': "accounts",
            'uid': "users"
        },
        'primarykey': "tid",
        'links' :{}
    },
    'accounts':{
        'fields': {},
        'relations':{},
        'links':{
            'labels':{
                "field": "lid",
                "transTable": "lid_aid"
            },
            'users':{
                'field': "uid",
                'transTable': "uid_aid"
            }

        },
        'primarykey': "aid"
    },
    'users':{
        'fields': {},
        'relations':{},
        'primarykey': "uid",
        'links' :{
            'groups':{
                'field': "gid",
                'transTable': "uid_gid"
            }
        }
    },
    'groups':{
        'fields': {},
        'relations':{},
        'primarykey': "gid",
        'links':{}
    },
    'labels':{
        'fields': {},
        'relations':{},
        'primarykey': "lid",
        'links':{}
    }
}




def filterByLinkedTables(nameTable,links):
    ## подключение внешних источников
    tables = tablesEXP
    fields = {} #

    def changeVal_(field,inVal):
        # val = agog.tools.converter(inVal,fields[field]['type'],fields[field]['default'])
        # if fields[field]['type'] in ('str','datetime'):
        #     return '"{0}"'.format(val)
        # else:
        #     return val
        return inVal

    # ===================================
    # подготовка шаблонов для поиска выражений
    operators = [r'<>',r'=',r'>',r'<',r'like']
    # searchPatt = r''
    operPatt = r''
    for i, op in enumerate(operators):
        if i>0:
            # searchPatt = searchPatt + r'|'
            operPatt = operPatt + r'|'
        # searchPatt = searchPatt + r'\S+\s+{0}.+[^&\|]'.format(op)
        operPatt = operPatt + r'{0}'.format(op)



    mainFilter = re.sub(r'[""'']','',links)

    is_deleted = ""# r'\w+.is_deleted\s+\S\s+\S' регулярка для поиска is_deleted

    relShellPartSql = '(SELECT DISTINCT {field} FROM {innerTable} {where}) {table}'
    relInnerPartSql = 'INNER JOIN {0} '
    linkShellPartSQL = '(SELECT DISTINCT {mainTable}.{field} FROM {mainTable} {inner}) {mainTable}'
    linkExceptPartSQL = '(SELECT DISTINCT {mainTable}.{field} FROM {mainTable} {inner} USING({field}))'
    linkInnerPartSQL = 'INNER JOIN (SELECT DISTINCT {table}.{field} FROM {table} INNER JOIN {innerTable} USING({inId}) {where}) {table} {USING} '

    decompLinks = [] # decomposed Links
    for indX, el in enumerate( re.split(r'&&|\|\|', re.sub(r'[()]','',mainFilter) ) ):
        # print('======= el ==== ',el)

        print('indX',indX)

        oper = re.findall(operPatt,el)
        sp = el.split(oper[0])

        leftPart = sp[0].strip()
        if len(leftPart.split('.')) == 1:
            leftPart = nameTable +'.'+leftPart

        usedField = leftPart.split('.')[-1]
        decEL = { # decomposed element
            'original': el,
            'num':indX,
            'oper':oper[0].strip(),
            'left':leftPart,
            'right': changeVal_(usedField,sp[1].strip()),
            'inner':'',
            'where':'',
        }

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

            if mainTab == currTab:
                print('root')
                if indY == 0:
                    where = '{0} {1} {2}'.format( decEL['left'], decEL['oper'] ,decEL['right'])
                    decEL['where'] = where
                    decEL['inner'] = ''
                else:
                    if decEL['oper'] == '<>':
                        decEL['inner'] = ''
                        decEL['where'] = '{0}.{1} NOT IN {2}'.format( currTab ,currField, re.sub(r'\b\w+$','',sqlSTACK) )
                    else:
                        field = tables[lastTable]['primarykey']
                        where = '{0}.{1} = {2}.{3}'.format( lastTable + str(indX) ,field ,currTab , currField)
                        sqlSTACK = 'INNER JOIN {0} '.format( sqlSTACK.strip() + str(indX))
                        decEL['inner'] = sqlSTACK
                        decEL['where'] = where
            elif tables[mainTab]['relations'].get(mainField) == currTab:

                print('relations')

                param = {
                    'table': currTab,
                    'field': tables[currTab]['primarykey'],
                    'where':''
                }
                if indY == 0:
                    oper = decEL['oper'] if decEL['oper'] != '<>' else '='
                    param['where'] = "WHERE {0} {1} {2}".format(currField,  oper, decEL['right'])
                    param['innerTable'] =  currTab
                else:
                    param['innerTable'] = sqlSTACK
                if currTab != lastTable:
                    sqlSTACK = relShellPartSql.format(**param)
                lastTable = param.get('table')

            elif currTab in tables[mainTab]['links']:

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
#links = 'transactions.tdate > 10-02-2019 && transactions.is_deleted = 0 && transactions.source@accounts.aname < qwer'
# links = 'transactions.source@accounts@users.login = "admin"'
#links = 'users.login = admin'
# links = 'users.uid@groups.name = admin'
# links = 'transactions.dest@accounts.curr = "UAN"'
# print(filterByLinkedTables('accounts','side = 0'))

#accounts    users.login <> admin
# print(filterByLinkedTables('transactions','transactions.dest@accounts.aname <> d_purse'))
print(filterByLinkedTables('accounts','users.login = admin'))
