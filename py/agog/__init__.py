from . import content
from . import db
from . import serverman
from . import reportscripts
from . import serverman
from . import sqlgen
from . import tools


#  settings
traceLevel = 10 # tracing level for error output
showErrorResponse  = True # Show error in response body


accessDepth = 3 # для установки прав доступа на файл или папку
''' функция Storage().setPermission() если не находит нужный файл, то ищет
ближайшую папку радителя. accessDepth - это уровень поиска'''

enabledCachingConfig = False
