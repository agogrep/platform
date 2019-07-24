import re

tablesEXP = {
    'transactions':{
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
        'relations':{},
        'primarykey': "gid",
        'links':{}
    },
    'labels':{
        'relations':{},
        'primarykey': "lid",
        'links':{}
    }
}




def filterByLinkedTables(nameTable,links):

    tables = tablesEXP

    def leftValid(arg):
        return arg
    def rightValid(arg):
        return arg

    def typeConnection(mainTab,verTab):
        if verTab == mainTab:
            return 'root'
        elif verTab in tables[mainTab]['links']:
            return 'links'



    operators = [r'<>',r'=',r'>',r'<']
    searchPatt = r''
    operPatt = r''

    for i, op in enumerate(operators):
        if i>0:
            searchPatt = searchPatt + r'|'
            operPatt = operPatt + r'|'
        searchPatt = searchPatt + r'\S+\s+{0}\s+\S+'.format(op)
        operPatt = operPatt + r'{0}'.format(op)

    result = re.findall(searchPatt,links)

    listD = []
    for i, el in enumerate(result):
        oper = re.findall(operPatt,el)
        sp = el.split(oper[0])
        dictExp = {
            'num':i,
            'oper':oper[0],
            'left':sp[0],
            'right':sp[1],
            'inner':'',
            'where':'',
        }

        routeList = dictExp['left'].split('@')
        # if len(routeList) > 1:

        routeList.reverse()
        # print('routeList',routeList)
        inner = ''
        sqlSel = '(SELECT DISTINCT {field} FROM {innerTable} {where}) {table}'
        sqlInner = 'INNER JOIN {0} '

        commonShell = '(SELECT DISTINCT {field} FROM {mainTable} {inner}) {mainTable}'
        #innerSQL = 'INNER JOIN (SELECT DISTINCT {field} FROM {table} INNER JOIN {innerTable} USING({inId}) {where}) {table} USING({field}) '
        innerSQL = 'INNER JOIN (SELECT DISTINCT {field} FROM {table} INNER JOIN {innerTable} USING({inId}) {where}) {table} {USING} '



        sqlRESULT = ''
        lastTable = ''

        for i, routEl in enumerate(routeList):
            mainTabDotField = routeList[i+1] if len(routeList) > i+1 else nameTable
            mainTabDotFieldList = mainTabDotField.split('.')
            mainTab = mainTabDotFieldList[0]
            mainField = mainTabDotFieldList[1] if len(mainTabDotFieldList) > 1 else tables[mainTab]['primarykey']
            tabDotField = routEl.split('.')
            currTab = tabDotField[0]
            currField = tabDotField[1] if len(tabDotField) > 1 else tables[currTab]['primarykey']
            relTab = ''


            print(i)
            print('main',mainTab, mainField)
            print('curr',currTab,currField)


            if mainTab == currTab:
                print('root')

                field = tables[lastTable]['primarykey']

                where = 'WHERE  {0}.{1} = {2}.{3}'.format(lastTable,field,currTab,currField)
                sqlRESULT = 'INNER JOIN {0} {1}'.format(sqlRESULT,where)


            elif tables[mainTab]['relations'].get(mainField) == currTab:
                print('relations')

                param = {
                    'table': currTab,
                    'field': tables[currTab]['primarykey'],
                    'where':''
                }


                if i == 0:
                    param['where'] = "WHERE {0} {1} {2}".format(currField,  dictExp['oper'], dictExp['right'])
                    param['innerTable'] =  currTab
                else:
                    param['innerTable'] = sqlRESULT


                sqlRESULT = sqlSel.format(**param)


            elif currTab in tables[mainTab]['links']:
                print('links' )
                transTable = tables[mainTab]['links'][currTab]['transTable']
                #transId = tables[mainTab]['links'][currTab]['field']
                param = {
                'table':transTable,
                'field': tables[mainTab]['primarykey'],
                'inId': tables[currTab]['primarykey'],
                'where': '',
                'USING':''
                }

                if i==0:
                    param['innerTable'] = currTab
                    param['where'] = "WHERE {0} {1} {2}".format(currTab+'.'+currField,  dictExp['oper'], dictExp['right'])

                elif (i > 0): #and (i != len(routeList)-1):
                    param['innerTable'] = sqlRESULT


                if (i != len(routeList)-1):
                    param['USING'] = 'USING({0})'.format(tables[mainTab]['primarykey'])
                    sqlRESULT = commonShell.format(**{
                    'field' : tables[mainTab]['primarykey'],
                    'mainTable': mainTab,
                    'inner': innerSQL.format(**param),
                    })
                else:
                    sqlRESULT = innerSQL.format(**param)

            lastTable = param.get('table')
        print(sqlRESULT)









        listD.append(dictExp)
    print(listD)



#links = 'transactions.tdate > 10-02-2019 && transactions.is_deleted = 0 && transactions.source@accounts.aname < qwer'
# links = 'transactions.source@accounts@users.login = "admin"'
#links = 'users.login = admin'
# links = 'users.uid@groups.name = admin'
# links = 'transactions.dest@accounts.curr = "UAN"'
filterByLinkedTables('transactions','transactions.dest@accounts@labels.lname = "Расход"')
