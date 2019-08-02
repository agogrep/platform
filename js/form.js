/*jshint esversion: 6 */

(function( $ ) {
      $.widget( "animation.textOutput",{
        options: {
          charTimeout: 70,
          timeWaiting: 20,
          showWaiting: false,
          _handleList:[],
          extraText : 'please wait',
          lastStrings: '',
          text: '',
          triggerWaiting:0,
          separator: ''
        },

        _create: function() {
        },

        stop: function () {
          for (var i = 0; i < this.options._handleList.length; i++) {
            clearTimeout(this.options._handleList[i])
          }
          this.options.lastStrings += this.options.text;
          this.element[0].innerHTML = this.options.lastStrings;
        },

        start:function (charTimeout) {
          var chTime = charTimeout ? charTimeout : this.options.charTimeout;
          this.options.lastStrings += this.options.separator;
          var el = this.element[0];
          var i = 0,
          __print = ()=>{
      			i++;
            delete this.options._handleList[i];
      			if(( i <= this.options.text.length )){
      				el.innerHTML = this.options.lastStrings + this.options.text.substr(0, i);
              el.scrollTop = el.scrollHeight;
      				var nexHandle = setTimeout( __print, chTime,i);
              this.options._handleList.push(nexHandle);
      			}else{
              if (this.options.showWaiting) {
                if (this.options.triggerWaiting==0) {
                  this.print(this.options.extraText,' ');
                  this.options.triggerWaiting = 1;
                }else if (this.options.triggerWaiting==1) {
                  this.print(this.dotGen(),' ',1000);
                  this.options.triggerWaiting = 0;
                }
              }
            }
      		};
      		__print();
        },

        dotGen: function() {
          this.options.triggerWaiting = 1;
          var range = [...Array(this.options.timeWaiting).keys()];
          var dots = '';
          for (var i = 0; i < range.length; i++) {
            dots +='.';
          }
          return dots;
        },

        print:function(text,separator,charTimeout) {
          this.stop();
          if (separator) {
            this.options.separator = separator;
          }
          this.options.text = text;
          if (this.options.extraText!=text) {
            this.options.triggerWaiting = 0;
          }
          this.start(charTimeout);
        },
        clear:function() {
          this.options.text = '';
          this.options.lastStrings = '';
          this.element[0].innerHTML = '';
        },

        _setOption: function( key, value ) {
          $.Widget.prototype._setOption.apply( this, arguments );
          this._super( "_setOption", key, value );
        },

        destroy: function() {
          $.Widget.prototype.destroy.call( this );
        }
      });
  }( jQuery ) );




String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};





(function( $ ) {
    $.widget( "elementsControl.form", {
      options: {
        relationshipElement:$(''),
        initialData: null, // первичный шаблон для пресета
        href:'', // запрос
        path:'',
        lcode:'', // lock code для управления блокировкой формы
        masterfield:'',
        id:0,
        lastHash: 0,
        status:'',// record result: DONE, RECORDLOCK, ERROR
        preset:'',
        contentMainForm:{},// при сохранении формы, здесь хранится копия
        _lastButtonPressed: null, // используется при подтверждении удаления
        beforeSaving:function() {},
        call:function () {},
        whenCloseForm:function (element) {},
        whenSevedForm:function() {},
      },

      _create: function() {
        var objHref = hreftoobject(this.options.href);
        this.options.path = objHref.path;
        for (var key in objHref.request) {
          this.options.masterfield = key;
          this.options.id = objHref.request[key];
        }
        this.load();
      },

      load:function () {
        var data = {};
        var thisEl = this.element;
        data[this.options.masterfield] = this.options.id;
        data['pp'] = 'part';
        var call = [function(input) {
          thisEl.form('option','initialData',input);
          thisEl.loadСontent(input);
          var m_name = thisEl.find('.master').attr('name');
          thisEl.form('option','masterfield',m_name);
          thisEl.form('buttonControl');
          thisEl.form('lockForm',true);
          thisEl.form('getHash',true);
          thisEl.find('#apply').click(function() {
            thisEl.form('save');
          });
          thisEl.find('#ok').click(function() {
            thisEl.form('option','call',function() {
                        if (thisEl.form('option','status')=='DONE') {
                            thisEl.form('result');
                        }
                  });
            if (thisEl.form('change')) {
              thisEl.form('save');
            }else {
              thisEl.form('result');
            }
          });
          thisEl.find('#cancel').click(function() {
            thisEl.form('option','_lastButtonPressed','cancel');
            thisEl.form('result');
          });
          thisEl.find('#delete').click(function() {
            thisEl.find('.formsection').attr('hidden',true);
            var mess = $('<div class = "war-delete"></div>').text( serviceData.wordTranslate('form_will_be_deleted')[0] );
            thisEl.prepend(mess);
            thisEl.find("#allowchange,#delete,#apply").remove();
            thisEl.form('option','_lastButtonPressed','delete');
          });
        }];
        this.sent(data,call);
      },
      sent:function(data,call) {
          var thisEl = this.element;
          call.push(this.options.call);
          call.push(function () {
            thisEl.change(function(el) {
              $(this).find('.formsection').each(function (i,el) {$(el).changeDetect();})
            })
            thisEl.changeDetect('set');
            thisEl.find('.formsection').each(function (i,el) {$(el).changeDetect('set');})
          });

          call.push(function () {
            try {
              if (! Number(thisEl.form('option','id'))) {
                thisEl.form('iniPreset');
              }
            } catch (e) {}

          });
          // трансформация в новы протокол ==============
          var outData = data;
          outData.path = this.options.path
          var out = [
                  {
                    'target':{
                        'module':'content',
                        'class': "Form",
                    },
                    'param': outData
                  }
          ];
          mxhRequest(out,call);
      },

      change: function () { // проверка изменений в форме. возвращает boolean
        var hash = this.getHash();
        if (this.options.lastHash!=hash) {
          return true;
        }else{
          return false;
        }
      },

      buttonControl:function() {
        var delimiter  = $('<div class = "delimiter">');
        var btOk = $('<button id ="ok">').text('ok');
        var btcancel =  $('<button id ="cancel" class = "lang" >').text('cancel');
        var btApply = $('<button id ="apply" class = "ripple lang">').text( serviceData.wordTranslate('apply')[0] );
        var btDelete = $('<button id ="delete" class = "lang">').text( serviceData.wordTranslate('delete')[0] );
        var btAllowСhange = $('<button id ="allowchange" class = "ripple lang">').text( serviceData.wordTranslate('change')[0]);
        var prSaveBox = $('<div id = "formsavebox" title="preset" style = "float:right; margin-right: 6px;">');
        this.element.append(delimiter,btOk,btcancel,btApply,btDelete);
        this.element.prepend(prSaveBox,btAllowСhange);
        btAllowСhange.click(()=> { this.allowChange(); });

      },

      iniPreset:function() {
        var thieEl = this.element;
        this.element.find("#formsavebox").preset({
          className: this.options.path.split('/').join(''),
          currentPreset:this.options.preset,
          whenChanges:()=>{
            thieEl.form('presetToForm');
            try {
              thieEl.windialog('option','customScript').whenEndLoad();
            } catch (e) {}
            thieEl.find('#form [name]').change();
          },
          beforeSaving:()=>{
            thieEl.form('formToPreset');
          }
        });
      },

      presetToForm:function() {
        var data =   this.element.find("#formsavebox").preset('option','data');
        var contEl = $('<div>');
        contEl.loadСontent(this.options.initialData);
        console.log('initialData',this.options.initialData);
        var newFormEl = contEl.find('#form');
        var formEl = this.element.find('#form');
        formEl.replaceWith(newFormEl);
        data = JSON.parse(data);
        var stack = data.fieldval;

        function setValueToElements(elList,valDict) {
              for (var name in valDict) {
                var el = elList.filter('[name='+name+']');
                if (el.length) {
                  var tag = el[0].tagName;
                  if (tag=='INPUT') {
                    el.val(valDict[name]);
                  }else if (tag=='DIV') {

                    //загрузка данных для  иконки
                    var dataName = el.attr('data-asname') ? el.attr('data-asname'): name ;
                    if (el.is('[data-'+dataName+']')) {
                      el.attr('data-'+dataName,valDict[name]);
                    } // ----------

                    el.text(valDict[name]);
                    if (el.hasClass('dialog')) {
                      setLinkForWindialog(el);
                    }
                  }
                }
              }
        }

        var sectionNotMain = [];
        for (var classEl in stack) { // ищем секции не main и ставим защиту
            if (classEl !== 'main') {
              this.element.find('#form #'+classEl+' *').addClass('do-not-use');
              sectionNotMain.push(classEl);
            }
        }
        var mainDict = stack.main[0];
        var mNameList = this.element.find('#form [name]:not(.do-not-use)');
        setValueToElements(mNameList,mainDict);
        for (var i = 0; i < sectionNotMain.length; i++) {
          var rowValList = stack[sectionNotMain[i]];
          var secEl = this.element.find('#form #'+sectionNotMain[i]);
          secEl.find('.do-not-use').removeClass('do-not-use');
          var rowEl = secEl.find('.row');
          for (var j = 0; j < rowValList.length; j++) {
            var clonRowEl = rowEl.clone();
            secEl.append(clonRowEl);
            var elNameList  = clonRowEl.find('[name]');
            setValueToElements(elNameList,rowValList[j]);
          }
          if (secEl.find('.row').length > 1) {
            rowEl.remove();
          }


        }
        if (data.selectItemsLinks) {
          for (var el in data.selectItemsLinks) {
            var currEL = this.element.find('#form [data-relationship="'+el+'"]');
            currEL.attr('data-links',data.selectItemsLinks[el]);
          }
        }
        newFormEl.ini();
      },

      formToPreset:function() {
        var fieldval = this.getData();
        var listSel = this.element.find('.selectionbox');
        listSel.each((i,el)=>{
          var elSelOne = $(el).find('[data-choicemode="one"]');
          if (elSelOne.length) {
              var listName = $(el).find('.row [name]');
              listName.each((j,ln)=>{
                var lnEl = $(ln);
                var name = lnEl.attr('name');
                var val = lnEl.text();
                if (name && val) {
                  fieldval.main[0][name] = val;
                }
              });
          }
        });
        var selectItemsLinks = {};
        var selectItemsEl = this.element.find('[data-typedialog="selectItems"]');

        selectItemsEl.each((i,el)=>{
          var currEl =$(el);
          var relId = currEl.attr('data-relationship');
          var links = currEl.attr('data-links');
          if (links) {
            if (relId) {
              selectItemsLinks[relId] = links;
            }
          }
        });

        var data = {
          fieldval : fieldval,
          selectItemsLinks : selectItemsLinks
        };
        data = JSON.stringify(data);
        this.element.find("#formsavebox").preset('option','data',data);
      },

      lockForm:function(status) {
        let list = this.element.find('input, textaria, .button-select, .checkbox, .combobox,#ok,#apply,#delete,#generator');
        let mf = this.options.masterfield;
        let id = Number(getValElement(this.element.find('[name='+mf+']')));
        if (id) {
          if (status) {
            list.addClass('disabled');
            this.element.find('#allowchange').removeClass('disabled');
          }else{
            list.removeClass('disabled');
            this.element.find('#allowchange').addClass('disabled');
          }
        }else {
          this.element.find('#allowchange').addClass('disabled');
        }
      },

      removeLocks:function() {
          if (this.options.lcode) {
          var  out =  [
                    {
                      'target':{
                          'module':'serverman',
                          'class': "FormsAccessControl",
                      },
                      'param':{
                          href : this.options.href,
                          lcode: '',
                          _line: 'delete'
                      }
                    }
            ];
            mxhRequest(out,[]);
          }
        },

      allowChange:function () {
          let lcode = String(Math.random());
          call = [(input)=>{
            input.forEach((el)=>{
              this.options.status = el.status;
              if (el.status == 'DONE') {
                this.lockForm(false);
                this.options.lcode = lcode;
                var formEl = this.element.find('#form');
                if (formEl.hasClass('deleted')) {
                  formEl.removeClass('deleted');
                  formEl.changeDetect('null'); //для  принудительного сохранение
                }
              }else{
                let login = el.report[0].login
                let tlock = el.report[0].tlock
                this.lockForm(true);
                this.element.find('#sysmessage').text(el.status).
                removeClass('sysmess-done').addClass('sysmess-err');
                var mess = $('<div><p>This form is already open for editing. '+
                'Try to open later. '+
                'Information: '+ login+' '+tlock+
                '</p></div>');
                mess.windialog().addClass('winmess-war');
                var offset = this.element.offset();
                mess.closest('.ui-dialog').offset({top:offset.top+40,left:offset.left+40});
              }
            });
          }];

        var out =  [
                  {
                    'target':{
                        'module':'serverman',
                        'class': "FormsAccessControl",
                    },
                    'param':{
                          'href' : this.options.href,
                          'lcode': lcode,
                          '_line': 'set'
                    }
                  }
                ];
          mxhRequest(out,call);
      },

      getData:function() {
        var forms = {};
        var thisForm = $(this.element);
        var id_lists = thisForm.find('.form').attrs('id');
        // console.log('thisForm',thisForm);
        var mainMode = thisForm.find('#form').is('[hidden]') ? 'delete' : 'write';
        id_lists.push('main');
        id_lists.forEach(function(list_id) {
            // console.log('list_id',list_id);
            var rows = thisForm.find('.turn').filter('.'+list_id);
            var content_list = [];
            rows.each(function(i,row) {
              var rowEl = $(row);
              stack = rowEl.find('[name].'+list_id);
              form_content = {};
              stack.each(function(y,el) {
                var val =  getValElement($(el));
                form_content[$(el).attr('name')] = val;
              });
              form_content['_line'] = 'write';
              if (rowEl.is('[hidden]')==true){
                  // console.log('list_id',list_id,'mainMode',mainMode);
                  form_content['_line'] = (mainMode == 'delete') ? 'write' : 'delete';
                  form_content['is_deleted'] = 1;
              }else{
                  form_content['is_deleted'] = 0;
              }

              content_list.push(form_content);
            });
            forms[list_id] = content_list;
          });
          return forms;
      },

      save:function () {
        /*
        Each element that you want to save must have a class name that
        matches the form id
        */
        this.options.beforeSaving();
        var thisForm = $(this.element);
        thisForm.find('.formsection').each(function (i,el) {$(el).changeDetect();});
        if (thisForm.find('.turn').length) {
          var forms = this.getData();
            forms['mode'] = 'write'; //запись
            if (this.options.lcode){
              forms['_lcode'] = this.options.lcode; // для проверки блокировки
            }
            this.options.contentMainForm= forms['main'][0];
            call = [function(input) {
              for (var i = 0; i < input.length; i++) {
                if (input[i].target=='data-savrecord') {
                  thisForm.form('procResponse',input[i]);
                }
              }
            }]
            call.push(this.options.whenSevedForm);
            this.sent(forms,call);
        }
      },

      procResponse:function(data) {
        /*
        processing a response after submitting a form
        */
        try {
          var d_con = data['content'];
          var number_sav_record;
          var bill = {};
          for (var i = 0; i < d_con.length; i++) {
            if (i==0) number_sav_record = d_con[i].id;
            bill[d_con[i].status] =  bill[d_con[i].status] + 1 || 0+1 ;
          }
          if (bill.DONE) this.options.status = 'DONE';
          if (bill.RECORDLOCK) this.options.status = 'RECORDLOCK';
          if (bill.ERROR) this.options.status = 'ERROR';
          this.options.id = number_sav_record ? number_sav_record : this.options.id;
        } catch (err) {
          this.options.status = err;
        }
        var sysmess = this.element.find('#sysmessage');
        sysmess.text(this.options.status);
        if (this.options.status=='DONE') {
          sysmess.removeClass('sysmess-err')
                  .addClass('sysmess-done');
          var masterFl = this.element.find('.master');
          if (masterFl[0].tagName=='input') {
            masterFl.val(this.options.id);
          }else{
            masterFl.text(this.options.id);
          }
          this.getHash(true);

          var saveboxEl =   this.element.find('#formsavebox');
          // console.log('saveboxEl',saveboxEl.find('*'));
          if (saveboxEl.find('*').length) {
            saveboxEl.preset('destroy');
            saveboxEl.empty();
            saveboxEl.attr('style','display: none;');
          }

          sysTrigger.run(this.options.path.split('/').join('')+'.saved');
        }else{
          sysmess.removeClass('sysmess-done')
                  .addClass('sysmess-err');
        }
      },

      getHash:function(record=false) {
        var elList = this.element.find('*');
        var str = '';
          for (var i = 0; i < elList.length; i++) {
            str = str + getValElement(elList.eq(i));
          }
          var hash = str.hashCode();
          if (record) {this.options.lastHash = hash};
        return hash;
      },

      _setOption: function( key, value ) {

        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      result:function() {
        this.removeLocks();
        var thisEl  = this.element;
        var relEl = this.options.relationshipElement;
        if (this.options.status == 'DONE') {
          for (var key in this.options.contentMainForm) {
            var el = relEl.find('[name="'+key+'"]');
            if (el.length) {
              el.text(this.options.contentMainForm[key])
              var isData = el.attr('data-'+key);
              if (isData!='undefined') {
                el.attr('data-'+key,this.options.contentMainForm[key]);
              }
            }
          }
          relEl.removeClass('deleted');
        }

        var mainEl = thisEl.find('.formsection.main');
        if (this.options._lastButtonPressed == 'delete') {
          relEl.addClass('deleted');
        }

        this.options.whenCloseForm(thisEl);
        this.element.remove();
        this.destroy();
      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
    });
  }( jQuery ) );

  // ==================  checkbox   =========

  (function( $ ) {
    $.widget( "elementsControl.checkbox", {
      options: {
        clear: null,
        checked: false,
        type:"input",
        useAttrValue: false,
        useSwitch: false,
        switchScope: '*',// область действия механизма переключения.
        click: function() {},
      },

      _create: function() {
        switch (this.options.type) {
          case 'input':
            this.element.empty();
            var childEl = $('<input>').attr({type: 'checkbox',});
            this.element.prepend(childEl);
            this.element.contents() // удаление пробелов после тега
                .filter(function() { return this.nodeType === 3; }).remove();
            childEl.click(this.options.click);

            if (this.options.useSwitch) {
              var thisEl = $(this.element);
              childEl.click(function() {// установка обработки для переключения
                thisEl.checkbox('switch');
              })
            }

            childEl.prop('checked',this.options.checked);

            break;
          default:
        }
        this.element.addClass('cbox-'+this.options.type);
        if (this.options.useAttrValue) {
            if (this.element.attr('value')) {
              if (Number(this.element.attr('value'))) {
                this._setOption('checked',true);
              }else {
                this._setOption('checked',false);
              }
            }
            var thisEl = this.element;
            this.element.children('*').click(function() {
              if (thisEl.checkbox('check')) {
                thisEl.attr('value',1);
              }else{
                thisEl.attr('value',0);
              }
            })
        }
      },

      switch:function() {
        if (this.options.useSwitch) {
          var curEl = $(this.element);
          var scopeEl = curEl.closest(this.options.switchScope);
          var name = this.element.attr('name');
          var defList = scopeEl.find('[name='+name+'].cbox-'+this.options.type);
          defList.attr('value',0);
          curEl.attr('value',1);
          for (var i = 0; i < defList.length; i++) {
            var val  = defList.eq(i).attr('value');
            if (Number(val)) {
              defList.eq(i).checkbox('option','checked',true);
            }else{
              defList.eq(i).checkbox('option','checked',false);
            }
            // проверка изменений
            var parEl = defList.eq(i).closest('[data-hash]');
            parEl.changeDetect();
          }
        }
      },

      setValue:function() {
        if (this.check()) {
          this.element.attr('value',1);
        }else{
          this.element.attr('value',0);
        }
      },

      _setOption: function( key, value ) {
        switch( key ) {
          case "clear":
            break;
          case 'checked':
              switch (this.options.type) {
                case 'input':
                    this.element.find('input').prop('checked',value);
                  break;
                default:

              }
            break;
          case 'click':
            this.element.click(value);
            break;
        }
        this.setValue();
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      check: function() {
        switch (this.options.type) {
          case 'input':
              return this.element.find('input').prop('checked');
            break;
          default:
        }
      },

      toggle: function () {
        switch (this.options.type) {
          case 'input':
              c_el = this.element.find('input');
              if (c_el.prop('checked')) {
                c_el.prop('checked',false);
              }else{
                c_el.prop('checked',true);
              }
            break;
          default:
        };
        this.setValue();
      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
    });
  }( jQuery ) );



  (function( $ ) {
      $.widget( "elementsControl.checkrow",$.elementsControl.checkbox, {
        options: {
          whenSelectingRow:function(element) {}
        },

        _create: function() {
          var div = $('<div>').attr({
            'class':'subfield', // subfield - вспомогательное поле
            'name': 'selectrow'
          });
          this.element.prepend(div);
          this.element.contents() // удаление пробелов после тега
              .filter(function() { return this.nodeType === 3; }).remove();
          this.element.child = div;
          var el = this.element;
          div.checkbox({
            'click': function() {
              el.checkrow('stateCheck');
              el.checkrow('option','whenSelectingRow')(el);
            },
          });
          if (this.options.checked) {
            div.checkbox("option",'checked',true);
          }else{
            div.checkbox("option",'checked',false);
          }
          this.stateCheck();
        },

        child:null,

        _setOption: function( key, value ) {
          this.element.child.checkbox("option",key,value);
          this.stateCheck();
          $.Widget.prototype._setOption.apply( this, arguments );
          this._super( "_setOption", key, value );
        },

        stateCheck: function () {
          if (this.element.child.checkbox('check')){
            this.element.addClass('ec-row-selected');
          }else{
            this.element.removeClass('ec-row-selected');
          }
        },

        check: function() {
            return this.element.child.checkbox('check');
        },

        toggle: function () {
          div = this.element.child;
          div.checkbox('toggle');
          this.stateCheck();
        },

        destroy: function() {
          this.element.removeClass('ec-row-selected');
          this.element.child.remove();
          $.Widget.prototype.destroy.call( this );
        }
      });
    }( jQuery ) );





  (function( $ ) {
        $.widget( "elementsControl.wintabs",$.ui.tabs,{
          options: {
          },

          _create: function() {
            $.ui.tabs.prototype._create.call(this);

            var thisEL =  this.element;
            this.options.activate = ()=>{

              thisEL.closest('.ui-dialog').css({width:'auto',height:'auto'}); // TemporarySolution >
              thisEL.closest('.windialog').css({width:'auto',height:'auto'}); // < TS
              thisEL.closest('.windialog').windialog('recountPosition');
            }




            this.element.children('.ui-tabs-panel').changeDiv((target,mutations)=> {
              var actTab = this.element.children('[aria-hidden="false"]');
              if ((actTab[0]==target)) { //защита от повторного вызова
                var run = false;
                mutations.forEach((mt)=>{
                  if (mt.type=='childList') {
                    run = true;
                  }else if (mt.type=='attributes') {
                    if (mt.attributeName=='aria-hidden') {
                      run = true;
                    }
                  }
                })
                if (run) {
                  this.tabsResize();
                }
              }
            })
            this.element.resizeDiv(()=>{ this.tabsResize(); });
          },

          tabsResize:function () {

            var doNotReduce = !(this.element.hasClass('allow-reduction'));


            var actTb = this.element.children('[aria-hidden="false"]');
            actTb.css({
              width:'auto',
              height:'auto'
            });
            var tabsEl = this.element;
            var data = tabsEl.data();

            if (!(data.width > actTb.width())) {
              data.width = actTb.width();
            }else{
              if (data.width&&doNotReduce) {
                actTb.width(data.width);

              }
            }
            if (!(data.height > actTb.height())) {
              data.height = actTb.height();
            }else{
              if (data.height&&doNotReduce) {
                actTb.height(data.height);
              }
            }
            tabsEl.data(data);

            if (!doNotReduce) {
              this.element.children('.ui-tabs-panel').not('[aria-hidden="false"]').css({
                width:'auto',
                height:'auto'
              });
              tabsEl.data({
                width:0,
                height:0
              });
            }


          },

          _setOption: function( key, value ) {
            // $.Widget.prototype._setOption.apply(this, arguments);
            $.ui.tabs.prototype._setOption.apply( this, arguments );
            this._super( "_setOption", key, value );
          },

          destroy: function() {
            $.Widget.prototype.destroy.call( this );
          }
        });
}( jQuery ) );



(function( $ ) {
    $.widget( "elementsControl.uniqcontrol",{
      options: {
        id:null,
        table:null,
        field:null,
        path:null
      },

      _create: function() {
        if (this.element[0].tagName!='INPUT') {
          this.destroy();
          return;
        }
        var formEl = this.element.closest('#form.main').parent();
        if (!this.options.field) { this.options.field = this.element.attr('name')};
        if (!this.options.id) { this.options.id = Number(formEl.form('option','id'))};
        if (!this.options.table) {
          var table = formEl.form('option','path').split('/')[1].replace('_form','');
          this.options.table = table;
        }
        if (!this.options.path) {
          var path = formEl.form('option','path');
          if (!path) {
            path = '/'+this.options.table+'_form/'
          }
          this.options.path = path;
        }
        this.element.change(()=>{
          var value = getValElement(this.element);
          if (value) {
              var call = [(input)=>{
                input.forEach((el,i)=>{
                  if (el.targer=='uniqcontrol') {
                    if (el.status=='DONE') {
                      if (el.result) {
                        this.element.addClass('errorvalue');
                        alert(this.options.field+' '+getValElement(this.element)+' '+serviceData.wordTranslate('already_exists')[0]);
                      }else{
                        this.element.removeClass('errorvalue');
                      }
                    }else{
                    }
                  }
                });
              }];
              var out = [
                      {
                        'target':{
                            'module':'content',
                            'class': "Form",
                        },
                        'param': {
                            path:this.options.path,
                            mode:'uniqcontrol',
                            id: this.options.id,
                            table:this.options.table,
                            field:this.options.field,
                            value: value
                        }
                      }
              ];
              mxhRequest(out,call);
            }
        });
      },

      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
  });
}( jQuery ) );



(function( $ ) {
    $.widget( "elementsControl.preset",{
      options: {
        // mainFildName: 'reportname',
        className: '',
        width: 230,
        // presetTableName:'reportpresets',
        currentPreset: 0, //если ноль, то ставится последний пресет, если 1 - то первый
        data:'',
        name:'',
        whenChanges: function() {},
        beforeSaving: function(data){},//data - словарь с переменными, которые нужно заролнить и предать
        afterSaving:function (id) {}
      },
      _create: function() {
        this.element.append(
          '<select id ="presets"  value = "">'+
            '<option value = "NEW"> -- '+serviceData.wordTranslate('new')[0]+' -- </option>'+
          '</select>'+
          '<input id = "namepreset" hidden/>'+
          '<button id = "btn_deletepreset"><svg><use xlink:href="/file/ico/sprite.svg#close"></use></svg></button>'+
          '<button id = "btn_savepreset"><svg><use xlink:href="/file/ico/sprite.svg#floppy-disk"></use></svg></button>'
        );
        this.element.addClass('presetsbox');
        var style = this.element.attr('style') ? this.element.attr('style') :'';
        this.element.attr('style',style+' --width-savebox: '+this.options.width+';');
        this.setSavePreset();
      },

      loadPresets:function() {
        var selectEl = this.element.find('#presets');
        var  presets = serviceData.presets[this.options.className];
        selectEl.find('option:not([value=NEW])').remove();
        var valList = [];
        for (var pres in presets) {
          var name = serviceData.wordTranslate(presets[pres].name)[0];
          var opt = $('<option value ="'+pres+'">'+name+'</option>');
          selectEl.append(opt);
          valList.push(Number(pres));
        }
        this.options.currentPreset = selectActualNumber(valList,this.options.currentPreset);
        selectEl.val(this.options.currentPreset).trigger("chosen:updated");
        this.changePresets();
      },

      changePresets:function() {
        var selectEl = this.element.find('#presets');
        var val = selectEl.val();
        if (val=="NEW") {
          this.loadInput();
        }else if (val){
          selectEl.val(Number(val)).trigger("chosen:updated");
          this.options.data = serviceData.presets[this.options.className][val].data;
          var name = serviceData.presets[this.options.className][val].name;
          this.options.name = serviceData.wordTranslate(name)[0];
          // console.log('changePresets ---- ');
          this.options.whenChanges(serviceData.presets[this.options.className][val]);
        }
      },

      loadInput:function() {
        var selectEl = this.element.find('#presets');
        var namePresEl = this.element.find('#namepreset');
        var thisEl = this.element;
        function hiddenEl(ev) {
          thisEl.find('#namepreset').prop('hidden','hidden');
          selectEl.removeAttr('hidden');
          selectEl.val("").trigger("chosen:updated");
        }
        namePresEl.removeAttr('hidden')
                  .focus()
                  .val('preset '+String(selectEl.find('option').length))
                  .select();
        selectEl.prop('hidden','hidden');
        namePresEl.blur(function (ev) {
          hiddenEl(ev);
        });
      },

      setSavePreset:function () {
        var selectEl = this.element.find('#presets');
        var namePresEl = this.element.find('#namepreset');
        var thisEl = this.element;
        this.loadPresets();
        if (selectEl.find('option').length==1) {
          if (selectEl.val()=='NEW') {
              selectEl.val("").trigger("chosen:updated");
          }
        }
        selectEl.change((el)=>{
          this.changePresets();
        });
        this.element.find('#btn_savepreset').click(()=>{
          var newName = getValElement(namePresEl);
          var currVal = selectEl.val();
          if (newName) {
            this.savePreset(newName).then((newId)=>{});
            namePresEl.val('');
          }else{
            if (currVal) {
              var name = selectEl.find('option[value="'+selectEl.val()+'"]').text();
              this.savePreset(name,Number(selectEl.val()));
            }
          }
        });

        this.element.find('#btn_deletepreset').click(()=>{
          var currValue = selectEl.val();
          if (confirm(serviceData.wordTranslate('delete_current_preset')[0])) {
            this.savePreset('',currValue, 'delete').then((newId)=>{});
          }
        });
      },

      savePreset: function(newName,id=0,line='write') {
        var thisEl = this.element;
        if (id) {
          var userName = serviceData.presets[this.options.className][id].login;
          if (userName == 'ALL') {
            alert(serviceData.wordTranslate('preset_read_only')[0]);
            return new Promise(()=>{});
          }

        }


        var prom = new Promise((resolve)=>{
              this.options.beforeSaving();
              var data = {
                _line: line,
                prid: id,
                gname:'ALL',
                login: serviceData.currentUser.login,
                name: newName,
                class: this.options.className,
                data:this.options.data,
              };
            function getId(input) {
              var saveId = null;
              try {
                for (var i = 0; i < input.length; i++) {
                  if (input[i].target=="data-savrecord") {
                    for (var a = 0; a < input[i].content.length; a++) {
                      if (input[i].content[a].status == "DONE") {
                        saveId = input[i].content[a].id;
                        return saveId;
                      }
                    }
                  }
                }
              } catch (e) {}
            }
            var call = [function(input) {
              var inId = id ? id : getId(input);
              serviceData.remove();
              serviceData.load().then(()=>{
                thisEl.preset('loadPresets');
                var selectEl = thisEl.find('#presets');
                inId = inId > 0 ? inId : thisEl.preset('option','currentPreset');
                if (!inId) {
                    var optList = selectEl.find('option:not([value="NEW"])');
                    if (optList.length) {
                      inId = optList.eq(1).attr('value');
                      selectEl.val(inId).trigger("chosen:updated");
                    }else{
                      selectEl.val('').trigger("chosen:updated");
                    }
                  }else{
                    selectEl.val(inId).trigger("chosen:updated");
                  }
                thisEl.preset('changePresets');
                resolve(inId);
                thisEl.preset('option','afterSaving')(inId);
              });
            }];
            var out = [
                    {
                      'target':{
                          'module':'content',
                          'class': "Form",
                      },
                      'param':{
                        path: "/presets_form/",
                        main: [data],
                        mode: "write"
                      }
                    }
            ];
            mxhRequest(out,call);
          });
        return prom;

      },

      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
  });
}( jQuery ) );



(function( $ ) {
    $.widget( "elementsControl.desktop",{
      options: {
        _elControl: null,
        _preparedForRemoval: null
      },

      _create: function() {
        $('#lnk_decktop_set').click((ev)=>{
          this.openSet(ev);
          this.startPanels();
        });
      },

      loadObjList:function () {
        var idParam = {
          tables: {type: 'table', form: 'list'},
          forms: {type: 'table', form: 'form'},
          reports: {type: 'report'},
        };
        var elControl = this.options._elControl;
        var thisEl = this.element;
        $.each(idParam, function(id, param) {
            var currTab = elControl.find('#'+id);
            var classList = access.thatAvailable(param);
            var classlistEl = $('<ul class = "classlist">');
            currTab.append(classlistEl);
            currTab.append('<div class = "widgwtbox">');
            currTab.append('<div class = "delimiter">');
            for (var i = 0; i < classList.length; i++) {
              var liEl = $('<li>');

              liEl.attr('name',classList[i]).text( serviceData.wordTranslate( classList[i] )[0] );
              classlistEl.append(liEl);
            }
            liList = classlistEl.find('li');
            liList.click((ev)=>{
              var evEl = $(ev.target);
              evEl.siblings('*').removeClass('classlist-active');
              evEl.addClass('classlist-active');
              var className = evEl.attr('name');
              thisEl.desktop('loadWidgetList',className,param,id);
            });
        });
      },

      loadWidgetList:function(className,param,id) {
        var currWidgwtbox = this.options._elControl.find('#'+id+' .widgwtbox');
        currWidgwtbox.empty();
        var presetList = {};
        if (id == 'reports') {
          presetList = serviceData.presets[className];
        }else if ((id == 'forms')||(id == 'tables')){
          presetList = serviceData.presets[className+'_'+param.form];
        }
        var sortableEl = $('<ul class = "dt-sortable lock-events">');
        currWidgwtbox.append(sortableEl);

        function setData(presetNum) {
          var data = {
            tables:{
              'data-typedialog' : 'formJournal',
              'data-href':'/'+className+'_list/?id=0',
              'data-preset' : presetNum,
              'data-masterfield': (id=='tables')? serviceData.conformDataBase.tables[className].primarykey : '',
              'data-path' :'/'+className+'_list/',
            },
            forms:{
              'data-typedialog':"form",
              'data-preset': presetNum,
              'data-href': '/'+className+'_form/?new=0',
            },
            reports:{
              'data-class' : className,
              'data-preset' : presetNum
            }
          }
          return data[id];
        }

        for (var preset in presetList) {
          var liEl = '';
          if (id == 'reports') {
            liEl = $('<li class = "dt-report" ><div  class = "reportbox"></div></li >');
          }else{
            liEl = $('<li class = "dt-button"><button class="link ripple dialog lang" ></button></li >');
          }
          var element = liEl.children('*');
          element.attr(setData(preset)).text(presetList[preset].name);
          sortableEl.append(liEl);
        }

        sortableEl.sortable({
          start:function (ev,ui) {
            coord = ui.helper.offset();
            $('body').append(ui.helper);
            ui.helper.addClass('lock-events transferal');
            sortableEl.sortable("refreshPositions");
            ui.helper.offset(coord);
          },
          stop:function (ev,ui) {
            ui.item.ini();
          },
          scroll:false,
          connectWith: '.dt-sortable'
        }).disableSelection();
      },

      openSet:function (ev) {
        if (! this.options._elControl) {
          var elControl = $(
            '<div class ="formtabs">'+
              '<ul>'+
                '<li><a href="#tables" class = "lang">tables</a></li>'+
                '<li><a href="#forms" class = "lang">forms</a></li>'+
                '<li><a href="#reports" class = "lang">reports</a></li>'+
              '</ul>'+
              '<div id="tables"></div>'+
              '<div id="forms"></div>'+
              '<div id="reports"></div>'+
              '<div class="button_panel">'+
                '<button id = "btn_save" class = "lang">save</button>'+
                '<button id = "btn_add" class = "lang">add_panel</button>'+
              '</div>'+
            '</div>'
          );
          this.options._elControl = elControl;
          this.element.append(elControl);
          elControl.windialog({
            currentEvent: ev,
            typedialog: 'settings',
          });
          var thisEl = this.element;
          elControl.dialog('option','close',function () {
            thisEl.desktop('closeControl');
          });
          elControl.wintabs();
          elControl.find('#btn_save').click(()=>{
            this.save();
          })
          var thisEl = this.element;
          var btnAdd = elControl.find('#btn_add');
          btnAdd.click(()=>{
            this.addPanel();
          });
          this.loadObjList();
        }else{
          this.options._elControl.dialog('open');
        }
      },

      closeControl:function () {
        this.stopPanels();
        this.options._elControl.dialog('destroy');
        this.options._elControl.windialog('destroy');
        this.options._elControl.remove();
        this.options._elControl = null;
      },

      save:function() {
        thisCloneEl = this.element.clone();
        thisCloneEl.find('.reportbox').empty();
        thisCloneEl.find('.lock-events, .transferal')
                  .removeClass('lock-events')
                  .removeClass('transferal');
        thisCloneEl.find('#dt-recycler').addClass('dt-hidden');
        thisCloneEl.find('.btn_delete').remove();
        thisCloneEl.find('*').removeAttr('data-reinilock').removeAttr('style');
        elControl = this.options._elControl;
        thisElement = this.element;
        var call = [(input)=>{
          for (var i = 0; i < input.length; i++) {
            if (input[i].content.status=='DONE') {
              thisElement.desktop('closeControl');
            }
          }
        }];
        var out =  [
            {
              'target':{
                  'module':'content',
                  'class': "Profile",
              },
              'param':{
                _line: 'saveDesktop',
                data: thisCloneEl[0].outerHTML
              }
            }
          ];
        mxhRequest(out,call);
      },

      addPanel:function () {
        var name = prompt('panel name', 'panel');
        var panelEl = $(
          '<li class = "dt-panel">'+
            '<div class = "dt-name-panel lang">'+name+'</div>'+
            '<div class = "delimiter"></div>'+
            '<ul class = "dt-sortable"></ul>'+
          '</li>');
        this.stopPanels();
        this.element.find('#dt-root').append(panelEl);
        this.startPanels();
      },

      startPanels:function() {
        this.element.find('#dt-root').sortable().disableSelection();
        var sortEl = this.element.find('.dt-sortable');
        this.element.find('#dt-recycler').removeClass('dt-hidden');
        recyclerSvg = this.element.find('#dt-recycler svg');
        sortEl.sortable({
          connectWith: '.dt-sortable',
          update:(ev, ui)=>{
            var delEL = $(ev.target);
            if (delEL.hasClass('dt-recycler')) {
              if(delEL.length){
                  var delList = delEL.find('li');
                  delList.fadeOut('slow',()=>{
                    delList.remove();
                    recyclerSvg.removeAttr('style');
                  });
              }
            }
          },
          out: (ev, ui)=> {
            this.options._preparedForRemoval = ui.helper;
            }
          }
        ).disableSelection();

        this.element.find('.dt-recycler').sortable('option','over',(ev, ui)=>{
          recyclerSvg.attr({
            style:'fill: red;'
          })
        })
        var btnDel = $('<button class = "btn_delete"><svg><use xlink:href="/file/ico/sprite.svg#close"></use></svg></button>');
        btnDel.click((ev)=>{
          if (confirm('Delete current panel?')) {
            var currentTarget = $(ev.target);
            currentTarget.closest('.dt-panel').remove();
          }
        });
        this.element.find('.dt-name-panel')
                      .after(btnDel)
                      .addClass('dt-row-resize');
        sortEl.addClass('lock-events');
      },

      stopPanels:function () {
        this.element.find('#dt-root').sortable('destroy');
        var sortEl = this.element.find('.dt-sortable');
        sortEl.removeClass('lock-events');
        sortEl.sortable('destroy');
        this.element.find('#dt-recycler').addClass('dt-hidden');
        this.element.find('.btn_delete').remove();
        this.element.find('.lock-events, .transferal')
                  .removeClass('lock-events')
                  .removeClass('transferal');
        this.element.find('.dt-name-panel').removeClass('dt-row-resize');
      },

      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
  });
}( jQuery ) );


(function( $ ) {
    $.widget( "elementsControl.wincombobox",{
      options: {
        value:'',
        list:[
            {name:'name',
            value:'value'}
        ],
        change:function(value) {}
      },

      _create: function() {
        var selEl = $('<select>');
        this.element.append(selEl);
        this.load();
        selEl.change(()=>{
          this.options.value = selEl.val();
          this.options.change(selEl.val());
        });
      },

      load:function () {
        var selEl = this.element.find('select');
        this.options.list.forEach((el,i)=>{

          var currEl = (typeof(el)=='object') ? el : {name:el,value:el};

          var optEl = $('<option value = "'+currEl.value+'" >'+currEl.name+'</option>');
          selEl.append(optEl);
        });
        selEl.val(this.options.value).trigger("chosen:updated");
      },

      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
  });
}( jQuery ) );



(function( $ ) {
    $.widget( "elementControl.autocomplete",{
      options: {
        resultLimiter:10,
        minWordLen:2, // минимальный размер слова для поиска
        minWordRetention : 4 , // minimum word retention : минимальный размер сохраняемго слова
        suggestSelected:0,
        words:'',
        useStorage:true,
        suggestCount:0,
        boxElement:null,
        _inputInitialValue:'',
        valueWordList:[],
        _clickHtml:null

      },
      _create: function() {
        // this.element.attr('autocomplete','off');
        this.options.boxElement = $('<div class = "search_advice_wrapper">');
        // this.element.after(this.options.boxElement);
        $('body').append(this.options.boxElement);
        // this.options.boxElement.offset(this.element.offset());

        var thisEl = this.element;
        this.element.keyup((key)=>{
        		switch(key.keyCode) {
        			case 13:  // enter
        			case 27:  // escape
        			case 38:  // стрелка вверх
        			case 40:  // стрелка вниз
        			break;
        			default:
                if (thisEl[0].selectionStart == thisEl.val().length) {
                  thisEl.autocomplete('showResults');
                }else{
                  thisEl.autocomplete('hide');
                }

        			break;
        		}
        });

        this.element.keydown((key)=>{
            // console.log(key.keyCode);

        		switch(key.keyCode) {

        			// по нажатию клавишь прячем подсказку
        			case 13: // enter
        			case 27: // escape
        			  thisEl.autocomplete('hide');
        				// return false;
        			break;
        			// делаем переход по подсказке стрелочками клавиатуры
        			case 38: // стрелка вверх
        			case 40: // стрелка вниз
        				key.preventDefault();

        				if(thisEl.autocomplete('option','suggestCount')){
        					//делаем выделение пунктов в слое, переход по стрелочкам
                  thisEl.autocomplete('keyActivate',key.keyCode-39);
        				}
        			break;
              case 46: // delete
                var boxEl = thisEl.autocomplete('option','boxElement');
                var currentEl = boxEl.find('.active').eq(0);
                var text = currentEl.find('.text').text();
                currentEl.remove();
                thisEl.autocomplete('delete',text);
        		}
        });

        this.options._clickHtml = ()=>{
            thisEl.autocomplete('hide');
          };
        $('html').click(this.options._clickHtml);
          // если кликаем на поле input и есть пункты подсказки, то показываем скрытый слой

        thisEl.click((event)=>{

            if(thisEl.autocomplete('option','suggestCount')){
              thisEl.autocomplete('option','boxElement').show();
            };
            thisEl.autocomplete('recountPosition');
            event.stopPropagation();
          });

        this.element.change(()=>{
          var valueWordList = thisEl.autocomplete('option','valueWordList');
          var words = thisEl.autocomplete('option','words');
          valueWordList.forEach((el,i)=>{
            var word = el.trim();
            if (word.length >= thisEl.autocomplete('option','minWordRetention')) {
              var re = new RegExp('(\\s|^)'+word+'(\\s|$)');
              if (words.search(re)==-1) {
                words = words+' '+word;
              }
            }
          });
          thisEl.autocomplete('option','words',words);
          thisEl.autocomplete('save');
        });

        this.element.focusout((ev)=>{
          function isBox() {
            var classList= ['search_advice_wrapper','text','advice_variant','gap']
            var currEL = $(ev.originalEvent.explicitOriginalTarget.parentNode);
            var result = false
            classList.forEach((el)=>{
              if (currEL.hasClass(el)) {
                result =  true;
              }
            });
            return result;
          }
          if (!isBox()) { thisEl.autocomplete('hide'); }

        });

        if (!this.options.words) {
          var name = this._getName();
          if (name) {
            var words = localStorage.getItem(name);
            if (words) {
              this.options.words = words;
            }
          }
        }else{
          this.options.useStorage = false;
        }
      },
      recountPosition:function() {
        var extra = 6;
        var pos = this.element[0].getBoundingClientRect();
        // console.log('this',pos.top,pos.left);
        this.options.boxElement.offset({
          top:pos.top+this.element.height()+extra,
          left:pos.left
        });
        var test = this.options.boxElement.offset();
        // console.log('box',test.top,test.left);
      },
      keyActivate:function(n) {
        var thisEl = this.element;
        var  suggestSelected = this.options.suggestSelected
        var adviceVariantList =  this.options.boxElement.find('.advice_variant');
        adviceVariantList.eq(suggestSelected-1).removeClass('active');

      	if(n == 1 && suggestSelected < this.options.suggestCount){
      		suggestSelected++;
      	}else if(n == -1 && suggestSelected > 0){
      		suggestSelected--;
      	}

      	if( suggestSelected > 0){
      		adviceVariantList.eq(suggestSelected-1).addClass('active');
          var newValue = adviceVariantList.eq(suggestSelected-1).find('p.text').text();
          var valueWordList = this.options.valueWordList;
          valueWordList[valueWordList.length-1] = newValue;
      		thisEl.val( valueWordList.join(' '));
      	} else {
      		thisEl.val( this.options._inputInitialValue );
      	}
        this.options.suggestSelected = suggestSelected;
      },



      showResults:function() {

        var thisEl = this.element;
        var boxEl = this.options.boxElement;
        if(thisEl.val().length){
          this.options._inputInitialValue = thisEl.val();
          var valueWordList = this.options._inputInitialValue.split(/\s+/);
          var word = valueWordList[valueWordList.length-1].trim();
          this.options.valueWordList = valueWordList;
          var list = word ? this._getWords(word) : [];
          this.options.suggestCount = list.length;
          if(this.options.suggestCount > 0){

            boxEl.html("").css('width',String(this.element.width()+5)+'px').show();
            this.recountPosition();
            for(var i in list){
              if(list[i] != ''){
                var adviceVarEl = $('<div class="advice_variant"></div>');
                var gapEl = $('<p class="gap"></p>');
                var textEl = $('<p class="text"></p>');
                // var butdel = $('<button class = "btn_delete"  hidden = hidden><svg><use xlink:href="/file/ico/sprite.svg#close"></use></svg></button>');

                textEl.text(list[i]);
                var gapText = valueWordList.slice(0, -1).join(' ');
                gapEl.text(gapText); //.css('max-width',String(widthInputEl-30)+'px');
                boxEl.append(adviceVarEl);
                adviceVarEl.append(gapEl,textEl);

                adviceVarEl.click(function(){
                    var newValue = $(this).find('.text').text();
                    var valueWordList = thisEl.autocomplete('option','valueWordList');
                    valueWordList[valueWordList.length-1] = newValue;
                    thisEl.val( valueWordList.join(' '));
                    thisEl.autocomplete('hide');
                  });
              }
            }
          }else{ this.hide();}
        }else{ this.hide();}
      },

      hide:function() {
        this.options.boxElement.hide();
        this.options.suggestSelected = 0;
      },
      delete:function(word) {
        // console.log('word',word);
        delete this.options.valueWordList[this.options.valueWordList.length-1];
        this.element.val( this.options.valueWordList.join(' '));
        var re = new RegExp('(\\s|^)'+word.trim()+'(\\s|$)');
        // console.log('re',re);
        this.options.words = this.options.words.replace(re,' ');
        this.save();
      },
      save:function() {
        if (this.options.useStorage) {
          localStorage.setItem(this._getName(), this.options.words);
        }
      },
      _getWords:function(word) {
          var reg, list;
          if(word.length>=this.options.minWordLen)
          reg = new RegExp("([A-Za-zА-Яа-я0-9]+|\\s|^)"+word+"([A-Za-zА-Яа-я0-9]+|\\s|)","gi");
          list =  this.options.words.match(reg);
          return list ? list.slice(0, this.options.resultLimiter) : [];
      },

      _getName:function() {
        var name = this.element.attr('name');
        var pathList = location.pathname.split('/');
        var pathName = '';
        if (pathList.length>1) {
            pathName = pathList[1];
        }
        return name ? pathName+'.'+name :'';
      },


      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      destroy: function() {
        $('html').unbind('click',this.options._clickHtml);
        this.save();
        $.Widget.prototype.destroy.call( this );
      }
  });
}( jQuery ) );


function selectActualNumber(list,number) {
    /*list - массив чисел
      number - число
      если числа нет в массиве функция выбирает первое или последнее значение
      или пустую строку
    */
    var currVal = '';
    if (number!=='') {
      var currVal = Number(number);
      if (list.length) {
        list.sort();
        if (currVal === 0) {
          currVal = list[list.length-1];
        }else if (currVal == 1 ){
          currVal = list[0];
        }
      }
    }
    if (list.indexOf(currVal)==-1) {
      currVal = '';
    }
    return currVal;
}

function setLinkForWindialog(element) {
  var href = element.attr('data-href');
  var val = element.text();
  if (href) {
    element.attr('data-href',href+val);
  }
}
