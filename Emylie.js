var Emylie = (function(){
	var ns = {};

	ns.getStorage = function(){
		var storage = {};

		if(window.localStorage != undefined){
			storage = window.localStorage;
		}

		return storage;
	}

	Object.size = function(obj) {
	
		var size = 0, key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)){
				size++;
			}
		}
	
		return size;
	};

	Object.prototype.forEach = function(callback) {
	
		for (var key in this) {
			if (this.hasOwnProperty(key)){
				callback(key, this[key]);
			}
		}
	
		return this;
	};

	NodeList.prototype.map = function(callback){
		return Array.prototype.map.call(this, callback);
	};

	NodeList.prototype.forEach = function(callback){
		return Array.prototype.forEach.call(this, callback);
	};

	Element.prototype.selectText = function(){
		var range, selection;
		;
		if (document.body.createTextRange) {
			range = document.body.createTextRange();
			range.moveToElementText(this);
			range.select();
		} else if (window.getSelection) {
			selection = window.getSelection();
			range = document.createRange();
			range.selectNodeContents(this);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	};

	String.prototype.pad = function(character, len){
		return (len > this.length ? (new Array(len - this.length + 1)).join(character) : '') + this.toString();
	}

	Number.prototype.pad = function(character, len){
		return this.toString().pad(character, len);
	}

	Element.prototype.addClass = function(item){
		this.className = this.className.replace(new RegExp('(^|\\s)\\b' + item + '\\b($|\\s)'), '') + ' ' + item;

		return this;
	}
	Element.prototype.removeClass = function(item){
		this.className = this.className.replace(new RegExp('(^|\\s)\\b' + item + '\\b($|\\s)'), ' ');

		return this;
	}

	Element.prototype.empty = function(){

		this.innerHTML = '';

		return this;
	};

	if(Element.prototype.prependChild == undefined){
		Element.prototype.prependChild = function(el){

			this.insertBefore(el, this.firstChild);

			return this;
		};
	}

	Element.prototype.animate = function(properties, duration){

		if(duration == undefined || typeof duration != 'number'){
			duration = 500;
		}

		var deltas = {};
		for(var property in properties){

			var match = window.getComputedStyle(this)[property].match(/^\d+(\w+)$/);
			
			if(match != null){
				deltas[property] = {
					original: parseInt(match[0]),
					target: properties[property],
					suffix: match[1]
				}

			}else{
				//var match = window.getComputedStyle(this)[property].match(/^(rgba?)\((\d+), (\d+), (\d+)(, (\d+))?\)$/);
				//console.log('Color interpolation, TODO...', match);
				var match = window.getComputedStyle(this)[property].match(/^\d+$/);
				if(match != null){
					deltas[property] = {
						original: parseInt(match[0]),
						target: properties[property],
						suffix: ''
					}
				}
			}
		}

		var interpolation = new Emylie.interpolation(duration);

		interpolation.listen('interpolation.update', (function(e){
			for(var property in properties){
				if(deltas[property] != undefined){
					if(deltas[property].suffix != undefined){
						this.style[property] = deltas[property].original + (deltas[property].target - deltas[property].original) * e.detail.progress + deltas[property].suffix;
					}
				}
			}
		}).bind(this));

		interpolation.start();
		return this;
	};

	HTMLDocument.prototype.loadJS = function(link, reload){
		if(reload == undefined){reload = false;}

		var load = true;
		var head = this.getElementsByTagName('head')[0];
		var scripts = head.getElementsByTagName('script');

		for(var i in scripts){
			if(scripts[i].src == link){
				load = reload;

				break;
			}
		}

		if(load){
			var script = this.createElement('script');
			script.type = "text/javascript";
			script.src = link;

			head.appendChild(script);
		}

		return this;
	}

	HTMLDocument.prototype.loadCSS = function(url, reload, callback){
		if(reload == undefined){reload = false;}

		var load = true;
		var head = this.getElementsByTagName('head')[0];
		var links = head.getElementsByTagName('link');
		/*
		for(var i in links){
			if(links[i].href == link){
				load = reload;

				break;
			}
		}
		*/
		if(load){
			var link = document.createElement('link');
			link.type = 'text/css';
			link.rel = 'stylesheet';
			link.href = url;

			if(typeof callback == 'function'){
				link.addEventListener('load', callback);
			}

			head.appendChild(link);
		}

		return this;
	}

	HTMLDocument.prototype.redirect = function(link){
		window.location = link;
	}

	ns.EventTarget = (function(){
		var constructor = function(){
			this._listeners = {};
		};

		constructor.prototype._listeners = null;
		constructor.prototype.listen = function(ev, callback, context){
			if(context == undefined){context = this;}

			if(this._listeners[ev] == undefined){
				this._listeners[ev] = [[context, callback]];
			}else{
				this._listeners[ev].push([context, callback]);
			}
		};
		constructor.prototype.trigger = function(ev){
			ev.target = this;
			
			if(this._listeners[ev.type] != undefined){
				for(var i in this._listeners[ev.type]){
					if(typeof this._listeners[ev.type][i][1] == 'function'){
						this._listeners[ev.type][i][1].call(this._listeners[ev.type][i][0], ev);
					}
				}
			}
		};
		constructor.prototype.initEvents = function(){
			this._listeners = {};
		};

		return constructor;
	})();

	ns.interpolation = (function(){

		var constructor = function(duration, mode){
			if(mode != undefined){
				this.duration = mode;
			}

			if(duration != undefined){
				this.duration = duration;
			}
		};
		constructor.prototype = new ns.EventTarget();

		constructor.prototype.duration = 500;
		constructor.prototype.mode = 'linear';
		constructor.prototype.interval = null;
		constructor.prototype.progress = 0;
		constructor.prototype.tick = 0;
		constructor.prototype.tickInterval = 17;
		constructor.prototype.start = function(){
			this.maxTick = Math.ceil(this.duration / this.tickInterval);
			this.interval = setInterval(_makeProgress.bind(this), this.tickInterval);
		};

		var _makeProgress = function(){
			this.progress = ++this.tick / this.maxTick;
			
			this.trigger(new CustomEvent('interpolation.update', {detail: {progress: this.progress}}));

			if(this.progress >= 1){
				clearInterval(this.interval);
				this.trigger(new CustomEvent('interpolation.finish'));
			}
		}

		return constructor;
	})();

	ns.HTTPRequest = (function(){
		var constructor = function(method, uri, async){
			if(async == undefined){async = true;}

			this._dataType = 'urlformatted';
			this._method = method;

			this._xmlrequest = new XMLHttpRequest();
			this._xmlrequest.open(method, uri, async);
		};

		constructor.prototype.send = function(){
			if(this._dataType == 'urlformatted' && this._method == 'post'){
				this._xmlrequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			}
			this._xmlrequest.send();
		};

		constructor.prototype.addEventListener = function(type, listener){
			this._xmlrequest.addEventListener(type, listener);
		};

		constructor.prototype.removeEventListener = function(type, listener){
			this._xmlrequest.removeEventListener(type, listener);
		};

		return constructor;
	})();

	ns.Router = (function(){

		var constructor = function(routes){
			var routeParts;
			
			this._routes = routes;
			for(var i in this._routes){
				this._routes[i].routeParts = [];
				routeParts = this._routes[i].route.split('/');
				for(var j in routeParts){
					if(routeParts[j] != ''){
						this._routes[i].routeParts.push(routeParts[j]);
					}
				}
			}
		};
		constructor.prototype = new ns.EventTarget();

		constructor.prototype.route = function(path){
			var route = null;
			var tmp = [];
			var pathParts = path.split('/');
			for(var i in pathParts){
				if(pathParts[i] != ''){
					tmp.push(pathParts[i]);
				}
			}
			pathParts = tmp;

			for(var i in this._routes){
				if(
					pathParts.length == this._routes[i].routeParts.length
				 || (pathParts.length >= this._routes[i].routeParts.length-1 && this._routes[i].routeParts[this._routes[i].routeParts.length - 1] == '*')
				){
					var route = {'_parts':[]};
					for(var j in this._routes[i].options){
						route[j] = this._routes[i].options[j];
					}

					var recording = true;					
					for(var j in pathParts){
						if(recording){
							if(this._routes[i].routeParts[j][0] == ':'){
								route[this._routes[i].routeParts[j].substr(1)] = pathParts[j];
							}else if(this._routes[i].routeParts[j] == '*'){
								recording = false;
							}else if(this._routes[i].routeParts[j] != pathParts[j]){
								route = null;
								break;
							}
						}
						
						route._parts.push(pathParts[j]);
					}

					if(route != null){
						return route;
					}
				}
			}

			return null;
		};

		return constructor;
	})();

	ns.App = (function(){

		var _routers = [];
		var _apps = [];

		var constructor = function(){
			window.addEventListener('hashchange', (function(e){
				this.route(e.newURL.split('#')[1]);
			}).bind(this));

			window.addEventListener('resize', (function(e){
				this.ui.width = e.target.innerWidth;
				this.ui.height = e.target.innerHeight;
				this.trigger(new CustomEvent('app.resized', {'detail':{
					'width': e.target.innerWidth,
					'height': e.target.innerHeight
				}}));
			}).bind(this));

			this.ViewModelsPath = '';
			this.ViewModels = {};
			this.ViewStoragePatterns = {};
			this.ViewModelsCount = 0;
			this.layouts = {};
			this.state = 0;

			this.ui = {
				width: window.innerWidth,
				height: window.innerHeight
			};

			this.viewFactory = new ns.ViewFactory(this);

			_apps.push(this);
		}
		constructor.prototype = new ns.EventTarget();
		constructor.prototype.STATE_LOADING = 0;
		constructor.prototype.STATE_LOADED = 1;
		constructor.prototype.STATE_ACTIVE = 2;
		constructor.prototype.STATE_HOLD = 3;
		constructor.prototype.STATE_TERMINATED = 4;

		constructor.prototype.redirect = function(hash){
			window.location.hash = hash;
		}

		constructor.prototype.registerRouter = function(router){
			_routers.push(router);
		};

		constructor.prototype.refresh = function(){
			this.route(window.location.hash.substring(1));
		}

		constructor.prototype.route = function(path){
			for(var i in _routers){
				var route = _routers[i].route(path);
				if(route != null){
					break;
				}
			}

			this.currentRoute = route;
			
			this.trigger(new CustomEvent('app.routed', {
				detail: {
					path: path,
					route: route
				}
			}), this);

			return route;
		};

		constructor.prototype.init = function(){
			var route = window.location.hash.substr(1);
			if(route == ''){
				return this.redirect('/');
			}

			return this.route(route);
		}

		constructor.prototype.requireView = function(path){
			this.ViewModelsCount++;
			this.ViewModels[path] = null;
		}

		constructor.prototype.loadViews = function(path){
			for(var i in this.ViewModels){
				if(this.ViewModels[i] == null){
					document.loadJS(this.ViewModelsPath + '/' + i + '/model.js');
				}
			}
		}

		constructor.prototype.registerView = function(name, viewConstructor){
			this.ViewModels[name] = viewConstructor;
			this.ViewModelsCount--;

			this.trigger(new CustomEvent('view.registered-'+name, {
				detail: {
					'constructor': viewConstructor
				}
			}));

			this.trigger(new CustomEvent('view.registered', {
				detail: {
					'constructor': viewConstructor,
					'name': name
				}
			}));

			if(viewConstructor.prototype.layoutName != null){
				if(
					this.ViewModels[viewConstructor.prototype.layoutName] == undefined
				 || this.ViewModels[viewConstructor.prototype.layoutName] == null
				){
					this.listen('view.registered-'+viewConstructor.prototype.layoutName, function(e){
						viewConstructor.prototype.layoutConstructor = e.detail.constructor
					});
				}else{
					viewConstructor.prototype.layoutConstructor = this.ViewModels[viewConstructor.prototype.layoutName];
				}
			}
			if(this.ViewModelsCount == 0){
				if(document.readyState != 'complete'){
					document.addEventListener('readystatechange', (function(e){
						if(document.readyState == 'complete'){
							this.trigger(new CustomEvent('app.ready'), this);
						}
					}).bind(this));
				}else{
					this.trigger(new CustomEvent('app.ready'), this);
				}
			}
		}

		return constructor;
	})();

	ns.ViewFactory = (function(){

		var constructor = function(app){
			this.storage = {};
			this.app = app;
		};

		constructor.prototype.produce = function(viewName, route){
			var viewModel = this.app.ViewModels[viewName];
			var storagePattern = this.app.ViewStoragePatterns[viewName];

			storageAddress = viewName;
			if(storagePattern != undefined){
				storageAddress = storagePattern(route);
			}

			if(this.storage[storageAddress] == undefined){
				this.storage[storageAddress] = new viewModel(route);
			}

			this.storage[storageAddress].processRoute(route);

			return this.storage[storageAddress];
		};

		return constructor;
	})();

	ns.View = (function(){

		var constructor = function(app, child){

			this.app = app;
			this.language = null;

			this.initEvents();
			this.listen('view.template.loaded', function(){
				if(!this.styleLoaded){
					return;
				}
				app.registerView(this.name, child);
			});
			this.listen('view.style.loaded', function(){
				if(!this.templateLoaded){
					return;
				}
				app.registerView(this.name, child);
			});
		};
		constructor.prototype = new ns.EventTarget();

		constructor.prototype.styleLoaded = false;
		constructor.prototype.templateLoaded = false;
		constructor.prototype.template = '';
		constructor.prototype.dom = null;
		constructor.prototype.app = null;
		constructor.prototype.layoutName = null;
		constructor.prototype.layout = null;
		constructor.prototype.childContentContainerDom = undefined;
		constructor.prototype.resize = function(){};
		constructor.wardrobe = {};

		constructor.prototype.init = function(){

			this.dom = document.createElement('div');
			this.dom.addClass('View-' + this.name.replace('.', '-'));

			this.dom.innerHTML = ns.Renderer.render(this.template, this);
			this.childContentContainerDom = this.dom.querySelector('.child-container');

			this.trigger(new CustomEvent('view.dom.loaded'));
		};
		
		constructor.prototype.processRoute = function(route){}

		constructor.prototype.loadTemplate = function(style){

			if(style == undefined){style = false;}

			if(style){
				document.loadCSS(this.app.ViewModelsPath + '/' + this.name + '/style.css', null, (function(e){
					this.styleLoaded = true;
					this.trigger(new CustomEvent('view.style.loaded'));
				}).bind(this));
			}else{
				this.styleLoaded = true;
			}

			var request = new ns.HTTPRequest('get', this.app.ViewModelsPath + '/' + this.name + '/template.html');
			request.addEventListener('loadend', (function(e){
				this.template = e.target.response;
				this.templateLoaded = true;
				this.trigger(new CustomEvent('view.template.loaded'));
			}).bind(this));
			request.send();
		};

		constructor.prototype.refresh = function(){
			this.dom.innerHTML = ns.Renderer.render(this.template, this);
			this.childContentContainerDom = this.dom.querySelector('.child-container');

			this.trigger(new CustomEvent('view.dom.loaded'));

			this.language = this.app.dictionnary.language;
		}

		constructor.prototype.render = function(element, refresh){
			if(element == undefined){element = document.body;}
			if(refresh == undefined){refresh = null;}
			
			if(refresh){
				this.refresh();		
			}


			var e = new CustomEvent('view.render', {
				cancelable: true
			});
			this.trigger(e, this);

			if(e.defaultPrevented){
				return false;
			}

			if(this.layoutName != null){
				var layout = this.app.viewFactory.produce(this.layoutName);
				if(refresh){
					layout.refresh();		
				}
				layout.childContentContainerDom.empty().appendChild(this.dom);
				layout.render(element, false);
			}else{
				element.empty().appendChild(this.dom);
			}
			
			this.trigger(new CustomEvent('view.rendered', {}), this);

			this.resize();

			return this;
		};

		constructor.prototype.dress = function(dresses){
			if(dresses == undefined){dresses = constructor.wardrobe;}
			dresses.forEach((function(dress){
				this.dom.querySelectorAll('[dress-'+dress+']').forEach(function(el){
					ns.View.wardrobe[dress].putOn(el);
				});
			}).bind(this));
		};

		return constructor;
	})();

	ns.Dress = (function(){
		var constructor = function(behaviour){
			this.behaviour = behaviour;
		};

		constructor.prototype.putOn = function(el){
			this.behaviour(el);
		};

		return constructor;
	})();

	ns.Renderer = (function(){

		var pattern = /<%= *((([\w_]+\.?)*)?[\w_]+) *%>/ig;

		return {
			render: function(template, data){
				var result = template;

				return result.replace(pattern, function(){
					var path = arguments[1].split('.');
					var location = data;
					
					for(var i in path){
						location = location[path[i]];
						if(location == undefined){
							return arguments[0]
						}
					}
					
					return location;
				});
			}
		};
	})();

	ns.Promise = (function(){
		var constructor = function(promise, options){
			this.promise = promise;
			if(options != undefined){
				this.options = options;
			}

			this.options = {};
			this.futures = {};
			this.present = {};
		};

		constructor.prototype.bind = function(name, callback){
			this.futures[name] = this.futures[name] || [];
			this.futures[name].push(callback);

			if(this.present[name] == true){
				callback(this);
			}
		};

		constructor.prototype.hand = function(name){
			this.present[name] = true;
			if(this.futures[name] != undefined){
				this.futures[name].map((function(future){
					future(this);
				}).bind(this));
			}
		};

		constructor.prototype.keep = function(){
			this.promise(this);

			return this;
		};

		return constructor;
	})();

	document.getElementsByTagName('html')[0].removeClass('no-js');

	return ns;
})();