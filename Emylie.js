var Emylie = (function(){
	var ns = {};

	Element.prototype.addClass = function(item){
		this.className = this.className.replace(new RegExp('\\b' + item + '\\b'), '') + item;

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

					return route;
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

			this.ViewModelsPath = '';
			this.ViewModels = {};
			this.ViewModelsCount = 0;
			this.ready = false;

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
				route = '/';
			}

			return this.route(route);
		}

		constructor.prototype.loadView = function(path){
			this.ViewModelsCount++;
			var parts = path.split('.');
			this.ViewModels[parts[0]] = {};
			document.loadJS(this.ViewModelsPath + '/' + path.replace('.', '/') + '.js');
		}

		constructor.prototype.registerView = function(name, constructor){
			var parts = name.split('.');
			this.ViewModels[parts[0]][parts[1]] = constructor;
			this.ViewModelsCount--;

			if(
				this.ViewModelsCount == 0
			 && document.body != undefined
			 && !_apps[i].ready
			){
				_apps[i].ready = true;
				this.trigger(new CustomEvent('app.ready'), this);
			}
		}

		document.addEventListener('readystatechange', function(e){
			if(document.body != undefined){
				for(var i in _apps){
					if(_apps[i].ViewModelsCount == 0 && !_apps[i].ready){
						_apps[i].ready = true;
						_apps[i].trigger(new CustomEvent('app.ready'), _apps[i]);
					}
				}
			}
		});

		return constructor;
	})();

	ns.View = (function(){

		var constructor = function(){}
		constructor.prototype = new ns.EventTarget();

		constructor.prototype.render = function(){
			document.body.innerHTML = Math.random()*30;
		}

		return constructor;
	})();

	document.getElementsByTagName('html')[0].removeClass('no-js');
	
	return ns;
})();