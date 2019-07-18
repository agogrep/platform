import importlib

modList = [
            'inspect',
            'traceback',
            'pathlib',
            'importlib',
            'hashlib',
            'ctypes',
            'copy',
            # 'mysql.connector',
            'lxml' ,
            'configparser',
            'datetime',
            'pprint',
            'logging',
            'json',
            'ast',
            'sys',
            'pickle',
            'hjson',
            're',
            'time',
            'shutil',
            'ftplib',
            'smtplib',
            'flock',
            'mimetypes',
            'calendar',
            'decimal',
            'subprocess',
            'getpass',
            'crontab',
]

notFound = []
for mod in modList:
    try:
        importlib.import_module(mod)
    except Exception as e:
        notFound.append(e.name)

print(notFound)
