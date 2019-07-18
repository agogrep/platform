/*jshint esversion: 6 */
;(function($){
	/* hoverIntent by Brian Cherne */
	$.fn.hoverIntent = function(f,g) {
		// default configuration options
		var cfg = {
			sensitivity: 7,
			interval: 100,
			timeout: 0
		};
		// override configuration options with user supplied object
		cfg = $.extend(cfg, g ? { over: f, out: g } : f );

		// instantiate variables
		// cX, cY = current X and Y position of mouse, updated by mousemove event
		// pX, pY = previous X and Y position of mouse, set by mouseover and polling interval
		var cX, cY, pX, pY;

		// A private function for getting mouse position
		var track = function(ev) {
			cX = ev.pageX;
			cY = ev.pageY;
		};

		// A private function for comparing current and previous mouse position
		var compare = function(ev,ob) {
			ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
			// compare mouse positions to see if they've crossed the threshold
			if ( ( Math.abs(pX-cX) + Math.abs(pY-cY) ) < cfg.sensitivity ) {
				$(ob).unbind("mousemove",track);
				// set hoverIntent state to true (so mouseOut can be called)
				ob.hoverIntent_s = 1;

				// console.log('compare',ob);
				return cfg.over.apply(ob,[ev]);
			} else {
				// set previous coordinates for next time
				pX = cX; pY = cY;
				// use self-calling timeout, guarantees intervals are spaced out properly (avoids JavaScript timer bugs)
				ob.hoverIntent_t = setTimeout( function(){
					// console.log('setTimeout');
					compare(ev, ob);
				} , cfg.interval );
			}
		};

		// A private function for delaying the mouseOut function
		var delay = function(ev,ob) {
			ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
			ob.hoverIntent_s = 0;
			return cfg.out.apply(ob,[ev]);
		};

		// A private function for handling mouse 'hovering'
		var handleHover = function(e) {
			// next three lines copied from jQuery.hover, ignore children onMouseOver/onMouseOut
			var p = (e.type == "mouseover" ? e.fromElement : e.toElement) || e.relatedTarget;
			while ( p && p != this ) { try { p = p.parentNode; } catch(e) { p = this; } }
			if ( p == this ) { return false; }

			// copy objects to be passed into t (required for event object to be passed in IE)
			var ev = jQuery.extend({},e);
			var ob = this;

			// cancel hoverIntent timer if it exists
			if (ob.hoverIntent_t) { ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t); }

			// else e.type == "onmouseover"
			if (e.type == "mouseover") {
				// set "previous" X and Y position based on initial entry point
				pX = ev.pageX; pY = ev.pageY;
				// update "current" X and Y position based on mousemove
				$(ob).bind("mousemove",track);
				// start polling interval (self-calling timeout) to compare mouse coordinates over time
				if (ob.hoverIntent_s != 1) { ob.hoverIntent_t = setTimeout( function(){
					// console.log('e.type == "mouseover" ');
					compare(ev,ob);
					// console.log('compare',ob);

				} , cfg.interval );}

			// else e.type == "onmouseout"
			} else {
				// unbind expensive mousemove event
				$(ob).unbind("mousemove",track);
				// if hoverIntent state is true, then call the mouseOut function after the specified delay
				if (ob.hoverIntent_s == 1) { ob.hoverIntent_t = setTimeout( function(){delay(ev,ob);} , cfg.timeout );}
			}
		};

		// bind the function to the two event listeners
		return this.mouseover(handleHover).mouseout(handleHover);
	};

})(jQuery);

// ========================== setting ================================

$(function(){

    var config = {
         sensitivity: 3, // number = sensitivity threshold (must be 1 or higher)
         interval: 200,  // number = milliseconds for onMouseOver polling interval
         over: doOpen,   // function = onMouseOver callback (REQUIRED)
         timeout: 200,   // number = milliseconds delay before onMouseOut
         out: doClose    // function = onMouseOut callback (REQUIRED)
    };

    function doOpen(ob) {
			// $('ul').each(function (i,el) {
			// 	console.log($(el).offset());
			// });

			$(this).addClass("hover");
			$('ul:first',this).css('visibility', 'visible');





				//'ul:first',

				if (ob.currentTarget.id=='winmanager') { loadManager(ob);}


				// if ($(this.parentNode).hasClass('sub_menu')) {
				// 	var thisEl = $(this);
				// 	var visPartWindow = $(window);
	      //   var scrollLeft = visPartWindow.scrollLeft();
	      //   var windowWidth= visPartWindow.width();
				// 	var osleft = thisEl.offset().left;
				// 	console.log(osleft);
				// 	if ((osleft+440) > (windowWidth+scrollLeft)) {
				//
				// 		thisEl.find('ul').css({left:'auto',
				// 		right: '98%',
				// 		// visibility: 'visible'
				// 	});
				// 	}else{
				// 		thisEl.find('ul').css({left:'98%', right: 'auto'});
				// 	}
				// 	// console.log();
				// }


    }

    function doClose() {
        $(this).removeClass("hover");
        $('ul:first',this).css('visibility', 'hidden');
    }

    $("ul.dropdown li").hoverIntent(config);
		$("ul.dropdown li ul li:has(ul)").find("a:first").append(" &raquo; ");
		$('.dropdown ul.sub_menu').mouseover(function(ev) {

				if (ev.target.nextElementSibling) {


					var thisEl = $(ev.target.nextElementSibling);
					thisEl.css({left:'',right: ''});
					var visPartWindow = $(window);
					var scrollLeft = visPartWindow.scrollLeft();
					var windowWidth= visPartWindow.width();
					var osleft = thisEl.offset().left;
					// console.log(osleft);

					var right = (osleft+(thisEl.width()*2)) - (windowWidth+scrollLeft);
					var left = osleft - scrollLeft - (thisEl.width()*2);
					// console.log('_0_',left,right);
					if ((right > 0) && (left > 0)) {
							thisEl.css({left:'auto',right: '98%'});
					}else if ((left < 0) && ( right < 0)){
							thisEl.css({left:'98%', right: 'auto'});
					}else if ((left < 0) && (right > 0)){
							right = (osleft+(thisEl.width()*1.5)) - (windowWidth+scrollLeft);
							left = osleft - scrollLeft - (thisEl.width()*0.5);
							// console.log('_1_',left,right);
							if ((right > 0) && (left > 0)) {
									thisEl.css({left:'auto',right: '50%'});
							}else if ((left < 0) && ( right < 0)){
									thisEl.css({left:'50%', right: 'auto'});
							}else if ((left > 0) && ( right < 0)){
									thisEl.css({left:'50%', right: 'auto'});
							}
							// thisEl.css({left:'30%', right: 'auto'});
					}else if ((left > 0) && (right < 0)){
							thisEl.css({left:'98%', right: 'auto'});
					}
				}
		});
// $('ul').each(function (i,el) {
// 	console.log($(el).offset());
// });

});


function loadManager(ob) {
		var stackEl  = $(ob.currentTarget).children('ul.sub_menu');
		var li ='<li class="winlink"><div class="link windialog"></div></li>';
		// console.log('mousemove',ob.currentTarget.id);
		stackEl.children('li.winlink').remove();
		var winDialList = $('body .windialog');
		winDialList.each((i,el)=>{
			// $(li).data({windowElement:el});
			var winEl = $(el);
			var liEl = $(li);
			stackEl.append(liEl);

			liEl.find('.windialog').text(winEl.dialog('option','title'))
														.click(()=>{
																winEl.dialog('open');
															})
		})
}

function control(line) {
	$('html,body').addClass('waiting-indicator');
	var call = [
			(input)=>{
				if ($.trim(input)) {
					console.log(input[0].content);
				}else{
					alert('DONE');
				}
				$('html,body').removeClass('waiting-indicator');
			}
		];

	var out = [
		  {
		    'target':{
		        'module':'serverman',
		        'class': "Control",
		    },
		    'param':{
					_line: line
				}
		  }
		];
	mxhRequest(out,call);
}

$('#webreboot, #systemreboot').click((ev)=>{
	var el = $(ev.target);
	control(el.data().line);
});


function iniSettingsPanel() {
	var lnkMainSet = $('#lnk_main_set');
	lnkMainSet.click(()=>{
		var panelEl = $('<div id = "lnk_main_setpanel_set">');
		panelEl.setpanel();

	});
}





;(function( $ ) {
    $.widget( "elementControl.setpanel",{
      options: {
				languages:[]
      },
      _create: function() {
					var thisEl = this.element;
					var out = [ { 'target':{ 'module':'content', 'class': "Profile", },
					    		'param':{ _line: 'availableLanguages' } } ];
					var call = [
						(input)=>{
								thisEl.setpanel('option','languages',input[0].content);
								thisEl.setpanel('start');
								thisEl.windialog({
									title: serviceData.wordTranslate('setting_panel')[0]
								});
								thisEl.ini();
						}
					];
				mxhRequest(out,call);
      },

			start:function() {
					var currLang = $.cookie('cl');
					var selectEl = $('<select>');
					selectEl.attr({
						class: 'autolabel combobox',
						name:  serviceData.wordTranslate('change_language')[0],
						value: currLang
					});
					this.options.languages.forEach((el,i)=>{
						var oplionEl = $('<option>');
						oplionEl.attr('value', el).text(serviceData.wordTranslate(el)[0]);
						selectEl.append(oplionEl);
					});
					this.element.append(selectEl);

					selectEl.change((ev)=>{
						var out = [ { 'target':{
												'module':'content',
												'class': "Profile",
											},
						    			'param':{
													_line: 'setParam',
													language: selectEl.val()
												}
											}
										];
						var call = [(input)=>{
							serviceData.remove();
				      location.assign(location.href);
						}];
						$('html,body').addClass('waiting-indicator');
						mxhRequest(out,call);
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
