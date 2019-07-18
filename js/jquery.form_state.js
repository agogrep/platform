/**контроль за формой
 *
 */
(function($) {
	var methods = {
		/**
		 *initialization
		 * @param {Object} options
		 * @returns {jQuery}
		 */
		init: function(options) {
			var settings = $.extend({
				insert_in_form: 1,
				input_name: 'changed_state',
				exclude: [],
				debug_mode: 0,
				ignore: null,
				if_changed: function() {
					return true;
				},
				save_state_history: 1,
				state_history_length: 10,
				controlling_attr: 'name',
				onAddField: null,
				onChange: null
			}, options);

			this.state_form('init_state', settings);

			return this;
		},
		/**
		 * initialization first states
		 * @param {Object} settings
		 */
		init_state: function(settings) {
			this.each(function() {
				var $this = $(this);
				$this.submit($this.state_form('on_submit', settings));
				$this.data({
					settings: settings
				});

				var els = $(':input', $this).not('[type="button"],[type="submit"]');
				if(settings.ignore)
				{
					els = els.not(settings.ignore);
				}

				els.each(function() {
					var $$this = $(this);
					$this.state_form('add_field', $$this, settings);
				});
			});
		},
		/**
		 * add field to controlling set
		 * @param {string|object} field jquery selector or jquery object or html object
		 * @param {type} settings object or undefined
		 * @returns {undefined}
		 */
		add_field: function(field, settings){

			var $this = $(field);
			settings = settings || this.state_form('get_settings');

			if(!settings || $this.data('state'))
			{
				return;
			}

			var tmp = {
				state: {
					element_name: null,
					first_val: null,
					raw_text_first: null,
					curent_val: null,
					raw_text_last: null,
					selected: false
				}
			};

			$this.state_form('set_value', tmp, settings);
			$this.state_form('set_name', tmp, settings);
			/**@todo какая-то магия вешать обработчик на change, что бы вызвать свой триггер,
			 * надо подумать как от этого уйти*/
			$this.change($this.state_form('call_change'));
			$this.on('state_form.change', $this.state_form('change_state'));
			if(settings.onChange)
			{
				//биндим контекст
				$this.on('state_form.change', settings.onChange.bind($this));
			}

			$this.data(tmp);

			if(settings.onAddField)
			{
				settings.onAddField($this);
			}
		},
		/**
		 * remove field from controlling set
		 * @param {string|object} field jquery selector or jquery object or html object
		 * @returns {undefined}
		 */
		remove_field: function(field){
			var $this = $(field);
			$this.removeData('state');
			$this.off('state_form.change');
			/**@todo  удалить только назначенный плагином обработчик не получается ни одним из способов
			 * $this.off('change', '**', $this.state_form('call_change'));
			 * $this.unbind('change', $this.state_form('call_change'));
			 * никакого эффекта не дают поэтому пойдём тёмным путём*/
			var ev = $._data($this[0], "events");
			var h = $this.state_form('call_change').toString();
			if(ev.change)
			{
				for(var i in ev.change)
				{
					if(isNaN(i))
					{
						continue;
					}
					if(ev.change[i].handler.toString() === h)
					{
						delete ev.change[i];
						ev.change.length--;
						break;
					}
				}
			}

			$this.removeAttr('data-state-is_changed');
		},
		/**
		 * set name for field
		 * @param {Object} tmp
		 * @param {Object} settings
		 * @returns {void}
		 */
		set_name: function(tmp, settings) {
			if(void 0 !== this.attr(settings.controlling_attr))
			{
				if(settings.debug_mode)
				{
					var count = $('[' + settings.controlling_attr + '="' + this.attr(settings.controlling_attr) + '"]').size();
					if(count > 1)
					{
						window.console.warn('Внимание: атрибут ' + settings.controlling_attr + ' найден у более чем одного элемента');
						window.console.debug(this);
					}
				}

				tmp.state.element_name = this.attr(settings.controlling_attr);
			}
			else if(void 0 !== this.attr('id'))
			{
				tmp.state.element_name = this.attr('id');
			}
			else
			{
				if(settings.debug_mode)
				{
					window.console.warn('Внимание: у элемента нет имени! (WARNING: element has no name!)');
					window.console.debug(this);
				}
			}
		},
		/**
		 * set value for field
		 * @param {Object} tmp
		 * @param {Object} settings
		 * @returns {void}
		 */
		set_value: function(tmp, settings) {
			var _this = this[0];
			switch(_this.tagName)
			{
				case 'INPUT':
					if(_this.type == 'checkbox' || _this.type == 'radio')
					{
						if(void 0 !== this.attr('value'))
						{
							if(_this.type != 'radio')
							{
								if(this.is(':checked'))
								{
									tmp.state.first_val = this.val();
								}
							}
							else
							{
								if(this.is(':checked'))
								{
									tmp.state.selected = true;
								}
								tmp.state.first_val = this.val();
							}
						}
						else
						{
							tmp.state.first_val = this.is(':checked');
						}
					}
					else if (void 0 === this.attr('value'))
					{
						if(settings.debug_mode)
						{
							window.console.warn('Внимание: у элемента нет атрибута value! (WARNING: element has no attr value!)');
							window.console.debug(_this);
						}
					}
					else
					{
						tmp.state.first_val = this.val();
					}

					break;
				case 'TEXTAREA':
					tmp.state.first_val = this.val();
					break;
				case 'SELECT':
					tmp.state.first_val = this.val();
					tmp.state.raw_text_first = this.find('option:selected').text();
					break;
			}
		},
		/**
		 * call on form submit
		 * @param {Object} settings
		 * @returns {Function}
		 */
		on_submit: function(settings) {
			return function() {
				var $this = $(this);
				if($this.state_form('is_changed'))
				{
					if(settings.insert_in_form)
					{
						var input = $('<input type="hidden" name="' + settings.input_name + '">');
						$this.append(input);
						input.val(JSON.stringify($this.state_form('get_changes')));
					}
					else
					{
						$('input[name="changed_state"]', $this).remove();
					}

					return settings.if_changed.call($this);
				}

				return true;
			};
		},
		/**
		 * check changes
		 * @returns {Boolean}
		 */
		is_changed: function() {
			return (this.state_form('get_changes').length ? true : false);
		},
		/**
		 * returns changes array
		 * @returns {Array}
		 */
		get_changes: function() {
			var changes = [];
			var opt = this.data().settings;
			if(opt)
			{
				$('[data-state-is_changed]', this).each(function() {
					var d = $(this).data().state;
					if($.inArray(d.element_name, opt.exclude) === -1)
					{
						changes.push(d);
					}
				});

				//отдельно обрабатываем скрытые поля
				//так как change у них не произойдёт
				//и исключаем те, у которых он вызван руками
				$('input[type="hidden"]', this).not('[data-state-is_changed]').each(function() {
					var $this = $(this);
					var d = $this.data();
					if(typeof d === 'object' && d.hasOwnProperty('state'))
					{
						var data = d.state;
						if($.inArray(data.element_name, opt.exclude) === -1)
						{
							if(data.first_val != $this.val())
							{
								changes.push(data);
							}
						}
					}
				});
			}

			return changes;
		},
		call_change: function(){
			return function(){
				$(this).trigger('state_form.change');
			};
		},
		/**
		 * call on event change control
		 * @returns {Function}
		 */
		change_state: function() {
			return function() {
				var $this = $(this);
				var data = $this.data();
				var val = $this.val();

				if(this.type == 'checkbox' || this.type == 'radio')
				{
					if($this.is(':checked') && void 0 !== $this.attr('value'))
					{
						data.state.curent_val = val;
					}
					else
					{
						data.state.curent_val = val =  $this.is(':checked');
					}
				}
				else
				{
					data.state.curent_val = val;
					if(this.tagName == 'SELECT')
					{
						data.state.raw_text_last = $this.find('option:selected').text();
					}
				}

				if(val === null)
				{
					val = '';
				}

				if(data.state.first_val === null)
				{
					data.state.first_val = '';
				}

				if(val != data.state.first_val)
				{
					$this.attr('data-state-is_changed', '1');
				}
				else if(this.type == 'radio')
				{
					if($this.is(':checked') && !data.state.selected)
					{
						$this.attr('data-state-is_changed', '1');
					}
					else
					{
						var $this = $(this);
						var settings = $this.parents('form').state_form('get_settings');
						var context = $this.parents('form');
						$('[' + settings.controlling_attr + '="' + $this.attr(settings.controlling_attr) + '"]', context).removeAttr('data-state-is_changed');
					}
				}
				else
				{
					$this.removeAttr('data-state-is_changed');
				}
			};
		},
		/**
		 * save state for field(s) or form
		 * @param {String} key key for state
		 * @returns {jQuery}
		 */
		save_state: function(key) {

			var field = false;
			var settings = this.state_form('get_settings');

			//если функция вызвана в контексте поля формы
			if(this[0].tagName != 'FORM')
			{
				field = this;
			}

			if(settings.save_state_history)
			{
				this.state_form('create_snapshot', key);
			}

			if(field )
			{
				var data = field.data();
				if(typeof data === 'object' && data.hasOwnProperty('state'))
				{
					data.state.first_val = field.val();
					field.state_form('set_value', data, settings);
					field.removeAttr('data-state-is_changed');
				}
			}
			else
			{
				$(':input', this).not('[type="button"],[type="submit"]').each(function() {
					var $$this = $(this);
					var data = $$this.data();
					if(typeof data === 'object' && data.hasOwnProperty('state'))
					{
						data.state.first_val = $$this.val();
						$$this.state_form('set_value', data, settings);
						$$this.removeAttr('data-state-is_changed');
					}
				});

			}

			return this;
		},
		/**
		 * return init form settings
		 * @returns {Object}
		 */
		get_settings: function() {
			var settings = {};

			if(this[0].tagName != 'FORM')
			{
				settings = $(this[0].form).data().settings;
			}
			else
			{
				settings = this.data().settings;
			}

			return settings;
		},
		/**
		 * create snapshot for elements
		 * @param {string} key
		 * @returns {void}
		 */
		create_snapshot: function(key) {
			var curent_state = {};
			var hist = [];

			if(typeof window.localStorage.form_state_snapshot !== 'undefined')
			{
				hist = JSON.parse(window.localStorage.form_state_snapshot);
			}

			key = key || hist.length;

			var fields = [];
			var context = null;
			var max_length = 0;
			var settings = this.state_form('get_settings');

			if(this[0].tagName == 'FORM')
			{
				context = $(':input', this).not('[type="button"],[type="submit"]');
				max_length = settings.state_history_length;
			}
			else
			{
				context = this;
				max_length = settings.state_history_length;
			}
			$(context).not('[type="button"],[type="submit"]').each(function() {
				var data = $(this).data();
				if(typeof data === 'object' && data.hasOwnProperty('state'))
				{
					fields.push(data.state);
				}
			});

			curent_state[key] = fields;
			var ex = false;
			for(var i in hist)
			{
				if(hist[i].hasOwnProperty(key))
				{
					hist[i] = curent_state;
					ex = true;
					break;
				}
			}
			if(!ex)
			{
				if(hist.length >= max_length)
				{
					hist.shift();
				}
				hist.push(curent_state);
			}

			window.localStorage.form_state_snapshot = JSON.stringify(hist);
			if(this[0].tagName == 'FORM')
			{
				window.localStorage.form_state_last_form_snapshot = JSON.stringify(curent_state);
			}
		},
		/**
		 * restore form state by key or last saved state
		 * @param {String} key key for restore
		 * @returns {jQuery}
		 */
		restore_state: function(key) {
			var hist = null;

			if(key)
			{
				hist = this.state_form('get_history', key);
			}
			else
			{
				if(this[0].tagName == 'FORM')
				{
					if(typeof window.localStorage.form_state_snapshot !== 'undefined')
					{
						hist = JSON.parse(window.localStorage.form_state_last_form_snapshot);
					}
				}
				else
				{
					hist = this.state_form('find_state');
				}
			}

			if(hist)
			{
				var settings = this.state_form('get_settings');

				for(var k in hist)
				{
					for(var i in hist[k])
					{
						var old = hist[k][i];
						var el_name = old.element_name;
						var el = null;
						if($('[' + settings.controlling_attr + '="' + el_name + '"]').size())
						{
							el = $('[' + settings.controlling_attr + '="' + el_name + '"]');
						}
						else if($('#' + el_name).size())
						{
							el = $('#' + el_name);
						}
						else
						{
							if(settings.debug_mode)
							{
								window.console.warn('Внимание: поле не найдено в форме! (WARNING: field not found in the form!)');
								window.console.debug(this);
							}
						}

						var data  = el.data().state;
						data.curent_val = old.curent_val;
						//@todo не понятно какое поведение правильное
						//с одной стороны при восстановлении состояния
						//должны восстанавливаться и изменения с другой
						//можем иметь дело с формой после обновления страницы,
						//тогда изменений быть не должно
						data.first_val = old.curent_val;
						//data.first_val = old.first_val;
						data.raw_text_first = old.raw_text_first;
						data.raw_text_last = old.raw_text_last;
						data.selected = old.selected;
						if(el[0].type === 'radio')
						{
							el.each(function() {
								var $this = $(this);
								var val = $this.val();

								if(void 0 !== this.value)
								{
									if(old.curent_val !== null && val == old.curent_val)
									{
										if(old.selected)
										{
											$this.attr('checked', 'cheked').change();
										}

										$this.data().state.first_val = old.curent_val;
										$this.data().state.curent_val = old.curent_val;
									}
								}

							});
						}
						else if(el[0].type === 'checkbox')
						{
							if(old.curent_val === false)
							{
								el.removeAttr('checked').change();
							}
							else
							{
								el.attr('checked', 'cheked').change();
							}
						}
						else
						{
							if(old.curent_val !== null)
							{
								el.val(old.curent_val).change();
							}
						}
					}
				}
			}
			return this;
		},
		/**
		 * returns history by key, context
		 * or all history if key == state_form_all
		 * @param {String} key
		 * @returns {Array|Object}
		 */
		get_history: function(key) {
			key = key || false;
			var hist = [];
			var state = {};

			if(typeof window.localStorage.form_state_snapshot !== 'undefined')
			{
				hist = JSON.parse(window.localStorage.form_state_snapshot);
			}

			if(key)
			{
				if(key == 'state_form_all')
				{
					state = hist;
				}
				else
				{
					for(var i in hist)
					{
						if(hist[i].hasOwnProperty(key))
						{
							state = hist[i];
							break;
						}
					}
				}
			}
			else
			{
				state = hist.pop();
			}

			return state;
		},
		/**
		 * find last state by context
		 * @returns {Object}
		 */
		find_state: function() {
			var names = [];
			var state = {};
			var settings = this.parents('form').state_form('get_settings');
			this.not('[type="button"],[type="submit"]').each(function() {
				var $this = $(this);
				if(void 0 !== $this.attr(settings.controlling_attr))
				{
					names.push(this.attr(settings.controlling_attr));
				}
				else if(void 0 !== this.id)
				{
					names.push(this.id);
				}

			});

			names = names.join(',');
			var hist = this.state_form('get_history', 'state_form_all');
			hist.reverse();

			top:
			for(var i in hist)
			{
				for(var j in hist[i])
				{
					var hist_names = [];
					for(var k in hist[i][j])
					{
						hist_names.push(hist[i][j][k]['element_name']);
					}

					hist_names = hist_names.join(',');

					if(hist_names == names)
					{
						state = hist[i];
						break top;
					}
				}
			}

			return state;

		},
		/**
		 * return true if object is jQuery
		 * @param {Object} obj
		 * @returns {Boolean}
		 */
		is_jQuery : function(obj) {
			return obj!=null && obj.constructor === jQuery;
		}
	};

	$.fn.state_form = function(method) {

		if (methods[method])
		{
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		else if (typeof method === 'object' || !method)
		{
			return methods.init.apply(this, arguments);
		}
		else
		{
			$.error('Метод с именем ' + method + ' не существует для jQuery');
		}

	};
})(jQuery);
