/*jshint esversion: 6 */


function objectToStr(object) {
  var out = JSON.stringify(object);
  return out;
}


function strToObject(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null
  }
}



(function( $ ) {
  $.widget( "elementsControl.schedule", {
    options: {
      relclass: '',
      timing : {
          years:  [],
          months: [],
          days :  [],
          dateList : [],
          dateRange : []
        },
      JourOptions : {
        useCorrectColumns:false,
        useColumnSizeMemory:false,
        countrows: 8,
        order:'edate',
        sel_fields:'eid, edate, priority',
        CPAttr:{
            masterfield:'eid',
            path:'/events_list/',
          }
      },
      formElement: null,
      whenApply:function() {}
    },

    _create: function() {
      var scheduleFeild  = this.element.find('[name=schedule]');
      if (scheduleFeild.val()) {
        var timingOrg = scheduleFeild.val();
        timingOrg = strToObject(timingOrg);
        if (timingOrg) {
          this.options.timing = timingOrg;
        }
      }
      this.options.relclass = this.element.attr('data-relclass');
      // console.log('relclass',this.options.relclass);
      let scheduleEl = $('<div id="schedule">'+
                   '<div id="years">'+
                      '<div class = "period">'+
                        '<div>'+
                          '<label class = "lang flup">period_from</label>'+
                          '<input id = "startdate" class = "datetimebox" type = "text"/>'+
                        '</div>'+
                        '<div>'+
                          '<label class = "lang">to</label>'+
                          '<input id = "enddate" class = "datetimebox" type = "text"/>'+
                        '</div>'+
                      '</div>'+
                      '<div class="delimiter"></div>'+
                      '<div id = "listyears" class = "listbox" ></div>'+
                   '</div>'+
                   '<div id="months" class = "listbox">'+
                   '<label class = "lang flup">months</label>'+
                   '</div>'+
                   '<div id="days">'+
                     '<div id= choicemode>'+
                        '<label for="week" class = "lang">day_week</label>'+
                        '<input id  = "week" name = "group" type = "radio" value = "week"/>'+
                        '<label for="month" class = "lang" >day_month</label>'+
                        '<input  id  = "month" name = "group" type = "radio" value = "month" />'+
                     '</div>'+
                     '<div class="delimiter"></div>'+
                     '<div id = "tableday"></div>'+
                   '</div>'+
                   '<div class="delimiter"></div>'+
                   // '<button id="bt-generete">generate events</button>'+
                   '<div class="delimiter"></div>'+
                '</div>')
      this.element.find('#generator').append(scheduleEl);
      let years = scheduleEl.find('#years');
      years.find('#startdate, #enddate').change(()=>{
        if (this.formToDateRange()) {
          this.listOutputYears();
        }
      });
      this.dateRangeToForm();
      this.listOutputYears();
      let months = scheduleEl.find('#months');
      let mn = $('<div class = "value-box" >'+
                  '<div name ="month" class = "inscription"></div>'+
                '</div>');
      for (let i = 1; i <= 12; i++) {
        let mnEl = mn.clone();
        mnEl.find('[name=month]').text(i);
        months.append(mnEl);
        mnEl.attr('value',String(i))
        if (this.options.timing.months.indexOf(i)>=0) {
            mnEl.checkrow({'checked':true});
        }else{
            mnEl.checkrow({'checked':false});
        }
      }
      if (this.options.timing.days.length) {
        if (Array.isArray(this.options.timing.days[0])) {
          this.addDayWeek();
          scheduleEl.find('#week').attr('checked','checked');
        }else{
          this.addDayMonths();
          scheduleEl.find('#month').attr('checked','checked');
        }
      }else{
        this.addDayMonths();
        scheduleEl.find('#month').attr('checked','checked');
      }
      scheduleEl.find("#choicemode input").click((el)=>{
        let choiceId = $(el.target).attr('id');
        if (choiceId=='week') {
            this.addDayWeek();
        }else{
            this.addDayMonths();
        }
      });
      // scheduleEl.find("#bt-generete").click(()=>{
      //   this.apply();
      // });
      var eventsEl = this.element.find('#events');
      eventsEl.journal(this.options.JourOptions);


      var moreEl = $( '<p class = "link lang"'+
           'data-typedialog = "formJournal"'+
           'data-href="/events_list/?id=0"'+
           'data-filters = "allFields,"'+
           'data-masterfield = "eid"'+
           'data-path = "/events_list/"'+
           'data-countrows = 10 >more_</p>');
      moreEl.attr('data-links','events.relclass = '+this.options.relclass+
      ' && events.relid = '+this.options.formElement.form('option','id'));


      var thisEl = this.element;
      this.options.formElement.form('option','beforeSaving',()=>{
        thisEl.schedule('apply');
      });

      moreEl.click((currentEvent)=>{
        // eventsEl
        open(currentEvent);
      });
      eventsEl.append(moreEl);
      this.element.wintabs();
      this._iniClick(this.element.find('#months .value-box, #days .value-box'));
      scheduleEl.changeDetect('set');
    },

    _setOption: function( key, value ) {
      switch( key ) {
        case "---":
          break;
        case '----':
          break;
        case '----':
          break;
      }
      $.Widget.prototype._setOption.apply( this, arguments );
      this._super( "_setOption", key, value );
    },

    apply:function () {
      var scheduleEl = this.element.find('#schedule');
      // scheduleEl.changeDetect();
      // console.log('data-hash',scheduleEl.attr('data-hash'));
      // if (scheduleEl.hasClass('turn')) {
        var names = ['years','months','days']
        names.forEach((nm,i)=>{
          this.options.timing[nm] = [];
          var listEl = this.element.find('#'+nm+' .ec-row-selected');
          listEl.each((i,el)=>{
            this.options.timing[nm].push(JSON.parse($(el).attr('value')));
          });
        });
        var schParam = this.options.timing;
        var formElement = this.options.formElement;
        var eventJourEl = this.element.find('#events');

        var thisEl = this.element;
        formElement.find('[name=schedule]').val(objectToStr(schParam));
        var timing = this.options.timing;
        function whenSevedForm() {
          scheduleEl.changeDetect();
          if (scheduleEl.hasClass('turn')) {
            if (formElement.form('option','status')=='DONE') {
              schParam._line = 'set';
              schParam.relclass = thisEl.schedule('option','relclass');
              schParam.relid = formElement.form('option','id');
              schParam.priority = 0;
              eventJourEl.journal('option','links',
              'relclass = '+thisEl.schedule('option','relclass')+
              ' && relid = '+formElement.form('option','id'));
              var call = [
                function() {
                  // try {
                    thisEl.wintabs('option','active',1);
                    eventJourEl.journal('applyFilter',1);
                    scheduleEl.changeDetect('set');
                  // } catch (e) { }

                }
              ];
              timing['_line'] = 'set';
              var out = [
                {
                  'target':{
                      'module':'serverman',
                      'class': "Event",
                  },
                  'param': timing
                }
              ];
              mxhRequest(out,call);
            }
          }

        };
        formElement.form('option','whenSevedForm',whenSevedForm);
        // formElement.form('save');
      // }

    },

    delete:function() {

      // var eventJourEl = this.element.find('#events');
      var formElement = this.options.formElement;

      var out = [
        {
          'target':{
              'module':'serverman',
              'class': "Event",
          },
          'param': {
            'relclass': thie.options.relclass,
            'relid':formElement.form('option','id'),
          }
        }
      ];
      var call = [
        // (input)=>{
        //   eventJourEl.journal('applyFilter',1);
        // }
      ];
      mxhRequest(out,call);
    },

    addDayMonths:function () {
      let table = this.element.find('#tableday');
      let days = this.element.find('#days');
      table.empty();
      table.addClass('month').removeClass('week');
      var daysList = this.options.timing.days;
      for (var d = 1; d <= 7; d++) {
        let row = $('<tr>');
        table.append(row);
        for (var w = 1; w <= 5; w++) {
          let val = ((w-1)*7)+d ;
          let cell = $('<td>');
          row.append(cell);
          if (val>31) {
            val = (val - 32)*-1;
          }
          let day = $('<div class = "inscription">');
          cell.attr('value',String(val));
          cell.append(day.text(val));
          if (daysList.indexOf(val)>-1) {
            cell.checkrow({'checked':true});
          }else{
            cell.checkrow({'checked':false});
          }
        }
      }
      this._iniClick(this.element.find('#tableday td'));
    },

    addDayWeek:function () {
      let table = this.element.find('#tableday');
      let days = this.element.find('#days');
      table.empty();
      table.addClass('week').removeClass('month');
      var daysSting = JSON.stringify(this.options.timing.days);
      let dayNames = ['Monday', ' Tuesday','Wednesday','Thursday',
        'Friday','Saturday','Sunday'];
      for (var i = 0; i < dayNames.length; i++) {
        dayNames[i] = serviceData.wordTranslate(dayNames[i])[0];
      }
      for (var d = 0; d <= 7; d++) {
          let row = $('<tr>');
          table.append(row);
          let name = $('<td>');
          if (d>0) {
            name.append($('<label>').text(dayNames[d-1]));
          }
          row.append(name);
          for (var w = 1; w <= 4; w++) {
            let cell = $('<td>');
            row.append(cell);
            if (d==0) {
              cell.text(w);
            }else{
              let val = '['+w+','+d+']';
              cell.attr('value',val);
              let trueVal = daysSting.indexOf(val);

              if (trueVal>-1) {
                cell.checkrow({'checked':true});
              }else{
                cell.checkrow({'checked':false});
              }

            }
          }
      }
      days.append(table);
    },

    dateRangeToForm: function() {
      let startdateEl = this.element.find('#startdate');
      let enddateEl = this.element.find('#enddate');
      if (this.options.timing.dateRange.length==1) {
        let curDate = new Date();
        startdateEl.val(curDate.toISOString().substr(0, 10));
        enddateEl.val(this.options.timing.dateRange[0]);
      }
      if (this.options.timing.dateRange.length==2) {
        startdateEl.val(this.options.timing.dateRange[0]);
        enddateEl.val(this.options.timing.dateRange[1]);
      }
    },

    formToDateRange: function() {
      var startdate = this.element.find('#startdate').val();
      var enddate = this.element.find('#enddate').val();
      if ((startdate)&&(enddate)) {
        var y1 = new Date(startdate);
        var y2 = new Date(enddate);
        if (y1>y2) {
          alert('ERROR Date Range');
          return false
        }else{
          this.options.timing.dateRange[0] = startdate;
          this.options.timing.dateRange[1] = enddate;
          return true
        }
      } else{
          return false
      }
    },

    listOutputYears: function() {
      var dateRange =[];
      for (var i = 0; i < this.options.timing.dateRange.length; i++) {
        dateRange.push(new Date(this.options.timing.dateRange[i]));
      }
      if (dateRange.length==0) {
        var curDate = new Date();
        var newDate = new Date();
        dateRange[0] = curDate;
        newDate.setFullYear(curDate.getFullYear()+1);
        dateRange[1] = newDate;
      }
      var y1 = null;
      var y2 = null;
        if (dateRange.length==1) {
            y1 = new Date();
            y2 = dateRange[0];
        }else{
          y1 = dateRange[0];
          y2 = dateRange[1];
        }
        var countYears = Number(y2.getFullYear())- Number(y1.getFullYear());
      var listyears = this.element.find('#listyears');
      listyears.empty();
      listyears.append($('<label class ="lang">years</label>'));
      var yr = $('<div class = "value-box" >'+
                  '<div name ="year" class = "inscription"></div>'+
                '</div>');
      for (var i = 0; i <= countYears; i++) {
        var y = Number(y1.getFullYear()+i);
        var yrEl = yr.clone();
        yrEl.find('[name=year]').text(y);
        yrEl.attr('value',y);
        listyears.append(yrEl);
        if (this.options.timing.years.indexOf(y)>=0) {
            yrEl.checkrow({'checked':true});
        }else{
            yrEl.checkrow({'checked':false});
        }
      }
      this._iniClick(this.element.find('#listyears .value-box'));
    },

    _iniClick:function(rootElements) {
      rootElements.click((el)=>{
        if ($(el.target).attr('type')!='checkbox') {
          $(el.currentTarget).checkrow('toggle'); //.closest(".value-box")
        }
      });
    },

    destroy: function() {
      $.Widget.prototype.destroy.call( this );
    }
  });
}( jQuery ) );
