/*jshint esversion: 6 */

(function( $ ) {
    $.widget( "elementsControl.report", {
      options: {
        relationshipElement: $(''),
        messageElement: null,
        currReport: null,
        saveBoxEl: null,
        reportName: '',
        enableAutoUpd:false,
        timeoutAutoUpd:1000*60*2,
        setTA : null, // текущее значение setTimeout
        whenSend:function() {},
        whenReceived:function() { },
      },
      _create: function() {
        this.element.addClass('allow-reduction');

        var bodyEl = $(
          '<ul id = "switchpanel">'+
            '<li><a href="#tabs_set" class = "lang">settings</a></li>'+
            '<li><a href="#tabs_mass" class = "lang" >message</a></li>'+
          '</ul>'+
          '<div id = "tabs_set">'+
            '<div id = "savebox"></div>'+
            '<div  class = "selectionbox">'+
              '<div id = "btn-report" type="button" '+
                        'class = "dialog button-select" '+
                         'data-typedialog = "selectItems" '+
                         'data-choicemode = "one" '+
                         'data-masterfield = "rsid" '+
                         'data-path = "/reportscripts_list/" '+
                         'data-countrows =  8 '+
                         'data-links = "" '+
                         'data-relationship = "#report" >'+
                         '<svg><use xlink:href="/file/ico/sprite.svg#three-point"></use>'+
                       '</div>'+
              '<div class = "selectionbox-label lang flup">report</div>'+
              '<div id = "report" class = "selectionvalue" >'+
               '<div class = "row">'+
                 '<div name="rsid" class="main"></div>'+
                 '<div class = "reportname" name = "sysname" ></div>'+
               '</div>'+
             '</div>'+
            '</div>'+
            '<textarea class="main reportparam" placeholder="rparam" name="rparam"></textarea>'+
            '<div id = "parambox" ></div>'+
            '<button id = "btn_send" class = "lang" >send</button>'+
          '</div>'+
          '<div id = "tabs_mass">'+
            '<div id = "control_bar">'+
              '<label id = "info_label" style="padding: 6px">scriptName presetName</label>'+
              '<button id = "btn_update" class = "ico_sprite_refresh ripple"><svg><use xlink:href="/file/ico/sprite.svg#refresh"></use></svg></button>'+
              '<button id = "btn_openset" class = "ico_sprite_option"><svg><use xlink:href="/file/ico/sprite.svg#option"></use></svg></button>'+
            '</div>'+
            '<div class = "delimiter"></div>'+
            '<div id = "reportmessage"></div>'+
          '</div>'
        );


        var loadFrom = 'preset';

        // если в форме есть данные - загрузка из формы, если нет - из пресета
        var selValEl = this.element.find('.selectionvalue');
        var repParamEl = this.element.find('.reportparam');
        if ((selValEl.length)&&(repParamEl.length)) {
            bodyEl.find('.selectionvalue').replaceWith(selValEl);
            bodyEl.find('.reportparam').replaceWith(repParamEl);
            loadFrom = 'form';
            var rsid = selValEl.find('[name=rsid]').text();
            var sysname =  selValEl.find('[name=sysname]').text();
            // console.log('selValEl',rsid,sysname);
            if (rsid&&sysname) {
              this.options.reportName = sysname+'('+rsid+')';
            }
        }
        this.element.text('');

        this.element.append(bodyEl);


        this.element.wintabs();
        this.element.ini();

        var elParam = this.element.data();
        if (!this.options.reportName) {
          this.options.reportName = elParam.class ? elParam.class : '' ;
        }
        var currentPreset = ''
        if (loadFrom == 'preset') {
          currentPreset = elParam.preset ? Number(elParam.preset) : 0;
        }else if (loadFrom == 'form') {
          currentPreset = '';
        }

        // console.log('reportName' ,this.options.reportName );

        if (!this.options.messageElement) {this.options.messageElement = this.element.find('#reportmessage');}

        this.options.saveBoxEl = this.element.find('#savebox');
        this.options.saveBoxEl.preset({
          width:283,
          className: this.options.reportName,
          currentPreset: currentPreset,
        });




        this.options.saveBoxEl.find('select').change(()=>{
          // console.log('saveBoxEl whenChanges');
          var nameScript = complexNameToObject(this.options.reportName).name;
          this.element.find('#info_label').text(this.options.saveBoxEl.preset('option','name'));
        });



        if (loadFrom == 'preset') {


          var reportNameObj = complexNameToObject(elParam.class);
          this.element.find('[name=sysname]').text(reportNameObj.name);
          this.element.find('[name=rsid]').text(reportNameObj.app);
          this.element.find('.reportparam').text(this.options.saveBoxEl.preset('option','data'));

        }else if (loadFrom == 'form') {


        }

        // if (! this.options.currReport) {}

        this.openScript();

        this.element.find('.selectionvalue').changeDiv(el=> {
          this.openScript();
          this.options.saveBoxEl.preset('option','className',this.options.reportName);
          this.options.saveBoxEl.preset('loadPresets');
          this.element.find('.reportparam').text(this.options.saveBoxEl.preset('option','data'));
        });



        var thisEl = this.element;
        this.element.find('#btn_send,#btn_update').click(function(){
          thisEl.wintabs('option','active',1);

          thisEl.report('option','whenSend')();
        });
        this.element.find('#btn_openset').click(()=>{
          this.openSet();
        });
        this.element.wintabs('option','active',1);
        this.openSet(); // при первой загрузке скрывает окно настроек
        this.autoUpdate(this.element);
      },


      autoUpdate:function(thieEl) {
        if (thieEl.report('option','enableAutoUpd')) {
          thieEl.report('option','currReport')[thieEl.report('option','reportName')]('send');
          function upd() {
              thieEl.report('autoUpdate',thieEl);
          };
          thieEl.report('option','setTA',setTimeout( upd, thieEl.report('option','timeoutAutoUpd') )) ;
        }else{
          clearTimeout(thieEl.report('option','timeoutAutoUpd'));
        }
      },
      send:function () {
        this.options.currReport[complexNameToObject(this.options.reportName).name]('send');
      },
      openScript: function () {
        var nameScript  ='';
        var sysname = this.element.find('[name="sysname"]').text();
        var rsid = this.element.find('[name="rsid"]').text();
        this.options.reportName = nameToComplexName(sysname,rsid);
        if (this.options.reportName) {
          try {
            this.options.currReport = this.element.find('#parambox');
  // start report script by name
            nameScript  = complexNameToObject(this.options.reportName).name;
            this.options.currReport[nameScript]({
              relationshipElement: this.element.find('.reportparam'),
              saveBoxEL: this.options.saveBoxEl,
              messageElement: this.options.messageElement,
              whenReceived:this.options.whenReceived
            });
            var thisEl = this.element;
            this.options.whenSend = function (){
              thisEl.report('option','currReport')[nameScript]('send','whenSend');
              // thisEl.find('#info_label').text(nameScript+' '+thisEl.report('option','saveBoxEl').preset('option','name'));
            };
          } catch (e) {
          }
          this.element.find('#info_label').text(this.options.saveBoxEl.preset('option','name'));
        }
      },
      openSet:function () {
        var switchpanelEl = this.element.find('#switchpanel');
        if (switchpanelEl.hasClass('hidden_title')) {
          this.element.wintabs('option','active',0);
        }
        switchpanelEl.toggleClass('hidden_title');
      },

      _setOption: function( key, value ) {
        $.Widget.prototype._setOption.apply( this, arguments );
        this._super( "_setOption", key, value );
        try {
          this.options.currReport[complexNameToObject(this.options.reportName).name]('option',key,value);
        } catch (e) { }

      },

      destroy: function() {
        $.Widget.prototype.destroy.call( this );
      }
    });
  }( jQuery ) );
