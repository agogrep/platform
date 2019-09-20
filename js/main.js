/*jshint esversion: 6 */

// ==== функции общего назначения ==========================

var debugMode = false;

jQuery.cookie = function(name, value, options) {
    /*
    если есть только name - возвращант  значение сокета
    Для установки: name = <str>  value =<str>  options = { path: <str> , [expires:] , [domain:], [secure:]}
    Для удаления: name = <str> value = null options = { path: <str> }
      пример : $.cookie('cl',null,{path:'/'}); - удаляет сокет cl с корневым патчем
    */

    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            // console.log(date);
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        /*CAUTION: Needed to parenthesize options.path and options.domain
        in the following expressions, otherwise they evaluate to undefined
        in the packed version for some reason...*/
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};


jQuery.fn.extend({

    attrs: function (attributeName) {
        var results = [];
        $.each(this, function (i, item) {
            results.push(item.getAttribute(attributeName));
        });
        return results;
    },

    texts: function () {
        var results = [];
        $.each(this, function (i, item) {
            results.push(item.textContent || item.innerText);
        });
        return results;
    },

    loadСontent: function(input) {
      var elTarget = $(this);
      elTarget.empty();
      elTarget.removeAttr('data-reinilock');
      for (var i = 0; i < input.length; i++){
        var el = elTarget.find(input[i].target);
        if (el.is(input[i].target)) {
          if (input[i].content) {
            el.empty();
            for (var c = 0; c < input[i].content.length; c++) {
              el.append(input[i].content[c]);
            }
          }
        }else{
          if (input[i].content) {
            for (var c = 0; c < input[i].content.length; c++) {
              elTarget.append(input[i].content[c]);
            }
          }
        }
      }
    },

    resizeDiv: function(customScript) {
      var thisEl = $(this);
      var blockWidth = thisEl.outerWidth();
      var blockHeight = thisEl.outerHeight();
      new ResizeSensor(thisEl[0], ()=> {
          if ((blockWidth!=thisEl.outerWidth())||(blockHeight!=thisEl.outerHeight())) {
            customScript();
          }
          blockWidth = thisEl.outerWidth();
          blockHeight = thisEl.outerHeight();
      });
    },

    ini: function () {
      var thisEl = $(this);
      var reinilock = thisEl.attr('data-reinilock');
      if (reinilock == undefined) {
        thisEl.find('.dialog').click(function(currentEvent) {
            open(currentEvent);
        });
        thisEl.find('.filterset').filterset();
        thisEl.find('.uniqcontrol').uniqcontrol();
        thisEl.find('.journal').journal();
        thisEl.find('.checkbox').checkbox({useAttrValue:true});
        thisEl.find('.switchbox').checkbox({
                        useAttrValue:true,
                        useSwitch:true,
                        switchScope: '.journal',
                        });
        thisEl.find('.schedulebox').schedule({
          formElement: thisEl,
        });
        var tabsList = thisEl.find('.formtabs');
        tabsList.wintabs({ active:0 });
        thisEl.find('.reportbox').report();
        setLabel(thisEl);
        setDatetimebox(thisEl);
        setPeriodsBox(thisEl);
        setCombobox(thisEl);
        setRipple(thisEl);
        thisEl.attr('data-reinilock',1); // definde from re-ini
        // additional processing. hide blank lines in selectionbox
        thisEl.find('.selectionbox .row .dialog:empty').closest('.row').addClass('subrow');
        thisEl.translate();

        if (thisEl.hasClass('autocomplete')) {thisEl.autocomplete();}
        thisEl.find('.autocomplete').autocomplete();



        var text = serviceData.wordTranslate('not_available')[0];
        thisEl.find('.view-not-available').each((i,el)=>{
          var curEl = $(el);
          var tag = el.tagName;
          if (tag=='INPUT') {
            curEl.attr('type','text');
          }
          curEl.val(text).text(text);
        });
        thisEl.find("[name]:contains('ntvlbl')").each((i,el)=> {
          if (el.lastChild.nodeName=="#text") {
            var replaced = $(el).html().replace("ntvlbl", "["+text+"]");
            $(el).html(replaced);
          }
        });




      }
    },

    translate:function(){
      var thisEl = $(this);
      function _trans(currEl) {
        var title = currEl.attr('title');
        if (title == undefined) {
          var nameList = serviceData.wordTranslate(currEl.text());
          currEl.text(nameList[0]).attr('title',nameList[1]);
        }else{
          var nameList = serviceData.wordTranslate(title);
          currEl.attr('title',nameList[1]);
        }
        currEl.removeClass('lang');
      }
      thisEl.find('.lang').each((i,el)=>{_trans($(el));});
    },

    combobox:function() {
        var thisEl = $(this);
        comboGen(thisEl);
        currval = thisEl.attr('value');
        // console.log('currval',currval);
        if (currval!=''){
          var optEl = thisEl.children('[value="'+currval+'"]');
          if (optEl.length) {
            optEl.attr("selected", "selected");
            thisEl.removeClass('errorvalue');
          }else{
            thisEl.addClass('errorvalue');
          }

        }else{
          var optElList = thisEl.children('option');
          var oVal = optElList.eq(0).attr('value');
          thisEl.attr('value',oVal);
        }
        thisEl.change(function (event) {
          var el = $(event.target);
          var val = el.children(':selected').val();
          el.attr('value',val);
          el.removeClass('errorvalue');
        });
        function order(enumObj) {
           return Object.keys(enumObj).sort();
        };
        function comboGen(element) {
           var enumName = element.attr('data-enumerations');
           if (enumName) {
             var enumObj = serviceData.conformDataBase.enumerations[enumName];
             keyList = order(enumObj);
             // console.log(keyList);
             for (var i = 0; i < keyList.length; i++) {
               var el = keyList[i];
               if (element.find('[name='+el+']').length==0){
                 var text = serviceData.wordTranslate(el)[0];
                 var opt = $('<option>');
                     opt.attr({ 'name': el, 'value': enumObj[el] })
                         .text( text );
                 element.append(opt);
               }
             }
           }
        }
    },

    changeDetect:function(mode='change') { // change  or set
      /* проверка изменений в форме и запись хеша*/
      var elList = this.find('*');
      var str = '';
        for (var i = 0; i < elList.length; i++) {
          str = str + getValElement(elList.eq(i));
          if (this.prop('hidden')) {
            str = str+"hidden";//скрытый элемент используется в form для инициализации удаления елемента
          }
        }
      var hash = str.hashCode();
      if (mode=='set') {
        this.attr('data-hash',hash);
        this.removeClass('turn');
      }else if (mode=='change') {
        var savedHash = this.attr('data-hash');
        if (savedHash == hash) {
          this.removeClass('turn');
        }else{
          this.addClass('turn');
        }
      }else if (mode=='null'){ // для  принудительного сохранение
          this.attr('data-hash',"");
          this.addClass('turn');
      }
    },

    toggleName: function() {
      /* переключение имен (если элемент использет саязанное имя) */
      var dataEl = $(this);
      var name = dataEl.attr('name');
      var asname = dataEl.attr('data-asname');
      if ((asname)&&(name)) {
        dataEl.attr({
          'name':asname,
          'data-asname':name
        })
      }

    },

    changeDiv:function (customScript) {
      /*проверка  изменений в контейнере div*/
      $.each(this, function (i, item) {
        var id = $(item).attr('data-bank');
        if (id==undefined) {
          id = bank.indexSet();
          $(item).attr('data-bank',id);
          bank.data[id] = {
            changeDiv:[],
          }
          setObserv();
        }else{
          id = Number(id);
          if (bank.data[id]['changeDiv']==undefined) {
            bank.data[id]['changeDiv'] = [];
          }
        }
        bank.data[id]['changeDiv'].push((target,mutations)=> {
          // console.log('changeDiv',id);
          customScript(target,mutations);
        });
        function setObserv() {
            var config = {attributes: true,childList: true,characterData: true};
            var observer = new MutationObserver((mutations) =>{
              // console.log('mutations',mutations);
              bank.data[id]['changeDiv'].forEach((fn)=>{
                var target = mutations[0].target;
                fn(target,mutations);//
              })
            });
            observer.observe(item, config);
        }
      });
    },
    changeDiv:function (customScript) {
      /*проверка  изменений в контейнере div*/
      $.each(this, function (i, item) {
        var thisEl = $(item);
        thisEl.data({changeDiv: (target,mutations)=>{
                      customScript(target,mutations);
                      }
          });
        var config = {attributes: true,childList: true,characterData: true};
        var script = thisEl.data().changeDiv;
        var observer = new MutationObserver((mutations) =>{
          var target = mutations[0].target;
          script(target,mutations);
        });
        observer.observe(item, config);
      });
    }
});

function setRipple(el) {
  /*Adds a wave effect to the active element*/
  el.find('.ripple').click(function(e) {
    function strToObj(str) {
      var arr = str.split(';');
      var ob = {};
      arr.forEach((el,i)=>{
        if (el.trim()) {
          let part = el.split(':');
          ob[part[0].trim()] = part[1];
        }
      });
      return ob;
    }

    function cssTextDeleteKey(original,delList) {
      var originalObj = strToObj(original);
      delList.forEach((el,i)=>{
        delete originalObj[el];
      });
      var out = objToCssText(originalObj);
      return out;
    }

    function cssTextUnion(original,addition) {
      var originalObj = strToObj(original);
      var additionObj = strToObj(addition);
      Object.assign(originalObj,additionObj);
      return objToCssText(originalObj);
    }

    function objToCssText(obj) {
      var out = '';
      for (var el in obj) {
        out = out + el + " : " + obj[el]+" ; ";
      }
      return out;
    }

    e = e.touches ? e.touches[0] : e;

    var el = e.target;
    var q_el = $(el);
    if (!q_el.hasClass('not-ripple')) {
      if (!q_el.hasClass('ripple')) {
        q_el = q_el.closest('.ripple');
      }
    }

    if(q_el.hasClass('ripple')){
      el = q_el[0];
      var r = el.getBoundingClientRect();
      var d = Math.sqrt(Math.pow(r.width, 2) + Math.pow(r.height, 2)) * 2;
      el.style.cssText = cssTextDeleteKey(el.style.cssText,['--s','--o','--t','--d','--x','--y']);
      el.style.cssText = cssTextUnion(el.style.cssText,"--s: 0; --o: 1;");
      el.offsetTop;
      el.style.cssText = cssTextUnion(el.style.cssText,"--s: 1; --t: 1; --o: 0; --d: " +
                                                        d + "; --x:" +
                                                        (e.clientX - r.left) + "; --y:" +
                                                        (e.clientY - r.top) + ";");
    }
  })
}


function genScriptSearch(table) {
  var fields = serviceData.conformDataBase.tables[table].fields;
  var script = '';
  for (var el in fields) {
    var curEl = el;
    if (script!='') {
      script = script + ' OR';
    }
    if ((fields[el].type == 'datetime') || (fields[el].type == 'date')  ) {
      curEl = 'CAST('+el+' AS CHAR)';
    }

    script = script +' '+ curEl +' LIKE "%[WORD]%"';
  }
  return script;
}


function getDataAttributes(node) { // возвращает атрибуты в виде объекта
    var d = {},
        re_dataAttr = /^data\-(.+)$/;
    $.each(node.get(0).attributes, function(index, attr) {
        if (re_dataAttr.test(attr.nodeName)) {
            var key = attr.nodeName.match(re_dataAttr)[1];
            d[key] = attr.value;
        }
    });

    return d;
}

function getValElement(el) { // возвращает значение елемента в зависимости от типа
      tagName = el.prop("tagName");
      var val;
      if ((tagName=='INPUT')||(tagName=='TEXTAREA')||(tagName=='SELECT')) {
        val = el.val();
      }else {
        val = el.attr('value');
      }

      if (!val) {
        if (el.hasClass('datetimebox')||
            el.hasClass('combobox')) {
          val = '';
        }else {
          if (tagName!='TEXTAREA') {
            val = el.text();
          }
        }
      }
      return val;
}



/////////////////  checkchanges ////////////////////////////////////
//////////// для проверки изменений в форме /////////////////////////
;(function() {
  var stack_сhanges = {};
  function set(win_id,mode) {
    if (win_id&&mode) {
      var str='';
      el_stack = $(win_id+' '+'[name]');
      for (var i = 0; i < el_stack.length; i++) {
        //обрабатываем значения VALUE . для сегов 'INPUT' текущие значения
        // можно получить только через val()
        val = getValElement(el_stack.eq(i));
        str = str+val;
      }
      len = $(win_id+' .turn').length
      str = str + len;
      switch (mode) {
        case 'set': stack_сhanges[win_id] = str;
        break;
        case 'check':
          if (stack_сhanges[win_id]==str) {
            return false
          }else {
            return true
          }
        break;
        case 'reset': stack_сhanges[win_id]='';
        break;
        default:
      }
    }
  }
  window.checkchanges = set;
}());




///////////////////  REQUEST ////////////////////////////////////
;(function() {
  var beforeCounter = 100;
  var afterCounter = 100;
  var regular = []
  var dataStack = {};
  var callStack = {};
  var synchMode = true;

  function wait() {
    synchMode = false;
  }

  function setRegular(order,callback) {
  /*
    устонавливает callback, который должен возвращать данные (data) и список обработчиков
    order - ('before'/ 'after') определяет порядок загрузки в общий стек запроса
  */
    regular.push([order,callback])
  }

  function set(data,call,mode='send',order='after') {
    counter = 0
    if (order=='after') {
      afterCounter = afterCounter +1;
      counter = afterCounter;
    }else if (order=='before') {
      beforeCounter = beforeCounter-1;
      counter = beforeCounter;
    }
    // mode - send / wait
    dataStack[counter] = data;
    callStack[counter] = call;
    if( mode=='send'){
      sendAll();
    }
  };


  function sendAll() {
      for (var i = 0; i < regular.length; i++) {
        try {
          toSendData = regular[i][1]();
          set(toSendData.data,toSendData.call,'wait',regular[i][0]);
        } catch (e) {
          console.error(e);
        }
      }
        if(debugMode){console.log('mxhRequest',dataStack);}
        var mxhr = new XMLHttpRequest();
        var strParam = JSON.stringify(dataStack);
        var currCallStack = callStack;
        dataStack = {};
        callStack = {};
        beforeCounter = 100;
        afterCounter = 100;
        path = window.location.pathname;
        pthList = path.split('/');
        rightsPath = '/'+pthList[1]+'/';
        mxhr.open('POST', rightsPath , synchMode);
        mxhr.setRequestHeader('Content-Type', 'application/json');
        mxhr.send(strParam);
        // console.log('mxhr.responseText',mxhr.responseText);

        var whenLoad = ()=>{
            if (mxhr.readyState==4){
              var input;
              var error;
              try {
                if ($.trim(mxhr.responseText)) {
                  input = JSON.parse(mxhr.responseText);
		  if(debugMode){console.log('responseText input',input);}
                  for (var num in input) {
                    if (num == 'error') {
                      for (var i = 0; i < input[num].length; i++) {
                        console.error(input[num][i].request,'\n',input[num][i].log);
                        info = 'The request was made with errors, see the browser logs >>';
                        $('<div>').html(info).windialog({'typedialog':'error'});
                      }
                    }else{
                      calls = currCallStack[num];
                      if (typeof(calls)=='object') {
                        for (var i = 0; i < calls.length; i++) {
                          try {
                            calls[i]( input[num] );
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }
                    }
                  }
                  }
                }
              catch (err) {
                input = mxhr.responseText;
                error = err;
                console.error(error);
                try {
                  $('<div>').html(input).windialog({'typedialog':'error'});
                } catch (e) {}
              }
              finally {
                mxhr.abort();
              }
          }
        };

        if (synchMode) {
          mxhr.onreadystatechange = whenLoad;
        }else{
          whenLoad();
          synchMode = true;
        }



      //   mxhr.onreadystatechange = function() {
      //       if (mxhr.readyState==4){
      //         var input;
      //         var error;
      //         try {
      //           if ($.trim(mxhr.responseText)) {
      //             input = JSON.parse(mxhr.responseText);
		  // if(debugMode){console.log('responseText input',input);}
      //             for (var num in input) {
      //               if (num == 'error') {
      //                 for (var i = 0; i < input[num].length; i++) {
      //                   console.error(input[num][i].request,'\n',input[num][i].log);
      //                   info = 'The request was made with errors, see the browser logs >>';
      //                   $('<div>').html(info).windialog({'typedialog':'error'});
      //                 }
      //               }else{
      //                 calls = currCallStack[num];
      //                 if (typeof(calls)=='object') {
      //                   for (var i = 0; i < calls.length; i++) {
      //                     try {
      //                       calls[i]( input[num] );
      //                     } catch (e) {
      //                       console.error(e);
      //                     }
      //                   }
      //                 }
      //               }
      //             }
      //             }
      //           }
      //         catch (err) {
      //           input = mxhr.responseText;
      //           error = err;
      //           console.error(error);
      //           try {
      //             $('<div>').html(input).windialog({'typedialog':'error'});
      //           } catch (e) {}
      //         }
      //         finally {
      //           mxhr.abort();
      //         }
      //     }
      //   };
      }
  window.mxhRequest = set;
  window.Request = {
    setRegular: setRegular,
    set: set,
    sendAll: sendAll,
    wait:wait
  };

}());

var Utf8 = {
    // public method for url encoding
    encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    },
    // public method for url decoding
    decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
        while ( i < utftext.length ) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
}


function jsonToBase64(obj) {
  var strParam = JSON.stringify(obj);
  strParam = Utf8.encode(strParam)
  return btoa(strParam);
}



function hreftoobject(href) {
    var buf = href.split('?') ? href.split('?') : '' ;
    var path = buf[0] ? buf[0] : '';
    var request = buf[1] ? buf[1] : '';
    buf = request.split('&');
    var req_arr = {};
    for(i=0;i<buf.length;i++){
      buf_a = buf[i].split('=');
      req_arr[buf_a[0]] = buf_a[1];
    }
    var out_arr = {};
    out_arr['path'] = path;
    out_arr['request'] = req_arr;
    return out_arr;
}


function spot_target(selector,level) {
		// level = 0 -  корень. 1 - последний вложенный елемент
		var stack = selector.split(' ');
    var is_levels = $(selector).length;
    if (level){
    	out =  is_levels ? selector : stack[0];
    } else {
     	out = stack[0];
    }
    return out
}


function autoCompleteDocuments(file,scriptName,arg) {
  //'''life - object, param'''
  var xhr = new XMLHttpRequest();
  var request = {
    target:{
      'module':'content',
      'class': "comDoc",
    },
    param:{
      _line:'fill',
      scriptName: scriptName,
      arg: arg
    }
  }
  var path = window.location.pathname;
  var pthList = path.split('/');
  var rightsPath = '/'+pthList[1]+'/';
  xhr.open('POST', rightsPath+'?'+ jsonToBase64(request) , false);
  xhr.setRequestHeader('Content-Type','application/octet-stream' );
  xhr.send(file);
  // console.log('xhr.response',xhr.response);
  if (xhr.status == 200) {
    request.param = {
      _line:'load',
      name:xhr.response,
      type:file.type
    }
    var url = rightsPath+'?'+ jsonToBase64(request);
    var aLinkEL = $('<a>').attr({
      href: url,
      type: 'application/octet-stream',
      download: file.name
    }).text(file.name);
    $('body').append(aLinkEL);
    aLinkEL[0].click();
    setTimeout(function() {
        aLinkEL.remove();
    }, 0);
  }else{
    $('<div>').html(xhr.response).windialog({'typedialog':'error'});
  }

}


var serviceData = {
  /*object with service information (presets, current user data,
       access rights, cached words of search queries,names of forms in different languages)*/

    /*
    // Кэширование слов
    var availableWords = [];

    function getCache() {
      locVal = localStorage.getItem('availableWords');
      locVal = JSON.parse(locVal);
      if (locVal!=null) {
        availableWords = locVal;
      }
    }


    function setCache(Field) {
      var source = Field.autocomplete( "option", "source" );
      var val = Field.val();
      if (source.indexOf(val) == -1){
          source.push(val);
          localStorage.setItem('availableWords', JSON.stringify(source));
          Field.autocomplete("destroy");
          Field.autocomplete({source: source});
       }
    }

    */

    currentUser:{},
    presets:{},
    cachedWords:{}, // рудимент
    namesOfForms:{},
    patterns:{},
    conformDataBase:{},
    reports:{},
    checkСache: function () {
      var currentBase = location.pathname.split('/')[1];
      var data = localStorage.getItem(currentBase+'.serviceData');
      if (data) {
        try {
          data = JSON.parse(data);
          Object.assign(this,data);
          return true;
        } catch (e) {
          localStorage.removeItem(currentBase+'.serviceData');
          return false;
        }
      }else{
        return false;
      }

      if(debugMode){console.log(data);}
    },
    load:function(part='all') {
      var currentBase = location.pathname.split('/')[1];
      if (!this.checkСache()) {
        var prom = new Promise((resolve)=>{
          var language = window.navigator ? (window.navigator.language ||
                    window.navigator.systemLanguage ||
                    window.navigator.userLanguage) : "en";
          language = language.substr(0, 2).toLowerCase();
            var thisEL = this;
            var call =[
              function(input) {
                input.forEach(function(el) {
                  if (el.target == 'servicedata') {
                      Object.assign(thisEL,el.content);
                  }
                });
                resolve();
                localStorage.setItem( currentBase+'.serviceData',JSON.stringify(serviceData));
              },
            ];
            var out = [
                      {
                        'target':{
                            'module':'content',
                            'class': "ServiceData",
                        },
                        'param':{
                          currentUser:{},
                          presets:{},
                          cachedWords:{},
                          namesOfForms:{lang:language},
                          patterns:{},
                          conformDataBase:{},
                          reports:{}
                        }
                      }
            ];
            mxhRequest(out,call);
        });
        return prom;
      }else{
        var prom2 = new Promise((resolve)=>{
	  if(debugMode){console.log(serviceData);}
          resolve();
        });
        return prom2;
      }

    },

    saveToCache:function (part) {},
    send:function (part) {},
    wordTranslate:function (word) {
      var out = [word,word];
      var _word = word.trim();
      var nameList = this.namesOfForms[_word];
      if (typeof(nameList)=="object") {
        out = nameList;
        if (nameList[1] == '') {
          out[1] = nameList[0];
        }
      }
      return out
    },
    remove: function() {
      currentBase = location.pathname.split('/')[1];
      localStorage.removeItem(currentBase+'.serviceData');
    },
};


function complexNameToObject(complexName) {
    /* разделяет комплексное имя типа 'name(1)' на name и attachment (app)*/
    var step1 = complexName.split('(');
    var name = step1[0];
    var app = '';
    if(step1.length>1){
      app  = step1[1].replace(')','');
    }
    return {name:name,app:app};
}

function nameToComplexName(name,app) {
  return name+'('+app+')';
}





//////////////////////////////// MessagesService /////////////////////////
;(function () {
    stampupdate = 0;
    // function stump(num) {
    //   if (num==undefined) {
    //     return stampupdate
    //   }else{
    //     stampupdate = num;
    //   }
    // }

    function doNotShow(idList) {
      uid = serviceData.currentUser.uid;
      out = [
        {
          target:{
            'module':'content',
            'class':'Message',
          },
          param:{
            _line:'doNotShow',
            idList: idList
          }
        }
      ];
      call = [()=>{}];
      Request.set(out,call,'wait');
    };

    function toSend() {
      uid = serviceData.currentUser.uid;
      data = [
        {
          target:{
            'module':'content',
            'class':'Message',
          },
          param:{
            _line:'get',
            _stampupdate: stampupdate,// stump(),
            links: '(mdest = u'+uid+' || mdest = ALL)',//++' && mdest = g1'
          }
        }
      ];
      call = [
        (input)=>{
          for (var i = 0; i < input.length; i++) {
            if (input[i].content){
              var messList = input[i].content;
              var idList = []
              for (var j = 0; j < messList.length; j++) {
                if (messList[j].is_read == 0){
                  idList.push(messList[j].mid)
                  if (messList[j].type=="window") {

                    var infoEl = $('<div>');
                    $('body').append(infoEl);
                    infoEl.append(messList[j].mess);

                    if (infoEl.children('iframe').length) {
                      infoEl.windialog({
                        typedialog: 'frame',
                        title:"system info"
                      })
                    }else{
                        infoEl.windialog();
                    }

                  }
                }
              }
              if (idList.length) { doNotShow(idList) };
              if (input[i]._stampupdate){
                  stampupdate = input[i]._stampupdate;
              }
            }
          }
        }
      ];
      return {data,call};
    };

    function start() {
      Request.setRegular('after',MessagesService.toSend);
      Request.sendAll();
    }
    window.MessagesService = {
      start: start,
      toSend: toSend,
    }
}());


// перевести
function setDatetimebox(rootElement) {
  var defaultNames = {
    list_days_of_week: 'Su,Mo,Tu,We,Th,Fr,Sa',
    list_names_of_months: 'Jan,Feb,Mar,Apr,May,June,July,Aug,Sept,Oct,Nov,Dec'
  }
  // Do,Lu,Ma,Mi,Ju,Vi,Sá
  // enero,feb,marzo,abr,mayo,jun,jul,agosto,sept,oct,nov,dic
  //'Янв,Фев,Мар,Апр,Май,Июн,Июл,Авг,Сен,Окт,Ноя,Дек',
  //'Вс,Пн,Вт,Ср,Чт,Пт,Сб'

  function getNames(sysName) {
    var nameStr = serviceData.wordTranslate(sysName)[0];
    if (nameStr==sysName) {
      nameStr = defaultNames[sysName]
    }
    return nameStr.split(',');
  }
  //days_of_week
  $.setDateTimePickerConfig({
    yearName: '',
    monthName: getNames('list_names_of_months'),
    dayName: getNames('list_days_of_week')
  });
  var datetimeboxList = rootElement.find('.datetimebox');
  for (var i = 0; i < datetimeboxList.length; i++) {
    datetimeboxList.eq(i).dateTimePicker(datetimeboxList.eq(i).data());
  }
}


function setCombobox(rootElement){
   var comboboxsList = rootElement.find('.combobox');
   for (var i = 0; i < comboboxsList.length; i++) {
     comboboxsList.eq(i).combobox();
   }
}

function setPeriodsBox(rootElement) {
  var periodsList = rootElement.find('.periods');
  for (var i = 0; i < periodsList.length; i++) {
    var selectEl = periodsList.eq(i);
    var currentValue = selectEl.attr('value');
    var dictPeriods = serviceData.reports.currentPeriods;
    for (var el in dictPeriods) {
      var optEl = $('<option>');
      var data = dictPeriods[el];
      optEl.attr('value',el).text(data.name+" "+data.startdate+" "+data.enddate);
      selectEl.append(optEl);
    }
    selectEl.val(currentValue.trim()).trigger("chosen:updated");
  }
}



function setLabel(rootElement) {
  var inputList = rootElement.find('.autolabel');
  inputList.each(function(i,el) {
    var thisEl = $(el);
    thisEl.removeClass('autolabel');
    var name = thisEl.attr('name');
    nameList = serviceData.wordTranslate(name);
    var label  = $('<label class = "autonamelab">');
    label.text(nameList[0]+':');
    var div = $('<div class="field-box" >');
    div.attr('title',nameList[1]);
    thisEl.wrap(div);
    thisEl.before(label);
    if (thisEl.width()<200) {
      label.width('auto');
    }
    if (thisEl.height()>40) {
      label.css('white-space','normal')
    }
  })
}



// function setDateRange(rootElement) {
//     rootElement.append($(
//     '<div>'+
//       '<label>from</label>'+
//       '<input id = "startdate" class = "datetimebox" type = "text"/>'+
//     '</div>'+
//     '<div>'+
//       '<label>to</label>'+
//       '<input id = "enddate" class = "datetimebox" type = "text"/>'+
//     '</div>'
//   ));
//   var startdateEl = rootElement.find('#startdate');
//   var enddateEl = rootElement.find('#enddate');
//   var value = [];
//   function valToElement() {
//     try {
//       value = JSON.parse(rootElement.attr('value'));
//     } catch (e) {
//       value = [];
//     }
//     if (value.length==1) {
//       let curDate = new Date();
//       startdateEl.val(curDate.toISOString().substr(0, 10));
//       enddateEl.val(value[0]);
//     }
//     if (value.length==2) {
//       startdateEl.val(value[0]);
//       enddateEl.val(value[1]);
//     }
//   }
//   function elemToValue() {
//
//     var startdate = startdateEl.val();
//     var enddate = enddateEl.val();
//
//     if ((startdate)&&(enddate)) {
//         var y1 = new Date(startdate);
//         var y2 = new Date(enddate);
//         if (y1>y2) {
//           alert('ERROR Date Range');
//           valToElement();
//         }else{
//           value[0] = startdate;
//           value[1] = enddate;
//         }
//       }else if (enddate) {
//         value = [enddate];
//       }else{
//         value = [];
//       }
//     }
//
//     valToElement();
//     rootElement.find('#startdate, #enddate').change(()=>{
//       elemToValue();
//       rootElement.attr('value',JSON.stringify(value));
//     })
// }




function setSelectionbox(tableName,ini=true) {
  // ini - производить установку событий
  var masterkey = serviceData.conformDataBase.tables[tableName].primarykey;
// find string which any text 5-40 charts
  var name = ''; // srt 5-40
  var strName = '';
  var feildList = serviceData.conformDataBase.tables[tableName].showprimary;
  if (feildList) {
    for (var i = 0; i < feildList.length; i++) {
       strName += '<div name = "'+feildList[i]+'"></div>';
    }
  }
  var box =  '<div  class = "selectionbox"> '+
              '<div id = "btn" type="button" '+
                        'class = "dialog button-select ripple" '+
                         'data-typedialog = "selectItems" '+
                         'data-choicemode = "one" '+
                         'data-masterfield = "'+masterkey+'" '+
                         'data-path = "/'+tableName+'_list/" '+
                         'data-countrows =  8 '+
                         'data-links = "" '+
                         'data-relationship = "#box">'+
                         '<svg><use xlink:href="/file/ico/sprite.svg#three-point"></use></svg>'+
             '</div>'+
              '<div id = "box" class = "selectionvalue ">'+
               '<div class = "row">'+
                 '<div name = "'+masterkey+'"></div>'+
                 strName+
               '</div>'+
             '</div>'+
            '</div>';

    box = $(box);
    if (ini) {
      box.ini();
    }
  return box;
}


window.addEventListener("beforeunload",ifClosedPage );
function ifClosedPage(e) {
        if ($('.turn').length) {
          e.returnValue=0;
        }
}




//=================================  Start system ================================

function start() {
  $('#desktop').desktop();
  serviceData.load().then(()=>{
    $('body').ini();
    $('#login_name').text(serviceData.currentUser.login);
    MessagesService.start();
    iniSettingsPanel();


    try { customScript(); } catch (e) {console.error(e);}

  });
}



function exit() {
  var call = [
    function () {
      var currentAddr = document.createElement('a');
      currentAddr.setAttribute('href', location.href);
      var currentBase = location.pathname.split('/')[1];
      $.cookie(currentBase,null,{path:'/'+currentBase});
      $.cookie('cl',null,{path:'/'+currentBase});
      $.cookie('ml',null,{path:'/'});
      serviceData.remove();
      location.assign(location.href);
    }
  ];
  var out = [
        {
          'target':{
              'module':'serverman',
              'class': "FormsAccessControl",
          },
          'param':{
            '_line': 'delete'
          }
        },
        {
          'target':{
              'module':'serverman',
              'class': "Control",
          },
          'param':{
            '_line': 'logout'
          }

        }
  ];
  mxhRequest(out,call);
}

// ///////////////////////////////////////////////


function spoilerSwitch(el) {
  var thisEl = $(el);
  var spoilerEl = thisEl.next().eq(0);

  spoilerEl.toggleClass('spoiler');

  if (spoilerEl.hasClass('spoiler')) {
      thisEl.removeClass('open');
  }else{
      thisEl.addClass('open');

  }
}


//  ================= sysTrigger =================

;(function() {
  var stack = {};

  function add(name,func) {
    if (!(name in stack)) {
      stack[name] = $.Callbacks();
    }
    stack[name].add(func);
  }

  function run(name,param) {
    if (name in stack) {
      stack[name].fire(param);
    }
  }
  function del(name,func) {
    if (name in stack) {
      stack[name].remove(func);
    }

  }
  window.sysTrigger = {
    add: add,
    run: run,
    del: del,
  };
})();
