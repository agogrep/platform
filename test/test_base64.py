# eyJuYW1lIjoicXdlciIsInNpemUiOjEwLCJxcSI6MTIzNCwiYWEiOiLQv9GA0LjQstC10YIg0Y3RgtC+INGPIn0=
import re
import base64, json

def isBase64(string):
    reg = r'^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$'
    return True if re.search(reg,string) else False



r = 'eyJuYW1lIjoicXdlciIsInNpemUiOjEwLCJxcSI6MTIzNCwiYWEiOiLQv9GA0LjQstC10YIg0Y3RgtC+INGPIn0='
print('base64',isBase64(r))

inData = json.loads(base64.b64decode(r).decode())

print(inData)
