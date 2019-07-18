console.log('============= DEMO ============');

;(function () {
    var currentBase = location.pathname.split('/')[1];
  function receiveLogin() {
    var mxhr = new XMLHttpRequest();
    var strParam = 'set_new';
    mxhr.open('POST', window.location.pathname, true);
    mxhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    mxhr.send(strParam);
    mxhr.onreadystatechange = function() {
        if (mxhr.readyState==4){
          try {
            if (mxhr.responseText){
                localStorage.setItem( currentBase+'.demoLogin',mxhr.responseText);
                setLogPass(mxhr.responseText);
                form.submit();
              }
            }
          catch (err) {
          }
          finally {
            mxhr.abort();
          }
      }
    };
  };
  function checkStorage() {
    var logpass = localStorage.getItem(currentBase+'.demoLogin');
    if (logpass) {
      window.addEventListener('load',function() {
          setLogPass(logpass);
      });

    }else{
      receiveLogin();
    }
  };

  function setLogPass(logpass) {

    var logPass = logpass.split('&');
    var loginEl = document.getElementsByName('login');
    loginEl[0].value = logPass[0];
    var passEl = document.getElementsByName('password');
    passEl[0].value = logPass[1];
  }
  if (window.location.search == '?demo') {
    checkStorage();
  }
}());
