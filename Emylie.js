var Emylie = (function(){
	var ns = {};

	Element.prototype.addClass = function(item){
		this.className = this.className.replace(new RegExp('\\b' + item + '\\b'), '') + ' ' + item;

		return this;
	}
	Element.prototype.removeClass = function(item){
		this.className = this.className.replace(new RegExp('\\b' + item + '\\b'), '');

		return this;
	}

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
			document.writeln('<script type="text/javascript" src="'+link+'"></script>');
		}

		return this;
	}

	HTMLDocument.prototype.redirect = function(link){
		window.location = link;
	}

	ns.EventTarget = (function(){
		var constructor = function(){};

		constructor.prototype._listeners = {};
		constructor.prototype.listen = function(ev, callback, context){
			if(context == undefined){context = this;}

			if(this._listeners[ev] == undefined){
				this._listeners[ev] = [[context, callback]];
			}else{
				this._listeners[ev].push([context, callback]);
			}
		};
		constructor.prototype.trigger = function(ev, context){
			ev.target = this;
			if(this._listeners[ev.type] != undefined){
				for(var i in this._listeners[ev.type]){
					if(typeof this._listeners[ev.type][i][1] == 'function'){
						this._listeners[ev.type][i][1].call(this._listeners[ev.type][i][0], ev);
					}
				}
			}
		};

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
					var route = {};
					for(var j in this._routes[i].options){
						route[j] = this._routes[i].options[j];
					}
					
					for(var j in this._routes[i].routeParts){
						if(this._routes[i].routeParts[j][0] == ':'){
							route[this._routes[i].routeParts[j].substr(1)] = pathParts[j];
						}else if(this._routes[i].routeParts[j] == '*'){
							break;
						}else if(this._routes[i].routeParts[j] != pathParts[j]){
							route = null;
							break;
						}
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
			this.ViewModelsCount = 0;
			this.layouts = {};

			this.ui = {
				width: window.innerWidth,
				height: window.innerHeight
			};

			_apps.push(this);
		}
		constructor.prototype = new ns.EventTarget();

		constructor.prototype.redirect = function(hash){
			window.location.hash = hash;
		}

		constructor.prototype.registerRouter = function(router){
			_routers.push(router);
		};

		constructor.prototype.route = function(path){
			for(var i in _routers){
				var route = _routers[i].route(path);
				if(route != null){
					break;
				}
			}

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
					document.loadJS(this.ViewModelsPath + '/' + i.replace('.', '/') + '.js');
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
					document.addEventListener('DOMContentLoaded', (function(e){
						this.trigger(new CustomEvent('app.ready'), this);
					}).bind(this));
				}else{
					this.trigger(new CustomEvent('app.ready'), this);
				}
			}
		}

		return constructor;
	})();

	ns.View = (function(){

		var constructor = function(){};
		constructor.prototype = new ns.EventTarget();

		constructor.prototype.templateURL = null;
		constructor.prototype.templateLoaded = false;
		constructor.prototype.template = '';
		constructor.prototype.dom = null;
		constructor.prototype.layout = null;
		constructor.prototype.layoutName = null;
		constructor.prototype.layoutConstructor = null;
		constructor.prototype.childContentContainerDom = undefined;
		constructor.prototype.resize = function(){};

		constructor.prototype.init = function(){
			this.dom = document.createElement('div');
			this.dom.addClass('View-' + this.name.replace('.', '-'));
			if(this.templateLoaded){
				this.dom.innerHTML = this.template;
			}else{
				this.listen('view.template.loaded', function(e){
					this.dom.innerHTML = this.template;
				});
			}

			var childrenSet = this.dom.getElementsByClassName('child-container');
			if(childrenSet.length > 0){
				this.childContentContainerDom = childrenSet[0];
			}
		};

		constructor.prototype.loadTemplate = function(){
			var request = new ns.HTTPRequest('get', this.templateURL);
			request.addEventListener('loadend', (function(e){
				this.template = e.target.response;
				this.templateLoaded = true;
				this.trigger(new CustomEvent('view.template.loaded'));
			}).bind(this));
			request.send();
		};

		constructor.prototype.render = function(element){
			if(element == undefined){element = document.body;}

			if(this.layoutConstructor != null){
				this.layout = new this.layoutConstructor();
				this.layout.childContentContainerDom.innerHTML = '';
				this.layout.childContentContainerDom.appendChild(this.dom);
				this.layout.render(element);
			}else{
				element.innerHTML = '';
				element.appendChild(this.dom);
			}
			
			this.resize();

		};

		return constructor;
	})();

	document.getElementsByTagName('html')[0].removeClass('no-js');

	return ns;
})();