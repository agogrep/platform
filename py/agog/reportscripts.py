import sys

from datetime import datetime
import logging

agog  = sys.modules[__package__]



def loadToServiceDate():
    list = ['currentPeriods']
    out = {}

    currentModule = sys.modules[__name__]
    for el in list:
        script = getattr(currentModule, el)
        out[el] = script()
    return out



def currentPeriods(**param):
    '''
        {
            date: <str>,
            rpid: <int>
        }

    '''
    date = param.get('date') if 'date' in param else str(datetime.now().date())
    rpid = param.get('rpid') if 'rpid' in param else ''
    if rpid:
        where = 'WHERE rpid = {0} AND is_deleted = 0'.format(rpid)
    else:
        where = 'WHERE is_deleted = 0'
    sql = '''
        SELECT @id := rp.rpid rpid, rp.name,
        DATE_ADD((SELECT edate FROM events WHERE relclass = "reportperiods" AND edate < "{date}" AND relid = @id  ORDER BY edate DESC  LIMIT 1), INTERVAL 1 DAY) startdate,
        (SELECT edate FROM events WHERE relclass = "reportperiods" AND edate >= "{date}" AND relid = @id  ORDER BY edate LIMIT 1) enddate
        FROM
        (SELECT rpid, name FROM reportperiods {where}) rp;

    '''.format(date=date,where=where)
    base  = agog.db.dbSql()
    rows = base.request2(sql)
    out = {}
    for row in rows:
        row['startdate'] = str(row['startdate'].date()) if  row['startdate'] else ''
        row['enddate'] = str(row['enddate'].date()) if  row['enddate'] else ''
        out[row.pop('rpid')] = row
    # log(rows)


    return out
