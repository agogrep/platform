/*jshint esversion: 6 */


function getIdFormName(journal) {
  // возвращает условный id для хранения настроек журнала и других форм
    d_jour = getDataAttributes(journal);
    path = d_jour['path'] ? d_jour['path'] : '';
    id = journal.attr('id');
    path = path.split('/').join('');
    return path+'_'+id;
}


(function( $ ) {
  $.widget( "elementsDisplay.journal", {
    options: {
      sizeColumns:{}, // хранит размеры колонок
      clear: null,
      // fieldWords:fieldWords,// словарь названий полей

      fastSearch:true,
      useCorrectColumns:true,
      useColumnSizeMemory:true,
      useControlPanel:false,
      useCheckRow: false,
      settingsWindow:null,
      countrows: null,
      preset:"",
      table:'',
      links:'', // sql where для связанных таблиц
      order:'', // sql WHERE сортировка по полям
      search:'', // sql WHERE поиск по полям
      sel_fields: '',// str - перечень полей через ','
      CPAttr:{ // атрибуты панели управления
        filters:'', // название скрипта для построения фильтра
        masterfield:'',// главное поле
        path:'', // путь к шаблону журнала}
        },
      _elControl: null,
      // stackCallFastSh:[],//используется для режима fast searsh
      whenSelectingRow:function (element) {},
      call:function(){},
      },

    testSize:function() {
      var el = this.element;
      var body = $('body');
      console.log('body offset TLWH',body[0].offsetTop,body[0].offsetLeft,body[0].offsetWidth,body[0].offsetHeight);
      console.log('body scroll TLWH',body[0].scrollTop,body[0].scrollLeft,body[0].scrollWidth,body[0].scrollHeight);

      console.log('width',el.width());
      console.log('offset TLWH',el[0].offsetTop,el[0].offsetLeft,el[0].offsetWidth,el[0].offsetHeight);
      console.log('client TLWH',el[0].clientTop,el[0].clientLeft,el[0].clientWidth,el[0].clientHeight);
      console.log('scroll TLWH',el[0].scrollTop,el[0].scrollLeft,el[0].scrollWidth,el[0].scrollHeight);

    },
    _create: function() {
      // this.testSize();

        // console.log('1 element',this.element.width(),this.element);
        var attrJour = getDataAttributes(this.element);
        var data = this.element.data();
        if (!this.options.links) {
          if(data.links){
            this.options.links = data.links;
          }
        }

        if (!this.options.useControlPanel) {
          if (data.useControlPanel) { this.options.useControlPanel = true; }
        }
        if (!this.options.countrows) {
          this.options.countrows = attrJour.countrows;
        }
        if (!this.options.CPAttr.filters) {this.options.CPAttr.filters = attrJour.filters;};
        if (!this.options.CPAttr.masterfield) {this.options.CPAttr.masterfield = attrJour.masterfield};
        if (!this.options.CPAttr.path) { this.options.CPAttr.path = attrJour.path};
        if (this.options.CPAttr.path) {
          this.options.table = this.options.CPAttr.path.split('/')[1].replace('_list','');
        };

        // console.log('CPAttr.path',this.options.CPAttr.path);


        if (!this.options.search) {
          if (this.options.table) {
            this.options.search = genScriptSearch(this.options.table);
          }
        }

        if (this.options.useCheckRow) {this.setCheckRow();}

        if (this.options.useColumnSizeMemory) {
          var nameSet = this.getNameStorage();
          if (nameSet) {
            var dataSet = localStorage.getItem(nameSet+'.sizeColumns');
              if (dataSet) {
                this.options.sizeColumns = JSON.parse(dataSet);
              }
          }
        }


        // console.log('element',this.element.width());
        this.setColumns();

        this.setSizeColumns();
        // console.log('2 wJur width',this.options.table,this.element.find('#titles').width());
        if (this.options.useControlPanel) {this.setControlPanel();}
        this.setSizeCP();
      var blockWidth = this.element.outerWidth();
      new ResizeSensor(this.element.parent()[0], ()=> {
          if (blockWidth != this.element.outerWidth()) {
            this.setSizeCP();
          }
      });
      this.moveColum();


      // console.log('3 wJur width',this.options.table,this.element.find('#titles').width());
      if (this.options.useCorrectColumns) {
        this.correctColumns();
      }
      //
      this.element.css('clear','both');
    },

    _setOption: function( key, value ) {
      $.Widget.prototype._setOption.apply( this, arguments );
      this._super( "_setOption", key, value );
    },

    setCheckRow: function(){
      this.element.find('.row').checkrow({
        'whenSelectingRow': this.options.whenSelectingRow
      });
    },
    //конструктор навигатора

    cacheNav: function (current_size,range,val) {
      // range: колличество частей (страниц), доступных в кеше
      root = $('<div>').attr({'class':'cachnav'});
      root.append($('<div>').text(val+' : '));
      for (var i = 0; i < range; i++) {
        l = i+1;
        var link = $('<div>').text(l);
        if ((i+1)==current_size) {
             link.addClass('current-size');
        }
        else {
             link.addClass('ripple link-page');
        }
        root.append(link);
      }
      return root;
    },
    setControlPanel: function () {
      var pattern = '<div id="control-bar" class="gr-rn control-bar" >'+
                  '<div class="ripple cp-search-box search-area float-left">'+
                    '<input class = "not-ripple cp-in-search" type="text" name="query"  value="" autocomplete = "off" placeholder="Поиск">'+
                    '<div id = "apply" class = "lang" title = "search" >'+
                      '<svg><use xlink:href="/file/ico/sprite.svg#magnifying_glass"></use></svg>'+
                    '</div>'+
                  '</div>'+
                  '<div id ="button-panel">'+
                      '<div id = "chk_fast" class = "checkbox lang" title = "fast_searsh" value=""></div>'+
                      '<div class = "ripple btn-square btn-control-offset lang" title = "to_top" data-mode="page" data-offset = "up" >'+
                        '<svg><use xlink:href="/file/ico/sprite.svg#double_up"></use></svg>'+
                      '</div>'+
                      // '<div class = "ripple btn-square btn-control-offset" data-mode="step" data-offset = "-1" >'+
                      //   '<svg><use xlink:href="/file/ico/sprite.svg#mono_up"></use></svg>'+
                      // '</div>'+
                      '<input  id="in_id" class = "cp-input lang" title = "record_id" size="3" type="text"  placeholder="№" >'+
                      // '<div class = "ripple btn-square btn-control-offset" data-mode="step" data-offset = "+1" >'+
                      //   '<svg><use xlink:href="/file/ico/sprite.svg#mono_down"></use></svg>'+
                      // '</div>'+
                      '<div class = "ripple btn-square btn-control-offset lang" title = "to_end" data-mode="page" data-offset = "down" >'+
                        '<svg><use xlink:href="/file/ico/sprite.svg#double_down"></use></svg>'+
                      '</div>'+
                      '<input id = "countrows" class = "cp-input lang" title = "countrows" type="number" step="4" min="8" />'+
                      '<div class = "ripple btn-square border-button lang" title = "new_element" id="new-element">'+
                        '<svg><use xlink:href="/file/ico/sprite.svg#record_plus"></use></svg>'+
                      '</div>'+
                      '<div class = "ripple btn-square lang" title = "option" id="option">'+
                        '<svg><use xlink:href="/file/ico/sprite.svg#option"></use></svg>'+
                      '</div>'+
                  '</div>'+
                  '<div id = "filterset"  hidden>'+
                    '<textarea id = "search" placeholder = "search"></textarea>'+
                    '<textarea id = "order" placeholder = "order"></textarea>'+
                    '<textarea id = "links" placeholder = "links"></textarea>'+
                  '</div>'+
                '</div>';

        var elJournal = this.element;
        var jour_attr = this.options.CPAttr;
        this.options._elControl = $(pattern);
        var elControl = this.options._elControl; //.attr('data-target',journalSelector);
        elJournal.before(elControl);
        var elAutoCompList = elControl.find('.autocomplete');
        elAutoCompList.autocomplete({
          source: (typeof availableSearchWords !== "undefined")? availableSearchWords:[]
        });
        var el = $(this.element);
        elControl.find('#apply').click(function(){el.journal('applyFilter',1)});
        var formPath = this.options.CPAttr.path.replace('_list/','_form/');

        elControl.find('#new-element').attr({
          'data-typedialog' : 'form' ,
          'data-href' : formPath+'?new=0',
        }).click(function (currentEvent) {
            $('<div>').windialog({
                      'currentEvent':currentEvent,
                      'whenCloseWindow':function (formEl) {
                          var id = formEl.form('option','id');
                          el.journal('reload',id);
                        }
                      });
          });
          elControl.find('.search-field').keyup(function(key){
            if (key.keyCode==13) {
              elAutoCompList.autocomplete("close");
              el.journal('applyFilter',1);
            }
          });

          elControl.find('#option').click((ev)=>{
            if (this.options.settingsWindow) {
              this.options.settingsWindow.dialog('open');
            }else{
                var setEL = $('<div id = "filterset" class="filterset">'+
                                '<div id ="savebox">'+
                                '</div>'+
                                '<div class ="formtabs">'+
                                  '<ul>'+
                                    '<li><a href="#constructor" class = "lang" >constructor</a></li>'+
                                    '<li><a href="#scripts" class = "lang" >scripts</a></li>'+
                                  '</ul>'+
                                  '<div id ="constructor">'+
                                    '<input id = "countrows" class="main autolabel" type="number" step="4" min="8"  name="countrows" value="8">'+
                                    '<div class = "delimiter"></div>'+
                                    '<button id = "btn_addrule" class = "lang">add_rule</button>'+
                                    '<div id ="filterrules"></div>'+
                                    '<button id = "btn_addorder" class = "lang">add_order</button>'+
                                    '<div id ="sortorder"></div>'+
                                  '</div>'+
                                  '<div id ="scripts">'+
                                    '<textarea class = "" title = "search" id = "search" placeholder = "search"></textarea>'+
                                    '<textarea class = "" title = "order" id = "order" placeholder = "order"></textarea>'+
                                    '<textarea class = "" title = "links" id = "links" placeholder = "links"></textarea>'+
                                  '</div>'+
                                '</div>'+
                              '</div>');
                  setEL.windialog({ typedialog : 'settings', currentEvent : ev });
                  // setEL
                  setEL.filterset({
                      table: this.options.table,
                      currentPreset: this.options.preset,
                      relationshipElement: elControl
                  });
                  this.options.settingsWindow = setEL;
              }
          });

          elControl.find('.btn-control-offset').click(function() {
            elControl.find('.cp-in-search').val('');
            el.journal('rowShift',this);
          });
          elControl.find('#in_id').keyup(function(key){
            if (key.keyCode==13){
              elControl.find('.cp-in-search').val('');
              el.journal('rowShift',this);
            }
          });
          var ln = elJournal.find('.row:not(.titles)').length;
          if (!this.options.countrows) {
            this.options.countrows = ln;
          };
          var listEL = ['links','order','search'];
          listEL.forEach((name)=>{
            elControl.find('#'+name).text(this.options[name])
                .change(function(el) {
                      elJournal.journal('option',name,$(el.target).val());
                      })
          });




        var chkFastEl = elControl.find('#chk_fast');

        chkFastEl.checkbox({
          checked: this.options.fastSearch,
          click:()=> {
            var check = chkFastEl.checkbox('check');
            elJournal.journal('option','fastSearch',check);
            if (check) {elJournal.journal('iniSearchField','set');
                }else{ elJournal.journal('iniSearchField','del'); }
          }
        });
        if (this.options.fastSearch) {this.iniSearchField('set');}
        else{ this.iniSearchField('del');}

        setRipple(elControl);
        var countrowsEl = elControl.find('#countrows');
        countrowsEl.val(this.options.countrows);
        countrowsEl.change((ev)=>{
          this.options.countrows = $(ev.target).val();
        });
        elControl.translate();
    },


    iniSearchField:function(line) {
      /// line:  'set' / 'del'
      var limit = 3;
      var delay = 300;
      var searchEl = this.options._elControl.find('.cp-in-search');
      var thisEL = this.element;
      var timerId = -1; //setTimeout(func / code, dela
      var currentVal = '';

      function startRequest() {
          thisEL.journal('applyFilter',1);
          currentVal = searchEl.val();
      }

      function fastKeyup(key) {
        if ((key.keyCode>=48)&&(key.keyCode<=90)||(key.keyCode>=190)||(key.keyCode>=96)&&(key.keyCode<=111)) {
          if (searchEl.val().length>=limit) {
            if (currentVal!=searchEl.val()) { //зачита от избыточных срабатований при быстом наборе
                clearTimeout(timerId);
                timerId = setTimeout(startRequest,delay);
            }else{
              currentVal = '';
            }
          }else{
            clearTimeout(timerId);
          }
        }
      }

      function enterKeyup(key) {
        if (key.keyCode==13) {
          thisEL.journal('applyFilter',1);
        }
      }

      if (line=='set') {
        searchEl.on('keyup.fast',fastKeyup);
      }else if (line=='del') {
        searchEl.off('keyup.fast');
      }
      searchEl.on('keyup.enter',enterKeyup);

    },
    applyFilter: function (size) {
      var filterRequest;
      var elJournal = this.element;
      var jour_attr = this.options.CPAttr;
      //-----------------удалить
      var win = this.element.closest('.win');
      var win_id = win.attr('id') ? '#'+win.attr('id'): '' ;
      //---------------------------
      var mf_val = '';
      // var elControl = this.options._elControl;

      // отправка
      var out = {
        'reload': true,
        'path': jour_attr.path,
        'request': {
                    'pp': "part",
                    'countrows': this.options.countrows,
                  },
      }
      var call = [];

      if (!this.options.fastSearch){
        out.request.size = size;
        out.request.mode = 'cache';
        call.push(
            function (input) {
              for (var i = 0; i < input.length; i++) {
                if (input[i]['cache_len']) {
              // range: колличество частей (страниц), доступных в кеше
                  range = (input[i]['cache_len']/input[i]['countrows']>>0)+1;
                }
              }
              var el = $(elJournal);
              var nav = el.journal('cacheNav',size,range,mf_val);
              elJournal.prepend(nav);
              elJournal.append(nav.clone());
              elJournal.find('.cachnav .link-page')
                  .click(function() {
                  var currenEl = $(this);
                  el.journal('applyFilter',Number(getValElement(currenEl)))
                });
            }
        );
      }
      else{
        out.request.mode = 'fast';
      }

      this._send(out,call);
    },


    _send: function(out,call=[]) {
      if (this.options.countrows) {
        out.request.countrows = this.options.countrows;
      }
      if (this.options.sel_fields) {out.request.sel_fields = this.options.sel_fields;}
      var filterRequest = {};
      var opList = ['order','links','search'];
      var word = getValElement(this.options._elControl.find('.cp-in-search'));

      opList.forEach((el)=>{
        var newFilter = this.options[el].replace(/\[WORD\]/g,word);
        if (el == 'search') {
          if (this.options._elControl) {
            // var word = getValElement(this.options._elControl.find('.cp-in-search'));
            if (word) {
              // var ss = this.options['search'].replace(/\[WORD\]/g,word);
              // if (this.options[el]) {filterRequest[el] = ss;}
              if (this.options[el]) {filterRequest[el] = newFilter;}
            }
          }

        }else if (el == 'order') {
          if (out.request.size) {
            // if (this.options[el]) {filterRequest[el] = this.options[el];}
            if (this.options[el]) {filterRequest[el] = newFilter;}
          }
        }else{
          if (this.options[el]) {filterRequest[el] = newFilter;}
        }
      });
      if (JSON.stringify(filterRequest)!='{}') {
        out.request.filter = filterRequest;
      }
      var el = $(this.element);

      call.unshift(function(input) {
        el.loadСontent(input);
      });
      if (el.journal('option','useCheckRow')) {
        call.push(function(){
          el.journal('setCheckRow');
        });
      };

      call.push(function(){
        el.journal('option','call')();
      });
      call.push(function(){
            el.ini();
            el.journal('setColumns');
            el.journal('setSizeColumns');
            // var sizeColumns = el.journal('option','sizeColumns');
            // console.log('after send',sizeColumns);
            // if ((Object.keys(sizeColumns).length==0)) {
            //   el.journal('correctColumns');
            // }
            el.journal('correctColumns');
        });

      // трансформация в новый протокол
      out.request.path = this.options.CPAttr.path;
      var newOut = [
        {
          'target':{
              'module':'content',
              'class': "Form",
          },
          'param': out.request
        }
      ];
      mxhRequest(newOut,call);
    },

    reload:function(id=0) {
      var el = this.options._elControl.find('#in_id');
      el.val(id);
      this.rowShift(el);
    },

    rowShift:function(currenEl) {
      param = getDataAttributes($(currenEl));
      elJournal = this.element;
      elControl = this.options._elControl;
      win_id= elJournal.closest('.win').attr('id')? '#'+elJournal.closest('.win').attr('id'): '' ;
      journal_id = elJournal.attr('id');
      jour_param = this.options.CPAttr;
      inp_id = elControl.find('#in_id');
      in_id = Number(inp_id.val());
      inp_id.val('');
      var tabl = elJournal.find('.row '+'[name='+jour_param.masterfield+']');
      var id = 0;
      var mediana = (tabl.length / 2 >> 0)-1;
        if (in_id) {
          id = in_id;
        }else{
          if ((param.offset=='up')||(param.offset=='-1')){
   		      scrollset =0;
   		    }else{
   		      scrollset =1000;
   		    }
          if (param.mode=='step'){
            offset = Number(param.offset);
               id = getValElement(tabl.eq(mediana+offset));
           } else if (param.mode=='page'){
               if (param.offset=='up'){
                   id = getValElement(tabl.eq(0));
               } else if (param.offset=='down'){
                   id = getValElement(tabl.eq(tabl.length-1));
               }
           }
        }
       request = {
         'countrows': this.options.countrows ? this.options.countrows : tabl.length,
         'id': id,
         'pp': "part",
       }

       out = {
         'path': jour_param.path,
         'request': request,
         'reload': true,
       }
      this._send(out);
    },

    setColumns:function() {
      row = this.element.find('.row').eq(0);
      var hasData = row.children('div').texts().join('');
      var col_list = row.children('div').attrs('name');
      if (!hasData) {// если строка пустая - это технологическая строка
        row.addClass('subrow');
      }
      if (!col_list.length) {
        if (this.options.CPAttr.masterfield) {
          col_list.push(this.options.CPAttr.masterfield);
        }

      }
      // ищем елементы  склассом subfield, что бы добавить такой же класс в шапку
      sub_el_list = row.children('div.subfield').attrs('name');
      root = $('<div>').attr('id','titles');
      for (var i = 0; i < col_list.length; i++) {
          var colum = $('<div>').attr({
                                      name:col_list[i],
                                      title:serviceData.wordTranslate(col_list[i])[1]
                                      })
                              .text( serviceData.wordTranslate(col_list[i])[0]);
              if (sub_el_list.indexOf(col_list[i] ) != -1) { // если этот елемент был с классом subfield
                colum.addClass('subfield');
              }
          if (colum.attr('name')=='selectrow') {
            colum.empty();
            colum.html('<svg style="width: 17px; height: 17px;"><use xlink:href="/file/ico/sprite.svg#checkbox_ico"></use></svg>');
          }
          root.append(colum);


      }



      // console.log('root',root.width());



      this.element.prepend(root);

      /// temp
      // var mount = 0;
      // var list = root.find('[name],.border');
      // list.each((i,el)=>{
      //   mount = mount + el.offsetWidth;
      //   console.log($(el).attr('name'),el.offsetWidth);
      // });
      // console.log('mount',mount);
      // console.log('titles',this.element.find('#titles'));
      //
      // console.log('1 wJur width',this.options.table,this.element[0].offsetWidth);

      this.element.find("#titles div, .row div").after('<div class = border><div></div></div>');
    },

    moveColum: function() {
      var currentEl = null;
      this.element.mousemove((ev)=> {
        if(ev.originalEvent.buttons){
          var parEL = $(ev.target).parent();
          var evEl = $(ev.target);
          if (evEl.hasClass('border')) {
            currentEl = ev.target;
            this.element.addClass('lockcursor');
          }else if (parEL.hasClass('border')) {
            currentEl = parEL[0];
            this.element.addClass('lockcursor');
          }
        }else {
          currentEl = null;
          this.element.removeClass('lockcursor');
        };
        if (currentEl) {
          var prevEl = $(currentEl.previousElementSibling);
          var name = prevEl.attr('name');
          var elList = this.element.find('[name='+name+']');
          var size = prevEl.width()+ev.originalEvent.movementX;
          elList.width(size);
          this.options.sizeColumns[name] = size;
        }
      });
    },

    setSizeColumns: function(mode='useMemorySize') {

      /* mode  - useMemorySize / resetSize */

      var thisEl = $(this.element);

      function getMaxWidthField(name) {
        var list = thisEl.find('.row [name='+name+']');
        // list.css('width','auto');
        var width = 0;
        list.map(function(i,el) {
          let curEl = $(el);
          let curWidth = curEl.width();
          if (width<curWidth) {
            width = curWidth;
          }
        });
        if (width<15) {
          width = 15;
        }else if (width > 200) {
          width = 200;
        }
        return width
      }

      var row = this.element.find('.row').eq(0);
      var col_list = row.children('div[name]').attrs('name');
      col_list.forEach((col,i)=>{
        var mwh = 0;
        if ((!this.options.sizeColumns[col])||(mode=='resetSize')) {
          mwh = getMaxWidthField(col);
          this.options.sizeColumns[col] = mwh;
        }else{
          mwh = this.options.sizeColumns[col];
        }
        thisEl.find('[name='+col+']').width(mwh);

      });
    },

    correctColumns:function () {
      // console.log('correctColumns start',this.options.sizeColumns);
      /// корректировка размера колонок, если осталось свободное место
      if (this.options.useCorrectColumns) {
        // console.log('if (this.options.useCorrectColumns) {');
        // var mountAllColumn = ()=>{
        //   var buf = 0;
        //   for (var column in this.options.sizeColumns) {
        //     var val = this.options.sizeColumns[column];
        //     buf = buf+val;
        //   }
        //   return buf;
        // }
        // var mount = mountAllColumn();

        var wJur = this.element.find('#titles').width();




//============
        var exceptList = ['selectrow'];
        if (this.options.CPAttr.masterfield) {
          exceptList.push(this.options.CPAttr.masterfield);
        }
        var listEl = this.element.find('#titles [name],#titles .border');
        var mount = 0;
        listEl.each((i,el)=>{
          // console.log($(el).attr('name'),el.offsetWidth);
          mount = mount + el.offsetWidth;
          var thisEl = $(el);
          // исключаем первые два елемента имеющие name
          var name = thisEl.attr('name');
          if (name) {
            if (i<4) {
              exceptList.push(name);
            }
          }
        });

        // console.log('wJur,mount',wJur,mount);
//============

        if (wJur > mount) {
          var rem = wJur - mount;
          // console.log('сонт - общ',mount,'-',wJur,'=',rem);
          var med = mount/Object.keys(this.options.sizeColumns).length;
          // console.log('среднее на ',Object.keys(this.options.sizeColumns).length,'=',med);

          // console.log('exceptList',exceptList);
          var colList = [];
          for (var column in this.options.sizeColumns) {
            var val = this.options.sizeColumns[column];
            if (val < med) {
              if(exceptList.indexOf(column)===-1){
                  colList.push(column);
              }
            }
          }
          // console.log('sizeColumns',this.options.sizeColumns);
          // console.log('colList',colList);
          if (colList.length) {
            var inc = (rem-(colList.length*6)) / colList.length; // 6 - поправка на padding
            // console.log('прирост на ',inc);
            colList.forEach((el,i)=>{
              var val = this.options.sizeColumns[el];
              // console.log('val',val);

              var newVal = val+inc;
              // console.log('newVal',el,newVal);
              this.element.find('[name='+el+']').width(newVal);
              this.options.sizeColumns[el] = newVal;
            });
            this.options.useCorrectColumns = false;
          }
        }
      }

      // console.log('all = ',mountAllColumn());
      // console.log('journal',wJur);
      // console.log('correctColumns end',this.options.sizeColumns);
    },

    setSizeCP:function () {
      if (this.options.useControlPanel) {
        var elControl = this.options._elControl;
        var currval = this.element.width();
        if (currval) {
          elControl.outerWidth(currval);
        }
        var chl  = elControl.find('#button-panel').children();
        var c = 0;
        for (var i = 0; i < chl.length; i++) {
          c = c + chl.eq(i).outerWidth(true);
        }
        var sizeButPan = c;
        var search_width = currval - sizeButPan - elControl.find('div#apply').outerWidth(true)-15 ;
        if(search_width > 160){
          elControl.find('.cp-in-search').outerWidth(search_width);
          elControl.height(30);
          elControl.find('.cp-search-box').addClass('float-left');
        }else{
          elControl.height(62);
          elControl.find('.cp-search-box').removeClass('float-left');
          elControl.find('.cp-in-search').outerWidth(elControl.width()-30);
          elControl.find('#button-panel').addClass('margin-left');
        }

      }
    },

    disband: function() {//удаляет контрольпанель и шапку таблицы журнала
      if (this.options._elControl) {
        this.options._elControl.remove();
      }
      this.element.find('#titles').remove();
      this.element.find('div[name]').removeAttr('style');
    },

    empty:function () { // очищает содержимое журнала
      this.element.find('.row').remove();
    },

    getNameStorage:function() {
      var currentBase = location.pathname.split('/')[1];
      var namePatternJourn = null;
      if (this.options.CPAttr.path) {
        namePatternJourn = this.options.CPAttr.path.split('/')[1];
      }else{
        if (this.options.table) {
          namePatternJourn = this.options.table;
        }
      }

      return  namePatternJourn ? currentBase+'.'+namePatternJourn : null;
    },

    destroy: function() {
      if (this.options.useColumnSizeMemory) {
        var name = this.getNameStorage();
        if (name) {
          if (Object.keys(this.options.sizeColumns).length) {
            var data = JSON.stringify(this.options.sizeColumns);
            localStorage.setItem(name+'.sizeColumns',data);
          }
        }
      }

      if (this.options.settingsWindow) {
        this.options.settingsWindow.dialog('destroy');
        this.options.settingsWindow.remove();
      }
      $.Widget.prototype.destroy.call( this );
    }
  });
}( jQuery ) );



;(function( $ ) {
    $.widget( "elementsControl.selectItems", {
      options: {
        relationshipElement:$(''),
        typeRelationEl:null,// 'journal','one'
        _selectedJournal:null,
        _allJournal:null,
        _selectedList:null,
        _allList:null,
        choicemode : 'multi', // 'one' 'multi'
        // mainFild : null,
        links: '',
        countrows: 5,// для allJournal
        masterfield:'',// главное поле
        path:'', // путь к шаблону журнала}
        fieldlist: '',//список полей для журнала selectedJournal. Если в
                      // relationshipElement нет шапки
        call:function() {}
      },
      _create: function() {

        var elTabs =$(
          '<div id = "tab" >'+
            '<ul>'+
              '<li><a href="#selected" class = "lang">selected_el</a></li>'+
              '<li><a href="#all" class = "lang" >all_el</a></li>'+
            '</ul>'+
            '<div class = "tab" id = "selected"></div>'+
            '<div class = "tab" id = "all"  ></div>'+
            '<div>'+
            '<button id = "ok">ok</button>'+
            '<button id = "cancel" class = "lang" >cancel</button>'+
            '</div>'+
          '</div>')
          elTabs.translate();
          this.element.append(elTabs);

          var selectedJour = this.options.relationshipElement.clone();
          // selectedJour.addClass('inbuilt-journal');

          /*переключение имен*/
          selectedJour.find('[data-asname]').each(function (i,el){$(el).toggleName();})
          var relationshipElement = this.options.relationshipElement;
          var titlesEl = selectedJour.find('#titles');
          if (titlesEl.length) {
            titlesEl.remove();
            this.options.typeRelationEl = 'journal';
          }
          selectedJour.find('div[name]').removeAttr('style');

            this.element.find('#selected').append(selectedJour);



          this.options._selectedJournal = selectedJour;
          selectedJour.journal({
            'useCheckRow':true,
            useCorrectColumns:false,
            'whenSelectingRow':function(element) {
              fromSelected(element);
            },
          });//{'useCheckRow':true}
          selectedJour.find('.row[hidden]').checkrow({'checked':false});
          selectedJour.find('.row:not([hidden])').checkrow({'checked':true});
          selectedJour.find('.row').removeAttr('hidden');
          selectedJour.ini();
          var allJournal = $('<div class = "inbuilt-journal">');//.attr('id',all_id);
          this.element.find('#all').append(allJournal);
          this.options._allJournal = allJournal;
          var path = this.options.path;
          var masterfield = this.options.masterfield;
          var el = selectedJour.find('.row [name="'+masterfield+'"]').eq(0);
          var id =  getValElement(el);
          var out = {
            'path': path,
              'request': {
                  'countrows': this.options.countrows,
                  'id': id ? id : '0',
                  'pp': "part",
                },
          };
          if (this.options.links){
              out.request['filter'] = {'links':this.options.links};
          };

          var countrows = this.options.countrows;
          var links = this.options.links;
          var thisEl = this.element;
          var choicemode = this.options.choicemode;
          var fieldList = this.options.fieldlist.split(',');
          var call = [(input)=>{
            allJournal.loadСontent(input);
            allJournal.ini()
            allJournal.journal({
                useCorrectColumns:true,
                'useControlPanel':true,
                'useCheckRow': true,
                'countrows': countrows,
                'links': links,
                'CPAttr':{
                  'filters':'allFields',
                  'masterfield':masterfield,
                  'path':path,
                },
                'whenSelectingRow':function(element) {
                  fromALL(element);
                },
                'call':function () {
                  thisEl.selectItems('selectedInAll');
                }
              });
              elTabs.wintabs({
                activate: function( event, ui ) {
                  var jourEl = ui.newPanel.find('.inbuilt-journal');
                  // jourEl.journal('setSizeColumns');
                  jourEl.journal('option','correctColumns',true);
                  jourEl.journal('correctColumns');
                  //корректировка
                  if (ui.newPanel.attr('id')=='all') {
                    ui.newPanel.attr('style',"height: auto");
                  }
                  var hAll = elTabs.find('#all').height();
                  var hSel = elTabs.find('#selected').height();
                  if(hAll!=hSel){
                    ui.newPanel.attr('style',"height: auto");
                  }
                },
                heightStyle:'auto',
              });
              thisEl.find('#ok').click(function() {
                thisEl.selectItems('result');
              })
              thisEl.find('#cancel').click(function() {

                thisEl.selectItems('destroy');
                thisEl.remove();
              });
              elTabs.wintabs('option','active',1);
              // if (choicemode=='one') {
              //     elTabs.wintabs('option','active',1);
              // }else{
              //     elTabs.wintabs('option','active',0);
              // }
              thisEl.selectItems('selectedInAll');
              thisEl.selectItems('option','call')();

              thisEl.find('.cp-in-search').eq(0).focus();

          }];
          // трансформация в новый протокол
          out.request.path = out.path
          var newOut = [
            {
              'target':{
                  'module':'content',
                  'class': "Form",
              },
              'param': out.request
            }
          ];
          mxhRequest(newOut,call);

          function fromSelected(element) {
              var mfVal  = element.find('[name="'+masterfield+'"]').text();
              var elAll = allJournal
               .find('[name="'+masterfield+'"]:contains("'+mfVal+'")')
               .closest('.row');
               element.toggleClass('turn');
               if (elAll.length) {
                 elAll.checkrow({'checked':element.checkrow('check')});
               }
          }


          function fromALL(element) {
            var mfVal  = element.find('[name="'+masterfield+'"]').text();
            var elSelected = selectedJour
             .find('[name="'+masterfield+'"]:contains("'+mfVal+'")')
             .closest('.row');
           if (elSelected.length) {
             elSelected.checkrow({'checked':element.checkrow('check')});
             elSelected.toggleClass('turn');
           }else{
             var newRow = selectedJour.find('.row').eq(0).clone();
             newRow.removeClass('subrow');
             newRow.find('.subfield').remove();
             newRow.find('*').text('').removeAttr('value');
             var elList = newRow.find('[name]');
             // елемент в Selected   и заменяем на едлемент из All
             for (var i = 0; i < elList.length; i++) {
               var curSelEl = elList.eq(i);
               var nameEl = curSelEl.attr('name');
               var curAllEl = element.find('[name="'+nameEl+'"]');
               if (curAllEl.length) {
                  curSelEl.replaceWith(curAllEl.clone());
               }
             }
             //установка всех атрибутов
             newRow.addClass('turn');
             var communityName =  selectedJour.attr('id');
             newRow.addClass(communityName);// класс должен быть такимже как id журнала
             newRow.find('div:not(.subfield)').addClass(communityName);
             newRow.checkrow({
               'checked':element.checkrow('check'),
               'whenSelectingRow':function(element) {
                 fromSelected(element);
               },
             });//'stateCheck'
             newRow.checkrow('stateCheck');
            newRow.ini();
            newRow.find('.border').append('<div>');
            // console.log('border',);


            if (choicemode=='one') {
              selectedJour.journal('empty');}
              selectedJour.append(newRow);
            // добавляем классы из орегинала
              relationshipElement.find('[data-asname]').each(function (i,el){$(el).toggleName();});
              var templeList = relationshipElement.find('[name]').clone();
              templeList.removeClass('subrow');
              for (var i = 0; i < templeList.length; i++) {
                var asname = templeList.eq(i).attr('data-asname');
                var tname = templeList.eq(i).attr('name');
                var tclass = templeList.eq(i).attr('class');
                selectedJour.find('[name='+tname+']').addClass(tclass);
                if (asname) {selectedJour.find('[name='+tname+']').attr('data-asname',asname);}
              }
              selectedJour.journal('setSizeColumns','resetSize');
              // selectedJour.journal('correctColumns');
           }
          if (choicemode=='one') {thisEl.selectItems('result');}
          }
      },

      selectedInAll:function() {
//ищем выделинные строки и составляем список
        var selectedList = this.options._selectedJournal
                  .find('.ec-row-selected [name="'+this.options.masterfield+'"]')
                  .texts();
        var allList = this.options._allJournal
                    .find('.row [name="'+this.options.masterfield+'"]')
                    .texts();
        this.options._selectedList = selectedList;
        this.options._allList = allList;
//сравнивам списки и составляем список индексов совпадений в _allJournal
        var resultIndexList = [];
        selectedList.forEach(
          function(el) {
            if (allList.indexOf(el)>=0){
            resultIndexList.push(allList.indexOf(el));}
          }
        );
//выделение строк в allJournal
        var elAllList = this.options._allJournal.find('.row');
        for (var i = 0; i < resultIndexList.length; i++) {
          elAllList.eq(resultIndexList[i]).checkrow("option",'checked',true);
        }
      },

      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      result: function () {
        var currentEvent = this.element.closest('.windialog').windialog('option','currentEvent');
        var eventEL = currentEvent.currentTarget;
        var currLinks = this.options._allJournal.journal('option','links');
        $(eventEL).attr('data-links',currLinks);
        this.options.relationshipElement.empty();
        this.options._selectedJournal.children('.row:not(.ec-row-selected)')
                                      .attr('hidden',true);
        this.options._selectedJournal.journal('disband'); // удаление управляющих елементов и дизайна журнала
        var selEl = this.options._selectedJournal.children('.row');
        selEl.find('.border').remove();
        selEl.checkrow('destroy');
        this.options._selectedJournal.journal('destroy');
        this.options._allJournal.journal('destroy');
        this.options.relationshipElement.append(selEl);
        this.options.relationshipElement.find('[data-asname]').each(function (i,el){$(el).toggleName();});
        if (this.options.typeRelationEl=='journal') {
          this.options.relationshipElement.journal('setColumns')
                                          .journal('setSizeColumns');
        }
        this.element.remove();
        this.destroy();
      },
      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
    });
  }( jQuery ) );


  (function( $ ) {
      $.widget( "elementsControl.filterset",{
        options: {
          table:'',
          currentPreset: "", // если по умолчанию 0 , то открывает последний   пресет, если 1, то первый
          relationshipElement: null,
          complexLinks:false,
          _dataList : ['links','order','search','countrows'],
        },

        _create: function() {
          this.syncTA('toConstructor');
          if (this.options.currentPreset==='') {
            this.readScript();
          }

          this.element.find('#savebox').preset({
            width:313,
            className: this.options.table+"_list",
            currentPreset: this.options.currentPreset,///elParam.prid ? Number(elParam.prid) : 0
            beforeSaving: ()=>{
              this.thisToPreset();
            },
            whenChanges:()=>{this.presetToThis();}
          });

          //если ничего не было загружено
          var rulesEL = this.element.find('#filterrules .rule');
          var ordersEL = this.element.find('#sortorder .order');
          if (!(rulesEL.length||ordersEL.length)) {
            this.readScript();
          }



          this.element.find('#btn_addrule').click(()=>{ this.addRule(); });
          this.element.find('#btn_addorder').click(()=>{ this.addOrder(); });
          this.element.find('#links').change((ev)=>{ this.syncTA('toOriginal','#links'); });
          this.element.find('#order').change((ev)=>{ this.syncTA('toOriginal','#order'); });
          this.element.find('#search').change((ev)=>{ this.syncTA('toOriginal','#search'); });
          this.element.find('#countrows').change((ev)=>{ this.syncTA('toOriginal','#countrows'); });
          this.element.find('.formtabs').tabs({
            activate:( event, ui )=>{
              if (ui.newPanel[0].id=='constructor') {
                this.readScript();
              }
            }
           });
        },

        thisToPreset:function () {
          var data = {};
          this.options._dataList.forEach((el,i)=>{
              var val = this.element.find('#'+el).val();
              data[el] = val ? val : '';
          });
          this.element.find('#savebox').preset('option','data',objectToStr(data));
        },

        presetToThis:function() {
          var data = strToObject(this.element.find('#savebox').preset('option','data'));
          for (var el in data) {
            var currEl = this.element.find('#'+el);
            currEl.val(data[el]);
            currEl.change();
          };
          this.syncTA('toOriginal');
          this.readScript();
        },

        readScript:function () {
          var scriptLinks = this.element.find('#links').val();
          var scriptOrder = this.element.find('#order').val();
          this.element.find('#filterrules,#sortorder').empty();
          var table = this.options.table;


          this.options.complexLinks = /[()\|]/.test(scriptLinks);




          if (this.options.complexLinks) {
            this.element.find('#btn_addrule').addClass('disabled');
          }else{
            this.element.find('#btn_addrule').removeClass('disabled');
          }





          // console.log('this.options.complexLinks',this.options.complexLinks);
          // var sctList = scriptLinks.split('&&');
          var sctList = scriptLinks.split(/&&|\|\|/);
          sctList.forEach((el,i)=>{
            if (el) {
              var el_ = el.replace(/[()]/,'');
              var active = /(\/\*).+?(\*\/)/.test(el_) ? false : true; // определяем закомментировано ли правила
              var oper = /=|<>|<|>|LIKE/.exec(el_);
              var operReg = new RegExp(oper);

              var rule = el_.replace(/\/\*|\*\//g,'').split(operReg);

              console.log('rule',rule);
              // var rule = el.split(/(\s+)/).filter(e => e.trim().length > 0);
              // this.addRule(rule[0],rule[1],rule[2]);
              this.addRule(rule[0].trim(),oper,rule[1].trim(),el_.trim(),active);
            }
          });




          var scrOrdList = scriptOrder.split(',');
          scrOrdList.forEach((el,i)=>{
            if (el) {
              var ord = el.split(/(\s+)/).filter(e => e.trim().length > 0);
              var sort = ord.length > 1 ? ord[1] : 'ASC';
              this.addOrder(table+'.'+ord[0],sort);
            }
          });
        },

        syncTA: function(route,element='all') {
          // synchronization between elements textarea
          // route : 'toConstructor' or 'toOriginal'
          var origEl = this.options.relationshipElement;
          var constEl = this.element;//.find('#scripts');
          var elList = ['#order','#links','#search','#countrows'];
          var hasEl = elList.indexOf(element);
          if (hasEl > -1) {
            elList = [ elList[hasEl] ];
          }
          if (route == 'toConstructor' ) {
             elList.forEach((el,i)=>{
               constEl.find(el).val( origEl.find(el).val() );
             });
          }else if (route == 'toOriginal' ) {
            elList.forEach((el,i)=>{
              var currEl = origEl.find(el);
              currEl.val( constEl.find(el).val() );
              currEl.change();
            });
          }
        },

        createScriptOrder:function() {
          var taOrderEl =  this.element.find('#order');//this.element.find('#scripts #order');
          taOrderEl.val('');
          var script = '';
          var orderList = this.element.find('#sortorder .order');
          orderList.each((i,el)=> {
              var orderEl = $(el);
              var field = getValElement( orderEl.find('.field'));
              var sort = getValElement( orderEl.find('.sort'));
              field = field.split('.');
              field = field[field.length-1]
              if ((field)&&(script.indexOf(field)-1)) {
                if(script){
                  script = script + ",";
                };
                script = script + " "+field+" "+sort;
              }
          });
          taOrderEl.val(script);
          this.syncTA('toOriginal','#order');
        },

        createScriptLinks: function() {

          console.log('createScriptLinks');
          var taLinksEl = this.element.find('#links');//this.element.find('#scripts #links');
          var script = '';

          if (this.options.complexLinks) {
            script = taLinksEl.val();
          }

          // taLinksEl.val('');

          var ruleList = this.element.find('#filterrules .rule');
          ruleList.each((i,el)=> {
              var ruleEl = $(el);
              var errList = ruleEl.find('.errorvalue');
              if (!errList.length) {
                  var origin = ruleEl.data().origin;
                  var field = getValElement(ruleEl.find('.field'));
                  var oper = getValElement(ruleEl.find('.operation'));
                  var fieldName = field.split('.')[1];
                  var valueEl = ruleEl.find('.value');
                  var content = valueEl.children('*');
                  var value = '';
                  switch (content[0].tagName) {
                    case 'SELECT':
                      value = getValElement(content.eq(0));
                      break;
                    case 'INPUT':
                      value = getValElement(content.eq(0));
                      break;
                    case 'DIV':
                        // console.log('DIV',content);
                        var masterfield = content.find('[data-masterfield]').attr('data-masterfield');
                        // console.log('div',fieldName,masterfield);
                        value = getValElement(content.eq(0).find('[name="'+masterfield+'"]'));
                      break;
                    default:
                  }


                  if (value) {

                    var strRule = ' '+field+' '+oper+' '+value;

                    // console.log('check',(ruleEl.find('.checkbox').checkbox('check')))

                    if (! ruleEl.find('.checkbox').checkbox('check')) {
                      strRule = '/*'+strRule+'*/';
                    }



                    if (this.options.complexLinks) {
                      script = script.replace(origin,strRule)
                    }else{
                      if (script) { script = script+' &&'; };
                      script = script + strRule;
                    }

                  }
              }
          });
          taLinksEl.val(script);
         this.syncTA('toOriginal','#links');
        },

        genFeildCombobox:function(field) {
          var table = this.options.table;
          var fieldEL = $('<select class = "combobox field" value="'+field+'">');
          var fields = serviceData.conformDataBase.tables[table].fields
          for (var el in fields) {
            var opt = $('<option>');
            opt.attr({
              'value':this.options.table+'.'+el,
              'name':el
            }).text(serviceData.wordTranslate(el)[0]+' ('+el+')');
            fieldEL.append(opt)
          };
          return fieldEL;
        },

        addOrder:function (inField='',sort="ASC") {
          var mode = inField=='' ? 'writeScr' : 'onlyRule';
          var ordersEL = this.element.find('#sortorder');
          var orderEl = $('<div class = "order">');
          var fieldEL = this.genFeildCombobox(inField);
          var sortEl = $('<select class = "combobox sort" value = "'+sort+'">'+
                            '<option value = "ASC" class = "lang">ASC</option>'+
                            '<option value = "DESC" class = "lang">DESC</option>'+
                          '</select>');
          sortEl.translate()
          fieldEL.combobox();
          sortEl.combobox();
          var butdel = $('<button id = "btn_delete"><svg><use xlink:href="/file/ico/sprite.svg#close"></use></svg></button>');
          orderEl.append(fieldEL,sortEl,butdel);
          ordersEL.append(orderEl);
          fieldEL.change(()=>{ this.createScriptOrder();});
          sortEl.change(()=>{ this.createScriptOrder();});
          butdel.click(()=>{
            orderEl.remove();
            this.createScriptOrder();
          });
          if (mode=='writeScr') {
            this.createScriptOrder();
          }
        },

        addRule: function (inField='',inOper='',inVal='',origin='',active=true) {
          var mode = inField==''? 'writeScr': 'onlyRule';
          var rulesEL = this.element.find('#filterrules');
          var ruleEl = $('<div class = "rule">');
          ruleEl.data({'origin':origin});
          var table = this.options.table;
          var fieldEL = this.genFeildCombobox(inField);//$('<select class = "combobox field" value="'+inField+'">');
          var fields = serviceData.conformDataBase.tables[table].fields
          var links = serviceData.conformDataBase.tables[table].links;
          for (var el in links) {
            var opt = $('<option>');
            opt.attr({
              'value':el+'.'+links[el].field,
              'name':el
            }).text(serviceData.wordTranslate(el)[0]+' ('+el+')');
            fieldEL.append(opt);
          };

          if (inField) {
            if (fieldEL.find('[value="'+inField+'"]').length == 0) {
              var opt = $('<option>');
              var otherName = inField.split('.').slice(-1)[0];
              opt.attr({
                'value':inField,
                'name':inField
              }).text(serviceData.wordTranslate(otherName)[0]+' ('+inField+')');
              fieldEL.append(opt);
            }
          }


          var valueEl = $('<div class = "value">');

          function setEvChange(rootEl) {
            var valEl = rootEl.find('*').eq(0);
            if((valEl[0].tagName=='SELECT')||(valEl[0].tagName=='INPUT')){
              valEl.change((ev)=>{
                var elem = $(ev.target).closest('#filterset');
                elem.filterset('createScriptLinks');
              });
            }else if(valEl[0].tagName=='DIV'){
              valEl.eq(0).find('.selectionvalue').changeDiv((el)=>{
                // console.log('== changeDiv ==');
                var elem = $(el).closest('#filterset');
                elem.filterset('createScriptLinks');
              });
            }
          }

          function changeTypeField(ruleEl) {
            var valEl = ruleEl.find('.value');
            valEl.empty();
            var fielf = ruleEl.find('.field');
            var fieldName = fielf.attr('value');
            fieldName = fieldName.split('@').slice(-1)[0];

            var currTable = table;
            var tables = serviceData.conformDataBase.tables;



            var fnList = fieldName.split('.');
            var relTable = '';
            var typeObj = '';
            if (fnList.length==1) {
              fieldName = fnList[0];
              typeObj = tables[ currTable ].fields[ fieldName ].relatedObject;
            }else if (fnList.length==2) {
              fieldName =  fnList[1];
              if (table != fnList[0]) {
                relTable = fnList[0];

                currTable = fnList[0];
                // var relName = serviceData.conformDataBase.tables[relTable].primarykey;
                var relName = tables[ currTable ].primarykey;
                if (relName == fieldName ) {
                  typeObj = 'links';
                }else{
                  typeObj = tables[ currTable ].fields[ fieldName ].relatedObject;
                }
              }else {
                typeObj = tables[ currTable ].fields[ fieldName ].relatedObject;
              }
            }
            if (typeObj) {
              // var obj = serviceData.conformDataBase.tables[table][typeObj];
              var obj = tables[ currTable ][ typeObj ];
              if (typeObj == 'enumerations' ) {
                  var selectEl  = $('<select class = "combobox" value = "'+inVal+'">');
                  selectEl.attr('data-enumerations',obj[fieldName]);
                  valEl.append(selectEl);
                  selectEl.combobox();
              }else if (typeObj == 'links'  ){
                // var relName = serviceData.conformDataBase.tables[relTable].primarykey;
                var relName = tables[ currTable ].primarykey;

                valEl.append( setSelectionbox(relTable) ) ;
                valEl.find('[name="'+relName+'"]').text(inVal);

              } else if (typeObj == 'relations' ) {
                // relTable = serviceData.conformDataBase.tables[table].relations[fieldName];
                relTable =   tables[ currTable ].relations[fieldName];
                // console.log('currTable',currTable,'fieldName',fieldName,'inVal',inVal,'relTable',relTable);
                var relName = tables[ relTable ].primarykey;
                // console.log('relName',relName);
                valEl.append( setSelectionbox(relTable) ) ;
                valEl.find('[name="'+relName+'"]').text(inVal);
              }
            }else{
              // console.log('fieldName',fieldName);
              var type =   tables[ currTable ].fields[ fieldName ].type;
              if (type == 'datetime') {
                valEl.append($('<input class = "datetimebox" value = "'+inVal+'">'));
                setDatetimebox(ruleEl);
              }else{
                valEl.append($('<input type = "text" value = "'+inVal+'">'));
              }
            }
          }

          var checkBox = $('<div class="checkbox" value="">');

          var operEl = $('<select class = "combobox operation" value = "'+inOper+'">'+
                            '<option value = "=">=</option>'+
                            '<option value = "<>"><></option>'+
                            '<option value = ">">></option>'+
                            '<option value = "<"><</option>'+
                            '<option value = "LIKE">LIKE</option>'+
                          '</select>');
          var butdel = $('<button id = "btn_delete"><svg><use xlink:href="/file/ico/sprite.svg#close"></use></svg></button>');
          if (this.options.complexLinks) { butdel.addClass('disabled') };
          ruleEl.append(checkBox,fieldEL,operEl,valueEl,butdel);
          rulesEL.append(ruleEl);

          checkBox.attr('value', active ? 1 : 0 );
          checkBox.checkbox({
            useAttrValue: true,
            // checked: active,
            click: ()=>{
              // console.log('checkBox click');
              this.createScriptLinks();
            }
          });
          //.checkbox('option','checked',true)



          fieldEL.combobox();
          operEl.combobox();
          changeTypeField(ruleEl);
          if (mode=='writeScr') {
            this.createScriptLinks();
          }
          setEvChange(valueEl);
          fieldEL.change((event)=>{
            inVal = '';
            var el = $(event.target);
            changeTypeField(el.closest('.rule'));
            setEvChange(valueEl);
            this.createScriptLinks();
          });
          operEl.change((event)=>{
            this.createScriptLinks();
          });
          butdel.click(()=>{
            ruleEl.remove();
            this.createScriptLinks();
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
