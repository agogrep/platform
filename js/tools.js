////////////////////////////////////////////////////////////
// Подсчет времени
var timelist = []
function tmset() {
      var tm = new Date();
      timelist.length = 0
      timelist.push(
        {
              'label':'start',
              'time':tm.getTime()
        }
      )
}
function tmrec(label) {
  var tm = new Date();
  timelist.push(
    {'label':label,
      'time':tm.getTime()}
  )
}
function tmout() {
  el0 = timelist[0]
  // console.log(el0.time);
  timelist.forEach(function(el) {
    if (el.label!='start') {
      var stm = el.time - el0.time
      // console.log(el.time);
      console.log(el.label,stm);
    }
  });
}
////////////////////////////////////////////////////////////
