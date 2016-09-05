// // window._ceWin = null;
// // window._ceWidthSize = 370;
// // window._ceMinWidthSize = 320;
// window._ceEnableCollect = false;
// // window._ceFrameUrl = ;

// (function(scope){
//     var imim = {};
//     var cacheFn = {};
//     // loaded stamp
//     var _moduleLoadTime = (new Date()).getTime();

//     var _registerEvents = {};
//     var _childFrames = [];

//     // for send to server on frame_ready
//     var _lazyUserInfo = {};

//     var _mainFrame = null;
//     var _mainFrameWidth = 375;
//     var _mainFrameMinWidth = 320;

//     var _animateState = {};
//     var _disabled = false;

//     var _url = null;

//     var _cachedIm = {};
//     var _disableAPI = function(){
//         if(_disabled) return;
//         if(_mainFrame){
//             var id = _mainFrame.id + "-link";
//             var urlPaths = _url.split('/');
//             urlPaths.pop(); urlPaths.push('register');
//             var linkUrl = urlPaths.join('/');
//             var registerLinkHtml = '<div id="' + id + '" style="background:transparent; padding: 5px; width:100%; height: 100%; text-align: center; position: absolute; right: -5px; top: -5px;"><a style="text-decoration:none;width:100%;padding:5px 0;font-size:30px;display:block;" href="' + linkUrl + '">&#10071;</a></div>';

//             document.getElementById(_mainFrame.id + '-wrap').innerHTML += registerLinkHtml;
//         }
//         for(var p in imim){
//             if(p == "setUserInfo") continue;
//             _cachedIm[p] = imim[p];
//             if(typeof imim[p] == 'function') imim[p] = function(){};
//         }
//         _disabled = true;
//     };

//     var _enableAPI = function(){
//         if(!_disabled) return;
//         if(_mainFrame){
//             var id = _mainFrame.id + "-link";
//             var el = document.getElementById(id);
//             if(el) el.parentNode.removeChild(el);
//         }
//         for(var p in _cachedIm){
//             imim[p] = _cachedIm[p];
//             _cachedIm[p] = null;
//         }
//         _disabled = false;
//     };

//     var _isCanDo = function(){
//         return (new Date()).getTime() - _moduleLoadTime < 100 || (typeof _lazyUserInfo.id == 'undefined');
//     };

//     var _mainFrameSlideIn = function(duration){
//         if(_disabled) return;
//         var o;
//         duration = duration || 200;
//         if(!_animateState.isShow && !_animateState.isAnimate && (o = _getFrameIdAndEl(_mainFrame)) ){
//             _animateState.isAnimate = true;
//             var el = o.el;
//             var width = el.width;
//             var unitTime = 20;
//             var stampWidth = width;
//             var unitPixel = width / (duration / unitTime);
//             var counts = Math.floor(duration / unitPixel);
//             var int = setInterval(function(){
//                 stampWidth -= unitPixel;
//                 if(stampWidth < 0) stampWidth = 0;
//                 el.style['right'] = (-stampWidth) + 'px';
//                 if(stampWidth == 0){
//                     clearInterval(int);
//                     _animateState.isAnimate = false;
//                     _animateState.isShow = true;
//                 }
//             }, unitTime);
//         }
//     };

//     var _mainFrameSlideOut = function(duration){
//         if(_disabled) return;
//         var o;
//         duration = duration || 200;
//         if(_animateState.isShow && !_animateState.isAnimate && (o = _getFrameIdAndEl(_mainFrame)) ){
//             _animateState.isAnimate = true;
//             var el = o.el;
//             var width = el.width;
//             var unitTime = 20;
//             var stampWidth = 0;
//             var unitPixel = width / (duration / unitTime);
//             var counts = Math.floor(duration / unitPixel);
//             var int = setInterval(function(){
//                 stampWidth += unitPixel;
//                 if(stampWidth > width) stampWidth = width;
//                 el.style['right'] = (-stampWidth) + 'px';
//                 if(stampWidth == width){
//                     clearInterval(int);
//                     _animateState.isAnimate = false;
//                     _animateState.isShow = false;
//                 }
//             }, unitTime);
//         }
//     };

//     var _createCookie = function(name, value, days){
//         value = encodeURIComponent(value);
//         if (days) {
//             var date = new Date();
//             date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
//             var expires = "; expires=" + date.toGMTString();
//         }
//         else var expires = "";
//         document.cookie = name + "=" + value + expires + "; path=/";
//     };

//     var _getCookie = function(name){
//         var value = "; " + document.cookie;
//         var parts = value.split("; " + name + "=");
//         if (parts.length == 2) return decodeURIComponent(parts.pop().split(";").shift());
//         return null;
//     };

//     var _getValidJSON = function(str){
//         try {
//             var o = JSON.parse(str);
//             return o;
//         } catch (e) {
//             console.warn(e);
//             return null;
//         }
//     };

//     var _getMaxZindex = function(dom){
//         dom = dom || document.body;
//         var maxZindex = -1;
//         var items = dom.querySelectorAll('*');
//         for(var i = 0, len = items.length; i< len; i++){
//             var item = items[i];
//             var styles = getComputedStyle(item);
//             var zIndex = styles["zIndex"];
//             var getIt = zIndex != 'auto';
//             if(getIt){
//                 maxZindex = Math.max(parseInt(zIndex), maxZindex);
//             }
//         }
//         return maxZindex;
//     };

//     var _validPath = function(url){
//         var a = document.createElement('a');
//         a.href = url;
//         if(a.host == window.location.host){
//             // same domain
//             var p = a.pathname, paths = p.split("/");
//             if(p == "") p = "/";
//             else{
//                 if(paths[0] != "") paths.unshift("");
//                 p = paths.join('/');
//             }
//             return p;
//         }else{
//             return false;
//         }
//     };

//     var _getFrameIdAndEl = function(el){
//         var o = _splitEl(el);
//         if(o.el){
//             if(_childFrames.indexOf(o.id) == -1)
//                 _childFrames.push(o.id);
//             if(!_registerEvents[o.id])
//                 _registerEvents[o.id] = {};
//             return o;
//         }
//         return null;
//     };

//     var _onFrame = function(id, event, fn){
//         var o;
//         id = id || _mainFrame;
//         if(o = _getFrameIdAndEl(id)){
//             id = o.id;
//             var fns = _registerEvents[id][event];
//             if(!fns) fns = _registerEvents[id][event] = [];
//             var fnsInStr = fns.map(function(f){ return f.toString(); });
//             if(fnsInStr.indexOf(fn.toString()) == -1) fns.push(fn);
//         }
//     };

//     var _emitFrame = function(id, event, args){
//         var o;
//         id = id || _mainFrame;
//         if(o = _getFrameIdAndEl(id)){
//             if(typeof args != 'undefined' && !Array.isArray(args)) args = [args];
//             if(!args) args = [];
//             var w = o.el.contentWindow;
//             w.postMessage(JSON.stringify({event:event, args:args}), "*");
//         }
//     };

//     var _hookFramePost = function(){
//         window.addEventListener('message', function(e){
//             // e.data should be a json
//             // { event: String, args: Array }
//             if(_url.indexOf(e.origin) > -1){
//                 var o = _getValidJSON(e.data);
//                 if(o) _fireF(e.source, o.event, o.args);
//             }
//         });
//     };

//     var _hookMainFrameEvents = function(){
//         var f = _mainFrame;
//         _onFrame(f, 'frame_ready', function(){
//             f._ready = true;
//             _emitFrame(f, 'get_mainpage_info', {
//                 domain: location.host,
//                 path: _validPath(location.pathname) || "/",
//                 params: (location.search)? location.search.substring(1) : "",
//                 hash: (location.hash)? location.hash.substring(1) : "",
//                 name: _lazyUserInfo.name || '',
//                 userid: _lazyUserInfo.id || '',
//                 image: _lazyUserInfo.image,
//                 email: _lazyUserInfo.email,
//                 isshowpath: _lazyUserInfo.isshowpath || _getCookie('_ce_showpath')
//             });
//         });

//         _onFrame(f, 'update_unread_count', function(count){
//             var o = document.getElementById(f.id + '-unread');
//             if(o){
//                 var style = (count > 0)? "block" : "none";
//                 o.innerText = count;
//                 o.style["display"] = style;
//             }
//         });

//         _onFrame(f, 'change_user_cookie', function(data){
//             _createCookie('_ce_showpath', data.isshowpath, 365);
//         });

//         _onFrame(f, 'close_panel', function(){
//             _mainFrameSlideOut();
//         });

//         _onFrame(f, 'enable_action_collect', function(){
//             window._ceEnableCollect = true;
//         });

//         _onFrame(f, 'disable_action_collect', function(){
//             window._ceEnableCollect = false;
//         });

//         _onFrame(f, 'socket_disabled', function(){
//             _disableAPI();
//         });

//     };

//     var _initMainFrame = function(){
//         var randomId = Math.random().toString(36).substring(7);
//         var dom = document.createElement('iframe');
//         var maxZindex = _getMaxZindex();
//         var cssText = "z-index: " + (maxZindex + 2) + "; position: fixed; width: " + _mainFrameWidth + "px; bottom: 0px;margin: 0px;padding: 0px; border: 0px;background: transparent; min-width:" + _mainFrameMinWidth + "px; border-left: 1px solid rgba(0,0,0,0.2); box-shadow: -1px 0 10px rgba(0,0,0,0.3);";

//         // add important for all and ignore safari bug on "right" style
//         cssText = cssText.split(';').join(' !important;') + " right: -" + _mainFrameWidth + "px;";

//         dom.id = "ce-" + randomId +  "-frame";
//         dom.style.cssText = cssText;
//         dom.width = _mainFrameWidth;
//         dom.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
//         _mainFrame = dom;
//         document.body.appendChild(dom);

//         dom.addEventListener('load', _onMainFrameLoad);
//         dom.src = _url;
//     };

//     var _hookWindowEvents = function(){
//         window.addEventListener('resize', function(){
//             _mainFrame.width = Math.min(_mainFrameWidth, document.body.clientWidth);
//             _mainFrame.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
//             _emitFrame(_mainFrame, 'iframe_resize');
//         });
//     };

//     var _onWindowLoad = function(ev){
//         window.removeEventListener('load', _onWindowLoad);
//         _url = _url || "http://script.gossim.cc/client/index.html";

//         _initMainFrame();
//         _hookFramePost();
//         _hookWindowEvents();
//     };

//     var _fireF = function(frameWindow, event, args){
//         // find the window
//         var foundId;
//         for(var i = 0, len = _childFrames.length; i < len; i++){
//             var id = _childFrames[i],
//                 o = document.getElementById(id);
//             if(o && o.contentWindow == frameWindow){
//                 foundId = id;
//                 break;
//             }
//         }
//         if(_registerEvents[foundId] && _registerEvents[foundId][event]){
//             if(args && !Array.isArray(args)) args = [args];
//             if(!args) args = [];
//             _registerEvents[foundId][event].forEach(function(fn){
//                 fn.apply(imim, args);
//             });
//         }
//     };

//     var _splitEl = function(el){
//         var isStr = typeof el == 'string',
//             id = isStr? el : el.id,
//             obj = isStr? document.getElementById(el) : el;
//         return { id: id, el: obj};
//     };

//     var _calculateAndFit = function(image, maxWidth, maxHeight){
//         var srcWidth = parseInt(image.width), srcHeight = parseInt(image.height);
//         var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
//         var res = { width: srcWidth * ratio, height: srcHeight * ratio};
//         return res;
//     };

//     var _reloadFrame = function(){
//         _emitFrame(_mainFrame, 'force_reload');
//         _enableAPI();
//     };

//     imim.popup = function(id, roomName){
//         _emitFrame(_mainFrame, "popup_user", [id, roomName]);
//         _mainFrameSlideIn();
//     };

//     imim.getPageCount = function(path, callback){
//         callback = (typeof callback == 'function')? callback : function(){};
//         // parse path
//         var path = _validPath(path);
//         if(path){
//             // if path is valid, do get path event

//             // ***** Two algorithms:
//             // 1. Responsively: Emit a event and listen for the callback directly.
//             // 2. Cached way: Cache current path list mapping of current domain, and it can not be called again in specific time.
//             // *****

//             // use 1. first
//             _onFrame(_mainFrame, 'get_page_count', function(searchPath, count){
//                 callback(searchPath, count);
//             });
//             _emitFrame(_mainFrame, 'get_page_count', path);
//         }else console.warn("Gossim.getPageCount: The path is not in same domain.");
//     };

//     imim.getMainFrame = function(){ return _mainFrame; };

//     cacheFn.setConnectUrl = function(url){
//         if(!_isCanDo()){
//             console.warn("setConnectUrl function only valid after Gossim loaded for 100ms.");
//             return;
//         }
//         _url = url;
//     };

//     // setUserInfo(unique-user-id, name, image(src or base64))
//     cacheFn.setUserInfo = function(id, name, image, email){
//         if(Object.prototype.toString.call(id) == "[object Object]"){
//             var prop = id;
//             id = prop.id; name = prop.name || name; image = prop.image || image; email = prop.email || email;
//         }
//         if( (typeof id == 'string' || typeof id == 'number') &&
//             Object.prototype.toString.call(name) == "[object Object]"){
//             var prop = name;
//             name = prop.name; image = prop.image || image; email = prop.email || email;
//         }
//         if(!_isCanDo()){
//             console.warn("setUserInfo function only valid after Gossim loaded for 100ms OR set userinfo in first time.");
//             return;
//         }
//         if(!id || typeof id == 'undefined'){
//             console.warn("setUserInfo params:[id can not be empty].");
//             return;
//         }
//         if(typeof id != 'string' && typeof id != 'number'){
//             console.warn("setUserInfo params:[id should be a string or number].");
//             return;
//         }
//         if(_mainFrame && _mainFrame._ready) setTimeout(function(){ _reloadFrame(); }, 100);
//         id = id.toString();
//         _lazyUserInfo.id = id;
//         _lazyUserInfo.name = name || '';
//         _lazyUserInfo.image = '';
//         _lazyUserInfo.email = email;
//         if(typeof image == 'string'){
//             function doLoadImage(){
//                 var img = new Image();
//                 img.crossOrigin = "Anonymous";
//                 // img.setAttribute('crossOrigin', 'anonymous');
//                 img.onload = function(){
//                     var size = _calculateAndFit(img, 64, 64);
//                     var canvas = document.createElement("canvas");
//                     canvas.width = size.width;
//                     canvas.height = size.height;
//                     var ctx = canvas.getContext("2d");
//                     ctx.drawImage(img, 0, 0, size.width, size.height);
//                     _lazyUserInfo.image = canvas.toDataURL("image/png");
//                     if(_mainFrame && _mainFrame._ready){
//                         // should emit a event to server, because the image loaded after socket connected.
//                     }
//                 };
//                 img.onerror = function(){ console.warn("Gossim load " + image + " fail."); };
//                 img.src = image;
//             }
//             if(window.atob){
//                 try{
//                     var splits = image.split(',');
//                     var last = splits.pop();
//                     window.atob(last);
//                     if(splits.length > 0){
//                         // may be start with data:image...
//                         _lazyUserInfo.image = splits.concat([last]).join(',');
//                     }else{
//                         // may be just base64
//                         _lazyUserInfo.image = "data:image/png;base64," + last;
//                     }
//                 }catch(err){
//                     // maybe url
//                     doLoadImage();
//                 }
//             }else{
//                 // guess dataurl/base64
//                 var splits = image.split(',');
//                 if(splits.length > 1) _lazyUserInfo.image = image;
//                 else _lazyUserInfo.image = "data:image/png;base64," + splits.pop();
//                 // guess url
//                 doLoadImage();
//             }
//         }else{
//             console.warn("Gossim.setUserInfo params:[image should be path/dataUrl/base64 string].");
//         }
//     };

//     window.addEventListener('load', _onWindowLoad);

//     // trigger between module loaded and window loaded.
//     (function(){
//         var name = scope['GossimPluginObject'];
//         var query = scope[name].q || []; // array of arguments
//         query.forEach(function(q){
//             q = Array.prototype.slice.call(q);
//             var f = q[0];
//             if(typeof cacheFn[f] == 'function') cacheFn[f].apply(cacheFn, q.slice(1));
//         });
//     })();

//     imim.setUserInfo = cacheFn.setUserInfo;

//     scope.Gossim = imim;
// })(window);

// window._ceCount = 0;
// window._collectStamp = {};
// window._ceRecordInterval = 100;
// window._collectEvents = ['mousemove', 'scroll', 'click'];
// window._windowEvents = ['focus','blur'];
// window._ceCollectAction = function(eventArg){
//     // Avoid bubble event triggers.

//     if(window._ceEnableCollect && eventArg._ceHasTriggered !== true){
//         // to do send event name
//         // console.log(eventArg);
//         var stamps = window._collectStamp;
//         var curTime = (new Date()).getTime();
//         var isBubble = eventArg.bubbles;
//         var storeTime = stamps[eventArg.type] || eventArg.target._lastScrollStamp || 0;
//         if( curTime - storeTime >= window._ceRecordInterval){
//             var target = eventArg.target;
//             // var type = (_visibilityChange == eventArg.type)
//             var actionObj = {
//                 target_id: target._ceSerial,
//                 event: eventArg.type,
//                 stamp: curTime,
//                 scrollTop: target.scrollTop,
//                 scrollLeft: target.scrollLeft,
//                 x: eventArg.x,
//                 y: eventArg.y
//             };
//             if(actionObj.event == _visibilityChange) actionObj.status = document[_visibilityState];
//             var o = {
//                 actionInfo: JSON.stringify(actionObj)
//             };
//             // Gossim.emitFrame(null, 'update_user_action', o);

//             if(isBubble) stamps[eventArg.type] = curTime;
//             else target._lastScrollStamp = curTime;
//             console.log("event:[" + eventArg.type + "] Record!");
//         }

//         eventArg._ceHasTriggered = true;
//     }
// };

// (function() {
//     // events of window and document should doing something other.
//     Element.prototype._addEventListener = Element.prototype.addEventListener;
//     Element.prototype.addEventListener = function(name,eventFn,capture) {
//         var combinedFn = eventFn;
//         if(_collectEvents.indexOf(name) != -1){
//             combinedFn = function(){
//                 eventFn.apply(this, arguments);
//                 var eventArg = null,
//                     i = 0, len = arguments.length;
//                 for(; i < len; i++){
//                     if(arguments[i].toString().substr(-6) == 'Event]'){
//                         eventArg = arguments[i];
//                         break;
//                     }
//                 }
//                 if(eventArg) window._ceCollectAction.call(this, eventArg);
//             };
//         }
//         this._addEventListener(name, combinedFn, capture);
//     };

// })();

// function _hookWindowEvents(){
//     window._windowEvents.forEach(function(name){
//         window.addEventListener(name, _ceCollectAction);
//     });
// }

// function _hookDocumentEvents(){
//     // https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
//     // Set the name of the hidden property and the change event for visibility
//     window._visibilityChange = "";
//     window._visibilityState = "";
//     if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
//       _visibilityChange = "visibilitychange";
//       _visibilityState = "visibilityState";
//     } else if (typeof document.mozHidden !== "undefined") {
//       _visibilityChange = "mozvisibilitychange";
//       _visibilityState = "mozVisibilityState";
//     } else if (typeof document.msHidden !== "undefined") {
//       _visibilityChange = "msvisibilitychange";
//       _visibilityState = "msVisibilityState";
//     } else if (typeof document.webkitHidden !== "undefined") {
//       _visibilityChange = "webkitvisibilitychange";
//       _visibilityState = "webkitVisibilityState";
//     }

//     _collectEvents.concat([_visibilityChange]).forEach(function(name){
//         document.addEventListener(name, _ceCollectAction);
//     });
// }

// function _hookElementsEvent(elList){
//     var i = 0, len = elList.length;
//     for(; i < len; i++){
//         var el = elList[i];
//         el._ceSerial = ++_ceCount;
//         // scroll
//         if(el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth){
//             el.addEventListener('scroll', function(){});
//         }

//     }
// }

// window.addEventListener("load", function _onload(event){
//     window.removeEventListener("load", _onload, false);

//     _hookWindowEvents();
//     _hookDocumentEvents();
//     _hookElementsEvent(document.querySelectorAll('*'));

// },false);

