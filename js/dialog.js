/*jshint esversion: 6 */

/////////////////// функции панели управления :

function open(currentEvent) {
  $('<div>').windialog({'currentEvent':currentEvent});
}


function getSizeElement(element) {
    var size = [];
    size.push(element.height());
    size.push(element.width());
    return size;
}

//============================================




;(function( $ ) {
    $.widget( "elementsControl.windialog", {
      options: {
        href:'',
        typedialog:'info',//'form','formJournal''selectItems'
        currentWindows:null,// оболочка окна созданная плагином dialog
        currentEvent:null,// для регистрации позиции источника
        offset:null,
        relationship:'',// селектор связанного елемента
        customScript: null,
        title:null,
        position:'custom',
        whenCloseWindow:function (){},
      },
      _create: function() {

        this.element.addClass('windialog');
        if (this.options.currentEvent) {
          var eventEl = $(this.options.currentEvent.currentTarget);
          this.options = Object.assign(
                  this.options,
                  getDataAttributes(eventEl));
        }

        $('body').append(this.element);
        var thisEl = $(this.element);
        // console.log('windialog',thisEl.width());
        var href = this.options.href;
        var param = {};
        var hrefOf = hreftoobject(this.options.href);
  			var typedialog = this.options.typedialog;
  			var val = '';
  			var path = hrefOf.path.replace('/','')
  														.replace('/','');
  			if (hrefOf.request) {
  				for (var key in hrefOf.request) {
  					if (hrefOf.request.hasOwnProperty(key)) {
  						if (hrefOf.request[key]) {
  							val = key+' '+hrefOf.request[key];
  						}
  					}
  				}
  			}
        var title = '';
        if (this.options.title) {
          title = this.options.title;

        }else{
          title = serviceData.wordTranslate(path)[0] +' '+val;

        }

        if (! $.trim(title)) {
          title = serviceData.wordTranslate(this.options.typedialog)[0];

        }

        param.title = title;
        param.width = 'auto';
        this.iniCustomScript();
        switch(this.options.typedialog) {
          case "info":
            param.close = function() {
              thisEl.dialog('destroy');
              thisEl.remove();
            };
            // param.position = [300,300];
            // delete param.width;
            break;

          case "error":
              param.close = function() {
                thisEl.dialog('destroy');
                thisEl.remove();
              };
              param.open = function() {
                var par = thisEl.parent();
                thisEl.addClass('winmess-err');
              };
              param.title = '';
              thisEl.prepend($('<p>ERROR</p>'));
            break;


          case 'form':
              var newForm = (href.indexOf('?new=')!=-1);
              var existingForms  = $('[data-win-ind="'+href+'"]');
              var openExistingForms = false;
              if (newForm) {
                  openExistingForms = false;
              }else{
                if (existingForms.length) {
                  openExistingForms = true;
                }
              }

              if (openExistingForms) {
                existingForms.dialog('open');
                this.destroy();
                this.element.remove();
                return 0 ;
              }else{
                  thisEl.attr('data-win-ind',href);
                  var currPreset = (eventEl.attr('data-preset')!=undefined) ? eventEl.attr('data-preset') : '';

                  var rowEl = eventEl.closest('.row');
                  thisEl.form({
                    preset: currPreset,
                    href: href,
                    relationshipElement: (rowEl.length > 0) ? rowEl : eventEl,
                    call: function() {
                        thisEl.dialog('open');
                        thisEl.ini();
                        thisEl.windialog('option','customScript').whenEndLoad();
                        thisEl.change(function(ev) {
                          thisEl.windialog('option','customScript').whenChanges($(ev.target));
                        });
                        // thisEl.windialog('setEventsForDiv');
                        thisEl.windialog('recountPosition');
                    },
                    whenCloseForm: thisEl.windialog('option','whenCloseWindow') ,
                  });
                  param.autoOpen= false;
                  param.open = function() {
                    thisEl.windialog('option','currentWindows',thisEl.parent());
                  };
                  param.close = function(){
                    thisEl.form('option','_lastButtonPressed','close');
                    thisEl.form('result');
                  };
                  this.setRequestHistory(title);

                  param.resizeStart = ()=>{ thisEl.find('.formtabs').addClass('allow-reduction'); }
                  param.resizeStop = ()=>{ thisEl.find('.formtabs').removeClass('allow-reduction'); }
              }
            break;


          case 'formJournal':
            var journalEl  = $('<div class = "journal">');

            // ============ load preset ==============
            var formName = eventEl.attr('data-path').split('/')[1];
            // var tableName = formName.replace('_list','');
            var numberPreset = eventEl.attr('data-preset');
            var preset = {
              // links: tableName+".is_deleted = 0",
              links: "is_deleted = 0",
            };


            if (eventEl.attr('data-links')) {
              preset.links = preset.links + " && "+eventEl.attr('data-links')
            }else{

              // console.log('formName',formName);
              if (formName in serviceData.presets) {
                var list = [];

                for (var el in serviceData.presets[formName]) {
                  list.push(Number(el));
                }
                var num = selectActualNumber(list,numberPreset);
                // console.log('List',list,num);
                if (Number(num)>0) {
                  preset = strToObject(serviceData.presets[formName][Number(num)].data);
                  // console.log('preset',preset);
                }
              }
            }




            if (eventEl.attr('data-countrows')) {
              preset.countrows = Number(eventEl.attr('data-countrows'));
            }
            journalEl.attr({
              'data-filters': eventEl.attr('data-filters'), // не используется
              'data-masterfield': eventEl.attr('data-masterfield'),
              'data-path': eventEl.attr('data-path'),
              'data-countrows': preset.countrows
            })
            this.element.append(journalEl);
            var data = hreftoobject(eventEl.attr('data-href'));
            data.request.countrows = preset.countrows;

            data.request.filter = {links: preset.links};


            if (preset.order) {data.request.filter.order = preset.order};

            var call = [function (input) {
              journalEl.loadСontent(input);
              thisEl.dialog('open');

              journalEl.journal({
                useControlPanel: eventEl.attr('data-usecontrolpanel')? $.parseJSON(eventEl.attr('data-usecontrolpanel')) : true,
                links : preset.links,
                order : preset.order,
                search :preset.search,
                preset: numberPreset ? numberPreset : ''
              });
              journalEl.ini();
              thisEl.find('.cp-in-search').focus();
              thisEl.windialog('recountPosition');
            }]
            data.request['pp'] = 'part';
            param.autoOpen= false;
            param.open = function() {
              thisEl.windialog('option','currentWindows',thisEl.parent());
            };
            param.close = function(){
              journalEl.journal('destroy');
              thisEl.dialog('destroy');
              thisEl.remove();
            };

            // трансформация в новы протокол ==============
            data.request.path = data.path;
            var out = [
                    {
                      'target':{
                          'module':'content',
                          'class': "Form",
                      },
                      'param': data.request
                    }
            ];

            mxhRequest(out,call);
            this.setRequestHistory(title);
            break;

          case 'settings':
            param.open = function() {
              thisEl.windialog('option','currentWindows',thisEl.parent());
              thisEl.ini();
              thisEl.windialog('recountPosition');
            };
          break;

          case 'selectItems':
            if (this.options.relationship) {
              var relEl = eventEl.siblings(this.options.relationship);
              if (relEl.length) {
                var paramEL = getDataAttributes(eventEl);
                // var tableName = eventEl.attr('data-path').split('/')[1].replace('_list','');
                // var addLink = tableName+".is_deleted = 0";
                var addLink = "is_deleted = 0";
                if (paramEL.links) {
                  if (paramEL.links.search(addLink)==-1) {
                    paramEL.links = paramEL.links+' && '+ addLink;
                  }
                }else{
                  paramEL.links = addLink;
                }

                paramEL.relationshipElement = relEl;
                paramEL.call =function () {
                  thisEl.windialog('recountPosition');
                  thisEl.parent().removeClass('hidden');
                }
                // console.log('selectItems',thisEl.width());
                thisEl.selectItems(paramEL);
                param.open = function() {
                  thisEl.parent().addClass('hidden');
                  thisEl.windialog('option','currentWindows',thisEl.parent());
                };
                param.close = function(){
                  thisEl.selectItems('result');
                }
              }
            }

            param.resizeStart = ()=>{ thisEl.find('#tab').addClass('allow-reduction'); }
            param.resizeStop = ()=>{ thisEl.find('#tab').removeClass('allow-reduction');}

            break;

          case 'handling':
            var href = eventEl.attr('data-href');
            var namescript = eventEl.attr('data-namescript');
            var handlingEl  = $('<div class  = "handling">');
            this.element.append(handlingEl);
            if (href) {
                var data = hreftoobject(href);
                let nameHandling = data.path.split('/');
                nameHandling = nameHandling[nameHandling.length-2];
                data.request.pp = "part";

                param.autoOpen= false;

                var call  = [
                  (input)=>{
                    handlingEl.loadСontent(input);
                    thisEl.windialog('option','currentWindows',thisEl.parent());
                    thisEl.dialog('open');
                    handlingEl.ini();
                    handlingEl[nameHandling]();
                    thisEl.windialog('recountPosition');
                  },
                ];

                // трансформация в новы протокол ==============
                data.request.path = data.path;
                var out = [
                        {
                          'target':{
                              'module':'content',
                              'class': "Form",
                          },
                          'param': data.request
                        }
                ];
                mxhRequest(out,call);
                this.setRequestHistory(title);
            }else if (namescript) {
              handlingEl[namescript]();
              param.open = function() {
                thisEl.windialog('option','currentWindows',thisEl.parent());
                thisEl.ini();
                thisEl.windialog('recountPosition');
              };
            }
            break;

          case 'frame':
            this.options.position = 'centre';
            var frame = null;
            frame = this.element.find('iframe');

            if (!frame.length) {
              if (this.options.href) {
                if (eventEl) {
                  param.title = eventEl.text();
                }else{
                  param.title = this.options.href;
                }

                frame = $('<iframe src = '+this.options.href+' ></iframe>');
                this.element.append(frame);
              }
            }



            frame.css({
              width:'100%',
              height:'100%'
            });
            param.resize = (ev, ui)=>{
                var bodyFrameEl = $(frame[0].contentDocument.body);
                bodyFrameEl.css({
                  width:'auto',
                  height:'auto'
                });
                frame.css({
                  width:'100%',
                  height:'100%'
                });
            }

            var homePage = null;
            frame.on('load',()=>{
              var heightCorr = 35;
              var bodyFrameEl = $(frame[0].contentDocument.body);
              if (!homePage) { homePage = frame[0].contentDocument.URL; }
              if (homePage != frame[0].contentDocument.URL) {
                var backEl = $('<a href="javascript:history.back()" class = "lang">back</a>')
                bodyFrameEl.prepend(backEl);
                heightCorr = 60;
              }
              bodyFrameEl.translate();

              // console.log(bodyFrameEl.height(),bodyFrameEl.width());

              frame.height(bodyFrameEl.height()+heightCorr);
              frame.width(bodyFrameEl.width()+30);
              thisEl.dialog('open');
              thisEl.windialog('recountPosition');
            });

            param.autoOpen = false;

            param.close = function() {
              thisEl.dialog('destroy');
              thisEl.remove();
            };



            break;
        }


        // корректировка позиции
        if (this.options.position == 'centre') {
          param.create = ()=>{
            thisEl.bind( "dialogdragstart",()=>{
              if (thisEl.windialog('option','position')=='centre') {
                var wind = thisEl.parent();
                var pos = wind.offset();
                pos.top = pos.top/2;
                pos.feft = pos.feft/2;
                wind.offset(pos);
                wind.css('transform','none');
              }
              thisEl.windialog('option','position','custom');
            });
          }
        }


        this.element.dialog(param);

        var titlebar = this.element.siblings('.ui-dialog-titlebar');
        titlebar.find('.ui-dialog-titlebar-close')
        .text('')
        .append($('<svg><use xlink:href="/file/ico/sprite.svg#close"></use></svg>'));
      },
      showDialog:function() {

      },

      setRequestHistory: function(title) {
        var li =$('<li class="histlink"><div class="link dialog">wert</div></li>');
        var curTarget = $(this.options.currentEvent.currentTarget);
        var attributes = curTarget.prop("attributes");
        var link = li.find('.dialog');
        link.text(title);
        $.each(attributes, function() {
          let  name= this.name.split('-')[0];
          if (name=='data') {
            link.attr(this.name,this.value)
          }
        });
        $('#reqhistory ul').prepend(li);
        li.ini();

        if (curTarget.parent().hasClass('histlink')) {
          curTarget.parent().remove();
        };
      },

      iniCustomScript:function () {
        var hrefObj = hreftoobject(this.options.href);
        var scriptName = hrefObj.path.split('/').join('');
        var script = {};
        jQuery.extend(true, script, window[scriptName]);
        if (!script) {script = {};}
        var mandatoryMethods = [
          'whenWinOpen','whenEndLoad','whenChanges',
        ]
        mandatoryMethods.forEach(function(el,i) {
          if (!(el in script)) {script[el] = function() {}};
        });
        script.element = $(this.element);
        if(!null){this.options.customScript = script;}
      },
      resizingInternalElements:function () {
        this.element.find('.formtabs').wintabs('tabsResize');
      },
      recountPosition:function() {
        // mode : custom | center
        // var correct_topleft = 50;
        // var correct_bottom = 15;
        var speedCorrector = 500;
        var sizePanel = 30;
        var pos ={}; // позиция окна
        var wind = this.options.currentWindows || this.element.parent();
        // setTimeout(tt,4000);
        // function tt() {
        //   // console.log('W:H',wind[0].clientWidth,wind[0].clientHeight);
        //   console.log('setTimeout');
        //   console.log('W:H',wind.width(),wind.height());
        // }
        //----------------------- new
        var visPartWindow = $(window);
        var scrollTop = visPartWindow.scrollTop(); // сдвиг скрола
        var scrollLeft = visPartWindow.scrollLeft();
        var windowHeight = visPartWindow.height();// размер видимой части
        var windowWidth= visPartWindow.width();

        if (!this.options.offset) {
          var posCur = {top:0,left:0};
          var x = 0;
          var y = 0;


          var curEvent = null;
          if (this.options.currentEvent) {curEvent = this.options.currentEvent;}
          if(!curEvent){ curEvent = window.event;}

          if (curEvent) {
            if(curEvent.pageX || curEvent.pageY){
                x = curEvent.pageX;
                y = curEvent.pageY;
            }else if(curEvent.clientX || curEvent.clientY){
                x = curEvent.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                y = curEvent.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
          }

          posCur = {top:y,left:x};



          var coordCenter = { top:0, left:0 };
          coordCenter.top = ((scrollTop+windowHeight)/2); // !!! возможно ошибка
          coordCenter.left = ((scrollLeft+windowWidth)/2); // !!! возможно ошибка
          var forWinCenterMode = {
            top: coordCenter.top-wind.height()/2,
            left: coordCenter.left-wind.width()/2
          };
          // проверка четверти экрана
          if ((posCur.top < coordCenter.top)&&(posCur.left < coordCenter.left)) {
            // top left
            pos = posCur;
          }else if ((posCur.top < coordCenter.top)&&(posCur.left > coordCenter.left)) {
            //top right
            pos.top = posCur.top;
            pos.left = posCur.left-wind.width();

          }else if ((posCur.top > coordCenter.top)&&(posCur.left > coordCenter.left)) {
            // bottom right
            pos.top = posCur.top-wind.height();
            pos.left = posCur.left-wind.width();
          }else if ((posCur.top > coordCenter.top)&&(posCur.left < coordCenter.left)) {
            // bottom left
            pos.top = posCur.top-wind.height();
            pos.left = posCur.left;
          }
          pos = corrector(pos)
          wind.offset(pos);

        }else { // если окно уже было открыто
          if (this.options.position=="custom") {
            wind.css({ transform: 'none' });
            pos = wind.offset();
            var finPos = corrector(pos);
            wind.animate({top:finPos.top,left:finPos.left},speedCorrector);
          }


        }

        function corrector(coord) {
          // углы
            var lt = coord;
            var rt = { top:coord.top, left:coord.left+wind.width()} ;
            var lb = { top:coord.top+wind.height(), left:coord.left} ;
            var rb = { top:coord.top+wind.height(),  left:coord.left+wind.width()};
            if (rb.top > (scrollTop+windowHeight)){
              lt.top = scrollTop+windowHeight - wind.height() -1;
            }
            if (rb.left > (scrollLeft+windowWidth)) {
              lt.left = scrollLeft+windowWidth-wind.width()-1;
            }
            if (lt.top < scrollTop) {
              lt.top = scrollTop+1 + sizePanel;
            }
            if (lt.left < scrollLeft) {
              lt.left = scrollLeft+1;
            }
            return(lt);
        }
        // для корректировки по центру
        if (this.options.position=='centre') {
          wind.css({
            top: '50%',
            left: '50%',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
          });
        }

        this.options.offset = wind.offset();



        // this.resizingInternalElements();
      },
      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      },
      get:function () {
        return this
      },
    });
  }( jQuery ) );



(function( $ ) {
    $.widget( "elementsControl.daterange",{
      options: {
        usePeriods:false,
        defaulPeriod: 'custom',
        dictPeriods:{}
      },

      _create: function() {
        if (this.element.attr('data-useperiods')){this.options.usePeriods = true;}

        this.element.append($(//'<div class "daterange">'+
        '<div >'+
          '<label class = "lang">from</label>'+
          '<input id = "startdate" type = "text"/>'+
        '</div>'+
        '<div>'+
          '<label class = "lang">to</label>'+
          '<input id = "enddate" type = "text"/>'+
        '</div>'//+
        //'</div>'
        ));

        this.loadRangeControl();
        if (this.options.usePeriods) {
          this.loadCombobox();
        }
      },

      loadCombobox:function() {
        var selectEl = $('<select id = "choose">');
        selectEl.append('<option value = "custom">--'+serviceData.wordTranslate('custom')[0]+'--</option>');
        for (var el in this.options.dictPeriods) {
          var optEl = $('<option>');
          var data = this.options.dictPeriods[el];
          optEl.attr('value',el).text( serviceData.wordTranslate(data.name)[0] +" "+data.startdate+" "+data.enddate);
          selectEl.append(optEl);
        }
        this.element.prepend(selectEl);
        selectEl.val(this.options.defaulPeriod).trigger("chosen:updated");
        this.setPeriodToRange();
        selectEl.change(()=>{
          this.setPeriodToRange();
          this.element.find('#enddate').change();
        });
      },

      setPeriodToRange: function () {
        var selectEL  = this.element.find('#choose');
        var val = selectEL.val();
        var inputList= this.element.find('#startdate,#enddate');
        if (val=='custom') {
          inputList.removeAttr('disabled');
        }else{
          inputList.prop('disabled',true);
          var data = this.options.dictPeriods[val];
          this.element.find('#startdate').val(data.startdate);
          this.element.find('#enddate').val(data.enddate);
        }
      },

      loadRangeControl:function () {
              this.valToElement();
              var inputList = this.element.find('#startdate, #enddate');
              for (var i = 0; i < inputList.length; i++) {
                inputList.eq(i).dateTimePicker(inputList.eq(i).data());
              }
              inputList.change(()=>{
                this.elemToValue();
              });
      },

      elemToValue: function() {
        var startdateEl = this.element.find('#startdate');
        var enddateEl = this.element.find('#enddate');
        var value = [];
        var startdate = startdateEl.val();
        var enddate = enddateEl.val();
        if ((startdate)&&(enddate)) {
            var y1 = new Date(startdate);
            var y2 = new Date(enddate);
            if (y1>y2) {
              alert('ERROR Date Range');
              this.valToElement();
            }else{
              value[0] = startdate;
              value[1] = enddate;
            }
          }else if (enddate) {
            value = [enddate];
          }else{
            value = [];
          }
        this.element.attr('value',JSON.stringify(value));
      },

      valToElement:function () {
        var startdateEl = this.element.find('#startdate');
        var enddateEl = this.element.find('#enddate');
        var value = [];
        try {
          value = JSON.parse(this.element.attr('value'));
        } catch (e) {
          value = [];
        }

        if (value.length==1) {
          let curDate = new Date();
          startdateEl.val(curDate.toISOString().substr(0, 10));
          enddateEl.val(value[0]);
        }
        if (value.length==2) {
          startdateEl.val(value[0]);
          enddateEl.val(value[1]);
        }
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
