def form(line):
    def repar(currCh,resline=''):
        return currCh+'('+resline+')' if resline else currCh
    res = ''
    for ch in line:
        res = repar(ch,res)

    return res



print(form('abc'))
