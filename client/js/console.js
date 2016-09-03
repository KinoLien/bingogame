// window._ceWin = null;
// window._ceWidthSize = 370;
// window._ceMinWidthSize = 320;
window._ceEnableCollect = false;
// window._ceFrameUrl = ;

(function(scope){
    var imim = {};
    var cacheFn = {};
    // loaded stamp
    var _moduleLoadTime = (new Date()).getTime();

    var _registerEvents = {};
    var _childFrames = [];

    // for send to server on frame_ready
    var _lazyUserInfo = {};

    var _mainFrame = null;
    var _mainFrameWidth = 375;
    var _mainFrameMinWidth = 320;

    var _animateState = {};
    var _disabled = false;

    var _url = null;

    var _cachedIm = {};
    var _disableAPI = function(){
        if(_disabled) return;
        if(_mainFrame){
            var id = _mainFrame.id + "-link";
            var urlPaths = _url.split('/');
            urlPaths.pop(); urlPaths.push('register');
            var linkUrl = urlPaths.join('/');
            var registerLinkHtml = '<div id="' + id + '" style="background:transparent; padding: 5px; width:100%; height: 100%; text-align: center; position: absolute; right: -5px; top: -5px;"><a style="text-decoration:none;width:100%;padding:5px 0;font-size:30px;display:block;" href="' + linkUrl + '">&#10071;</a></div>';

            document.getElementById(_mainFrame.id + '-wrap').innerHTML += registerLinkHtml;
        }
        for(var p in imim){
            if(p == "setUserInfo") continue;
            _cachedIm[p] = imim[p];
            if(typeof imim[p] == 'function') imim[p] = function(){};
        }
        _disabled = true;
    };

    var _enableAPI = function(){
        if(!_disabled) return;
        if(_mainFrame){
            var id = _mainFrame.id + "-link";
            var el = document.getElementById(id);
            if(el) el.parentNode.removeChild(el);
        }
        for(var p in _cachedIm){
            imim[p] = _cachedIm[p];
            _cachedIm[p] = null;
        }
        _disabled = false;
    };

    var _isCanDo = function(){
        return (new Date()).getTime() - _moduleLoadTime < 100 || (typeof _lazyUserInfo.id == 'undefined');
    };

    var _mainFrameSlideIn = function(duration){
        if(_disabled) return;
        var o;
        duration = duration || 200;
        if(!_animateState.isShow && !_animateState.isAnimate && (o = _getFrameIdAndEl(_mainFrame)) ){
            _animateState.isAnimate = true;
            var el = o.el;
            var width = el.width;
            var unitTime = 20;
            var stampWidth = width;
            var unitPixel = width / (duration / unitTime);
            var counts = Math.floor(duration / unitPixel);
            var int = setInterval(function(){
                stampWidth -= unitPixel;
                if(stampWidth < 0) stampWidth = 0;
                el.style['right'] = (-stampWidth) + 'px';
                if(stampWidth == 0){
                    clearInterval(int);
                    _animateState.isAnimate = false;
                    _animateState.isShow = true;
                }
            }, unitTime);
        }
    };

    var _mainFrameSlideOut = function(duration){
        if(_disabled) return;
        var o;
        duration = duration || 200;
        if(_animateState.isShow && !_animateState.isAnimate && (o = _getFrameIdAndEl(_mainFrame)) ){
            _animateState.isAnimate = true;
            var el = o.el;
            var width = el.width;
            var unitTime = 20;
            var stampWidth = 0;
            var unitPixel = width / (duration / unitTime);
            var counts = Math.floor(duration / unitPixel);
            var int = setInterval(function(){
                stampWidth += unitPixel;
                if(stampWidth > width) stampWidth = width;
                el.style['right'] = (-stampWidth) + 'px';
                if(stampWidth == width){
                    clearInterval(int);
                    _animateState.isAnimate = false;
                    _animateState.isShow = false;
                }
            }, unitTime);
        }
    };

    var _createCookie = function(name, value, days){
        value = encodeURIComponent(value);
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else var expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    };

    var _getCookie = function(name){
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length == 2) return decodeURIComponent(parts.pop().split(";").shift());
        return null;
    };

    var _getValidJSON = function(str){
        try {
            var o = JSON.parse(str);
            return o;
        } catch (e) {
            console.warn(e);
            return null;
        }
    };

    var _getMaxZindex = function(dom){
        dom = dom || document.body;
        var maxZindex = -1;
        var items = dom.querySelectorAll('*');
        for(var i = 0, len = items.length; i< len; i++){
            var item = items[i];
            var styles = getComputedStyle(item);
            var zIndex = styles["zIndex"];
            var getIt = zIndex != 'auto';
            if(getIt){
                maxZindex = Math.max(parseInt(zIndex), maxZindex);
            }
        }
        return maxZindex;
    };

    var _validPath = function(url){
        var a = document.createElement('a');
        a.href = url;
        if(a.host == window.location.host){
            // same domain
            var p = a.pathname, paths = p.split("/");
            if(p == "") p = "/";
            else{
                if(paths[0] != "") paths.unshift("");
                p = paths.join('/');
            }
            return p;
        }else{
            return false;
        }
    };

    var _getFrameIdAndEl = function(el){
        var o = _splitEl(el);
        if(o.el){
            if(_childFrames.indexOf(o.id) == -1)
                _childFrames.push(o.id);
            if(!_registerEvents[o.id])
                _registerEvents[o.id] = {};
            return o;
        }
        return null;
    };

    var _onFrame = function(id, event, fn){
        var o;
        id = id || _mainFrame;
        if(o = _getFrameIdAndEl(id)){
            id = o.id;
            var fns = _registerEvents[id][event];
            if(!fns) fns = _registerEvents[id][event] = [];
            var fnsInStr = fns.map(function(f){ return f.toString(); });
            if(fnsInStr.indexOf(fn.toString()) == -1) fns.push(fn);
        }
    };

    var _emitFrame = function(id, event, args){
        var o;
        id = id || _mainFrame;
        if(o = _getFrameIdAndEl(id)){
            if(typeof args != 'undefined' && !Array.isArray(args)) args = [args];
            if(!args) args = [];
            var w = o.el.contentWindow;
            w.postMessage(JSON.stringify({event:event, args:args}), "*");
        }
    };

    var _hookFramePost = function(){
        window.addEventListener('message', function(e){
            // e.data should be a json
            // { event: String, args: Array }
            if(_url.indexOf(e.origin) > -1){
                var o = _getValidJSON(e.data);
                if(o) _fireF(e.source, o.event, o.args);
            }
        });
    };

    var _hookMainFrameEvents = function(){
        var f = _mainFrame;
        _onFrame(f, 'frame_ready', function(){
            f._ready = true;
            _emitFrame(f, 'get_mainpage_info', {
                domain: location.host,
                path: _validPath(location.pathname) || "/",
                params: (location.search)? location.search.substring(1) : "",
                hash: (location.hash)? location.hash.substring(1) : "",
                name: _lazyUserInfo.name || '',
                userid: _lazyUserInfo.id || '',
                image: _lazyUserInfo.image,
                email: _lazyUserInfo.email,
                isshowpath: _lazyUserInfo.isshowpath || _getCookie('_ce_showpath')
            });
        });

        _onFrame(f, 'update_unread_count', function(count){
            var o = document.getElementById(f.id + '-unread');
            if(o){
                var style = (count > 0)? "block" : "none";
                o.innerText = count;
                o.style["display"] = style;
            }
        });

        _onFrame(f, 'change_user_cookie', function(data){
            _createCookie('_ce_showpath', data.isshowpath, 365);
        });

        _onFrame(f, 'close_panel', function(){
            _mainFrameSlideOut();
        });

        _onFrame(f, 'enable_action_collect', function(){
            window._ceEnableCollect = true;
        });

        _onFrame(f, 'disable_action_collect', function(){
            window._ceEnableCollect = false;
        });

        _onFrame(f, 'socket_disabled', function(){
            _disableAPI();
        });

    };

    var _initMainFrame = function(){
        var randomId = Math.random().toString(36).substring(7);
        var dom = document.createElement('iframe');
        var maxZindex = _getMaxZindex();
        var cssText = "z-index: " + (maxZindex + 2) + "; position: fixed; width: " + _mainFrameWidth + "px; bottom: 0px;margin: 0px;padding: 0px; border: 0px;background: transparent; min-width:" + _mainFrameMinWidth + "px; border-left: 1px solid rgba(0,0,0,0.2); box-shadow: -1px 0 10px rgba(0,0,0,0.3);";

        // add important for all and ignore safari bug on "right" style
        cssText = cssText.split(';').join(' !important;') + " right: -" + _mainFrameWidth + "px;";

        dom.id = "ce-" + randomId +  "-frame";
        dom.style.cssText = cssText;
        dom.width = _mainFrameWidth;
        dom.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        _mainFrame = dom;
        document.body.appendChild(dom);

        dom.addEventListener('load', _onMainFrameLoad);
        dom.src = _url;
    };

    var _onMainFrameLoad = function(ev){
        var f = _mainFrame;
        f.removeEventListener('load', _onMainFrameLoad);

        var domNode = document.createElement('div');
        domNode.id = f.id +  "-wrap";
        domNode.style.cssText = "cursor: pointer; width:50px; height:50px; position: fixed; display: block; right: 15px; bottom: 20px;";
        domNode.style['zIndex'] = parseInt(f.style['zIndex']) - 1;
        domNode.innerHTML = '<div id="' + f.id + '-unread" style="box-shadow: 0 1px 2px rgba(0,0,0,0.35); background:red; font-size: 12px; padding: 5px; font-weight: bold; color: white; border-radius: 20px; line-height: 12px; min-width: 1.8em; height: auto; display: none; text-align: center; position: absolute; right: -5px; top: -5px;">'
        + '</div>' +
        '<img style="width: 50px; height: 50px; border-radius: 60px; box-shadow: 0 2px 5px rgba(0,0,0,0.35);" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAO0AAADtCAYAAABTTfKPAAAABGdBTUEAALGPC/xhBQAAQABJREFUeAHsvQuwpdlVHvaf093T89A8u/Wa0TykEUIIPQBhYj1BdgJIMsEGTBQggCIIEIFdgE1ioFLlKjuVCoVdBMQjIMsIAzIFrkqIRRTbEcYIqggykpCRBBo9GT17et6P7r73nHyP9e29/9One5493T19d/f5995rre9ba++91vnPPef07cW0187ZHXj7+tkHd48duGHaOfHM3dXyhsVyevI0rQ6tV4tDGB9erKdD62lxzbSYDk7T+qLFeoF+umhaTgcX6/WB9WJxYlpNxyA7vl6s0S+OT+vp2Hq9OrpYLm4D9shimm6D/rb1avX5fcvpE9P+Ax/dd/DEJ16z+DBxe+0c3AGc2V472zvw2/c957qd9fTCab1+AYrv+ev1+lkosJuW03Ttao3SQ1XignpDw4XjNOqssY3ksFnjD3XsgTB+3WYlNwvENOFfWeMK0eJTmH4Mg48sp8X7p32LP92/mN73dZf++a1G7V3P1g4Mx3+2Qriw/P4f937htbur3Zdh41+6u56+BP0LUVrXsG7SXIhDcQ5FZZscm1G27wzBpwpTqsT2YuakNKBT4UaPZwXO80ShEiYYDcV8FPL3AfIemPzBvuW+d339ZR9ige+1x2kHcvqPk7sLz81v3vWc506L1avw8pOF+jJUwk28nY13S+5KLzweiQtwoeJBmaR6aDecGDEpQnL0ZjxZzeWe0mBsG71nKlyIWKTRh9/lXXboiGQz5/QxBPau9bR617Te/85vuuLPP2jt3vVM7ED2/kxwX5Ccv7H+4idNdx/7a8vF+tXTav1qJPWNrLSTNhqFoWIcdikFxV51CrBwuLCvAjFiNkkRdavg5yiDVIAD3kVqJ76r9nELD4S9mKuw6QQt8vYkM00fn5aL31mtF78zXX7w//3mxX+6p/HsDR71DnjXHzXNhU3wr+6++Sk70/obF6vFN+JNoFesV3hTCDvrl5g1qC3yXXNesL1YYVTAVgCaE+wqm/FKxoLdvOP24qSOWEpak7rkGJuzBjBS4UKoYkzfwFmXI6pFli2NjGtxLvHm12r6D+vl+rf2T4vf+obLb/ncQLU3fAQ7wJPba49gB377ruccvn+1+w3I0W+eFuuvQlXs26Rh4qpa0Kt4XMUzsxzAYAq9Z7PCJSoFVhbhpiqFm3Ec++WtpR67wClJOKxhts07pgoQThJjs7N5J6h58ASIm5yxZb+YdvEO9++ul9NvXLLe96++7oo/PzKq98YPbQdyHg/N+gK3euf6q/Z/7u5P/g1k5HejoL4aSbo/2ZmiYd/uMtmvEoxFmI1P4TRTDkKgcqm7cgzZywcZUIaY6smBOKuopYYStXHe7cum+GhoTOI33pSdL3dfewdGePtpVwS0KQ9326/FEm+Yr/8fRP+LT7n8+v/rVYvf3Wn4vcFpdyC5c1qjC135tjueffNiuXoDEu71SOKnqQiQrCzCVMrmRmpeycvxWLDaz4b37pIzZUMJ56R38nvci5LyoVhFYbyGrjRxuMjM6Fhl0fCqOUKr9WKDsPmPtvfmlUELhG5JXO4HvB1IXxTEtz1ZTp+B8Vsuumj55r918Ydv6V72Rtt2wLu5TXOBy5BUi9+46+ZXo/9BfJHhr69WTGHmpxNV9eqsrqR1SvZiU846gQsz4lmRJEzyUsdWTlyVtmjJLX24Gt7uVXzEm8B4OTDpqNdYdtBxAhDjUDNB+Udnqa5latuyS/yb+DYvvEqZZOXL8PKLWBIGDP4dpv/0m6+45Xew16P7IZILe5iju7B3YVg9v4V0592734aS+iG8ofS8qhtZqGCZxvjb7hLYQZaf8nHgYVImyZP5xsMoiuq3HUKVtJLc+NzZiceDIOLpfSCICopZi5x98Co4EuGvqISQBUZcE3yWuVR1iUUKM3sRY/macTaXcm3ejScKBBBeusE3tv4Mkn9y5eX7/sXet7PG3ddxzQUX6uw31s+6cufO9fcjAX8AX/N7KvdBhaOsrYJBViUhm14bxuROkhPQWxJahVVZ2YoXZimKcjMrQDGl+ptlxUUXcQVemznOVoDQmzcGBA3jwqt4QeAi9DpoycZ14VtZ5qeA5FoMJ27CFd5xRDPX03fgYGmtyWqQJwN5Xyw+i/lP779y8TPfvPjInQ10AQ9y7BfsFvBz1Z077/u7SKcfxmZc7eKrvFRm8QJpdsrTyv1RyC0kuhoGfHEXcxJQx4RU0VZPfZqxsiom330k38A3HoJDAkOjez/q5KcCGvEct9aqbl680TfLKjDKN/GaVyBegXfGWAcQ/9JD1Hg3FhA8GG7H1zp/cnnlpT91oX/uyy26INtvr1986d13H30jPkP8EaTMYW9CMoYzj1lqLY8pLRPdQZlq+Js7Z0f7zhuWkwiGwpWNSDk6uZFzhk9cwKRY4l9oZT8vLVCJHWruxL2Xsi1we6HSxrRaLCbu47/FB5dj/bPg8jQ24lvBwpjywb0clTReaaGx3C4XRwD6Xy+/8po3fd3i3fdBccE15cSFtGokzOJtd9z8+vVy9Y+RBE9j1qgAMXHteEt0da5oe5JYLhCloLet8E5kplffUvFBT+uMu6+yk98qQBh1dLiSwhVMAmmWvQCFLrOmZpQKwAXV4I7eSghTgIE3dYeLZlO+WcDb8RVABeIVmUmFCBD7bc3ifuUaiUfIn1kslj/2ustveQv29BTobYznv4x7fMG0t93zzBftnFj9LA75pUkSJjFbks1l03NA6pbpNlbhFkHwYWhJNVRN4OWqPUnIbydQ5qqoKx7q2Tqn53oGyAIqcuEgS1+W6rrMq+zz0Sq13e+22QWh6K8tpBd5Y4DRaEJ5ilPxSxkb48nviDKwjzyBkMOt/MW4fFXEf7D/wOK/f92TPvreWD/Re27DE77hHeErjt618w/xfPwDSIt9zC4m7qxVTlpmnUyYWUMb8lbFFFVe8nHemDkgrzvLGwHlzTLZTPgo1TwXW7uoNAZXuH2r8sxFCR5MXQCxQl8ySmTAHvuxsUxK1Zo8FQmpOE3QrKje1pp4K74jepyWEUcXiazxUAaunJ/s8E0r9D99+RUH/6evX3zobjM8ca/a+ifu8qbpV++86XX46Oaf4JSf7szE8SqbvWoOJUffiygpYiXlLoANDKeFF08xJNF6SREPQySbk8xjwUOMnlRs8p4wq6e289rupKuDkJ+tuvivoBVL/KEffbDGbFYBFGEKxkVmIU3ZshSOa6WORQvjBdLGSyu0vhX2B9GMu+xbbDUXT+Eb6XL69GLa90PfeuUtb6PqidqSJ0+49f3KXc/8wsVqehMS4K8zWVQSypvhWbqyLbmuTYDMz+KFgZAJSHySMnqI1dqcs8JTtbm58iNFaSrzUtAi46UC2sRHH/ty77UpSltorQ5E8Th+86bo8gQSzvTRJ375YJwV06gPR/aFHNmrGZ6xqPllLuOnXQoveMrYGL/H3oHIpQwxJoxFjXwZQ4Dpv1svl2/8b6746Ids8MS6niovzttV8l3hO++87cdxnD+Mk7zIC+EyKyGSIejHxcdilDF9iOuW4BDeXdfTy8hQviBjwnX83ErJi2RTEZJibHFV/ajKOMntmOM/Kx19pQi6jBzBhy+9oudFlA6gFUX2j8YYq4g1ZhFxEP9FQCHt8Id/zVk9bSlj6+HbtoTev+IsvDBedJwJ32IU3+I4TH7yyisP/aMn2rvMWbq26Hy//NpdN75kZ3fxazjJm1woyQjmDZY6Jk1NkoPsuRmVYxhppi0RV01jTwVFzQwTFQEI6KujbRIce7pOKKRIG4t4Ex+b0/UzDByNSRzubfgUgfC1AY2rb4j5aiF9Z+eM45OUbfpKVbjcGXDO8VtsRNvttLeFEjZBw2604pixc9clXyw+tn+5/pZvueLjfyjxE+CCz6vP/4bkXPzKHTf+vd3V9Hs4wpu8ojpKVQnzhPOkCnrIK//UU0WtknvYEieL8RQrV2THCwXGmLrumklK9E4g/Dq2ArKLnyjpMy3FRRs6KxcVv62kC0C98eIt0hRsmDOn+YgXRk68O4oFfikXBrFp7yp+oo3xExP5hvDh3cXS8Jln4Q0/4OhDrLWXNSYkXhQLSdmkQND4S1zfP49thisH6/VNzAvmBziyHaI5Xy/n/SJ++a7nHlrs3v/LOIDX5ixzGFwcz82L9MxJWUIA+oF3Y9tjLqQZmsw0XVMKJauzDLoyqj6JJ0aoysyxKeMrSirodVM2VMWcOWsT7GFfFAfjoU88VBhkGfxLRiUtGsBx+kqdW5VzmxFDvMP3WJNap/ByPOI57kKZyj/EFWiTcUBydCrH4iWDuDMIfpr+9XrfJd/xHVd8kL+B8rxt5/Wd9lfuuvGl6537/gSJ8VofUjsqHUifJQkqcdqRej6cdR0k5AOD0SWJMYSSU4xHu1MUw2YXfe64lckuFHGYP7i4yVwFg0krrFJwHuSoa7LYpR/sXYew9F/z1BME/XdmrLQCav7KTuDiboFk3gQpWNIUKzcPzfPuyVKzag3NDhqFIWmZ1fnRT3hDkL7h5eO1zBfmTdTnY39eFi0OevHLd9zwP6xX07/HmVzPAuDZtLtmJVi/w+FQlWQ8cFhyTBuCcJHKQ16VSFLZQMkbLvUFL3Xj4ZwemIgllMCzMLqnTfNLp5yUQPiMqWOLceTEj3KZ+MlG3NSxwS7RsA+PY6y5Q4KqioDxY5w1e69sxCsfDe8oICGkiIiX3HNFQB1pZaewNLEXXGXa7WVHawVN7hpyQKViRK9GmaOleUGkYZycJzb01zNvlD/n6ctlLv+8ar+GX/NyYufYW3EUr06S6UCUKP1wxkWNi2wYnjwVOnwMhuTg8fOopYZJT4dxHDx9ksceFYtoWZTkhWIwMDd5trfgW1IK7mIiosUvTgjCX+unL4UzyhOHCTpGcMeZIoz/zLmsbXBSsXmfvF+WeGXCKxBIq9/kOi0+GyqQQ6a3HgxI8TdxmsuueHWpWp89U3xYTDD453+/c2B58Nu/5Tz7tTfn1Z32rXc96+Undh7A79vtBauD4IWZxQNpAg+YL63pwGrWDtxJzgQgBVtPRB4/hWZNQstI4g1vkDEhhFcslWQChKsm6sJrmSkhawUHuWKOHS16S/JJwuD5kH9IOGZLvznGfIYvveKP/8DtPvS0VOM64aBm7PmgLE9YJULHpvA8lKnxVAzC4CNsOuLHyRB/ybv3Clg+h5wY8Cpk/LZM5hPzKhGcD/15U7Rvuf2m71zt7rxzNU3XcWOVcDil2bMokk0Hx6QbWptJ7hnxKkgAPB6SACYtoeSLZH6GbokqGgZAnNStZ94pPsLQPHbyxJc1jNb4JDQlpBvxtLEfeKcz+azCADC21tVcQQlZGAc6swE2+6eCEHeP02jPOaZ63Bfun+NlxImZ/mtMJSwUit2bRMbU+I/jpx15Cq9doKG5tD9UNxvb1mZAARyNtzViisA+Kj7Y4g2s65hXb0V+bYOei7Lzomj/+R03/Mi0Xr0FG7hfm6hk4DF5oGsOBgZKwNrt+UEWsHDpdOA05MGyxQxDJWmbt0GXlwO5DxhmiSFJIhUvRTEmP8XKxUF/Ml6ktEAb47Bk9CNsrWWUt/UZIpbEMdqR/WT/BmXPG664uFPZPhJvw1vv2LOv/Xzm+NB6X2q91WX55jND4olJx3cPLcAEyh5q+Ni/i/xSngV4DvebazynQkUi4Q2nm34S/Q8mMAbMY1BSVKYnQWQzyJiI1PHP5qFSnkQNXtw647qLyRFLJF7pweMxeYWHrXJAeFspHpgHz9Bsa36ZVoyy3XKhtxDTXvNBxmH045okl46YvlYRiAhM8J2hBxI1aBvQKQxpLa6hb2uiwejHELnjhXYioc2Ap9SrKjx5PBSGe8p2Er7Or0xtRDvZ1v46OMVAnzU1Vx1W8OzZ8D8n/dPXX/WxH8ZeRmTFOXStLTmHIqpQ/nj94gPvv+PIW1BY3zpGp0Pc2M4kqxZTp7y5MM51QHVYTmXKUqDSKv9Hfxmn8JJgnp8CbypAyyvmipG+IlNP9nkhxB/7FirHeMzij+DUhtSgAWUgegVS/agailqY7RfRGNYM8sSYJ8C2rGZhd30BnYB8FRxCY2wSnHShynjaJNbZBmCJZtsES1rrPilWGDfqNqKvxa++4KrDr//yxbtPbPKdC/NTbNPZDe2t6xdetnv77b+Jvf5aHtb47M7IVJcbZ9QKN5lePeVpOWbJlAnkrjbY64yb3DZ17jFG7wBSvM0chMEnIVr1VQCOCVoZOAKrUsBDXCAuWFyALok72MHIMVoXDHv6V8JiaJcd30hrUNugmQshTzNZTe+zJ5QUQL4UCARNrmCMy5NkK/KCshvj1zw6rS17g35Y/8yu7P0EIJAlG/Y5jxZfcIi459r0f++7+upv+vbF++4t9TnT6UzPmWgQCL/htNq97+04wK/QWUPm3hs6yqhI0eRZtE5eS6LtZhvxLh5bdLzzbhPHDGRC06Nty3cRKhkVaexs63gwds4q3uDJ0FoqAIImLe5mszFIPPRR9O6DowF50aIneYlqPX2+QT/DdQ+0Z+FQrYvtSMppcyRx8zXuj7moDx6SDZzRFRvM5JP2Nbb+1PjQsWcjXg2BmwuzglOV+BybFTD9o+W+S19zrn2DKqv2gs7y9a1Hn3XD7rT7jtV69VyGosTQ7qc0HSCDltjTdm1FOBwQs4HyYGg8X7Q1sohC52scqRgH9Um2k9n8hNKIhbefFmcWI75tXGZlfKOfJBPlD9a8fiDK/2hP99vko43iB9ZwXgukfeHF3PSjGMtEgA2bzltGRWV2c8XG/voeO05IW9CwF75bJkpyRDrjq4PrBepindlkstFzbQUH+eKD+xf7v+bbr/nIJzbMztqUu3dOtLfefeMX7Rxf/RscwHXKb0WV8qiiqEilhyEPSwtoh2uDFG8WFzvONd5i356JySm9c0aMRZDCHcuL+shlW3PJK4CWAFUEiS8+PacTNAeoYY9/vn4tusxlOLtUsJRlwTN9l6vwFL3d6go44wmL3WRGix5L4o+f2ArfISiAAdOYwaWNGcIERvz0j3EdQ8djPcZoIKZxafJPXxV/dD1O40zs1dMjIxCWV02zcdWvp1v3X7T8L7798o9/IJxns2dUZ73xDrsznfgD7Pd1SQAGpWRuh+Bt7QXjQ63d9kGVrU7cBDxl83CuA+GAx8QLrtBzxmHTS0Z1T574MbDwLVhHNdCTvbXmBpLRT4q9rykM7NkcVOws6QUlkwe5zIoMizBX4u9LJk289hHXnyKAFn/bWryBkFHoIGrbZhHFf0oka7IR19K9BmgeO2v+t5HD8XZ8cer8Kv4BH4858uY3A7LafdKDvw731v2LAy89F+64Z/1zWv4Me2J9/B3YpF6w2E0VLA8UY24yk41/evPGck797HCZWaoOKNLTcIAT4xPRQHjq/awMTzpw6qoRO+JNUEqmDguCsUhxkq1CKmt2TAr7cm+ci8Tg7oyMXvsgA0F5ks9xPLgRMvNx/+i7YYaxAtNKvJqsWVi5xwV/Gb8uNebcW12ssrVnSnyeicTQFkFBqNWe0AXJyCnhiDcxIcFnHzteBLIw3IXLcdbT0fYZLi/M/oaw9CWMnfXOO5iv4jmLl7NatHyX+MSJe9+OE3pu26A6LO6JEkO7jC1VYsWKBeIUpCQJQRsXW9lxTh5xBYsJmo/eY4A0oD/hezpIRbkSIxRlR5BFhcc8eCqUCOXI8cuNMHJJXbjKfoxfPmsFHie1ehJSkp1gLBw3q431U04bOqUfNwUAkTVcsH1ZFD7JYCKGgjA071kxkYJ4einbFlv4qRU+G0OMeciiuGBAKl2LLzGVlJDWsmfEBE9l88NY4p9GaI6Lo9qLknv9lKOJ0D3xq2n9XOYr81b6s3Q5a0XLz2GP42Md7N5XeHO9yd5p7pc305uNI2pJxp1iYvQ9DYYa2reDGxJQMhpUC15THSjTgAkVPKbBy/2QJhgyPsWt9Omnm3gt6QUwj99BxC25pEdn/+ZPMnK9m3jy04o6jxmfouqySngItuMTQOnpm3/kN71siKcRWxt4/Zh2Gi6AFo4pBW9McOiJoSEDLzGPlzzmkoHjiP8YVk/o2HLm2v8i6/sHy/KT3vgeQPAMSnAGR0w5kp40yFfmLfN39P94js9K0WJjF++94/NvwYZ8rU+pDis7xB3QZmEDsxuVGTqUyMqsTEf0bEzz4NKHl1ifi6+0ZWtJ5anxAAkvU0xqHnzLr85gNJ2VMv6LVmKpcAmtVo1JScwmIz8J2J8ZzEcJrENghA1yHfAR9fjpaWSFBaajrOBa/2jZ1iP7xiyCmV3xN3s61/7BD7Ey7ghFlCmrKPjqKWEjH81iqoqrefMFvPltT5xb9lPeOocCiw36ipMSca7XX8v8xThhDMZnfnhWivbNR2/6ydVqVd908rp5Lnk20+5J7GdsHUkOTr22r+1Omea8tLExy2HqWReI+KDcntNzZgkPRi+fMBUeF+Grl1myADZGARGntQDLedByjAubAZTFXD3FBECuxBBYF4j47M+9IIh/nWw1MSelRSA8DUlH38JxTh7O53iKvN5g7Ed2NOcUqrbkjGVuDN0pLhgrTgoILf/WQVDmjYwiYil3cFB5/2taJMkF2KGJlgMYCVpj8govTmrQyIehMSULg6a8gGfwnzgr/IQmO9oyf5nHpH+82+NetL90FP94fdpt3yX2AftcWrLWDkfHTeLGc5+5vWNSZCY1dxgGSvDsdu2ouGmEpjF7zdyTM7ytQGIg95wEjyEDYYPIGqDFTwUfZqOJZtBJgsncP3GU+XH6+M0mPEnZ5J8cftCb1++obOQipQ/qg1c8wldMNoAJbWirixYQFeNL/PEtSxiIr/wbC3zFGV+2xTXxF6rFD3n2v/lRJI6lwUjEJr8VE4NE7Dn/Gb6WUiB0LbASIUItsop3tIepVLUfXidXuPpB5rMJHr/rSXtwJl2/+fbrv3O1Wr+FPrA1Oi4FUEUa35Zh5jOIWChP/EzMzSOP4LQdLZV4fIalFEpx0aebpDgJ6stihg+p8AKJwOAa8pDNX6QDt6MhMFGVLUSKO/FBzxCdFJ0nMvZqoqpIMy4QY0giaYEw46qUhCKQU8Uquw18C6Do5Q9j0icOysYxl5WikH9yqmXQzzcS7wUiaLzUKFhuSqFrMHNm9RgejbO+UT6PiY5oWHiMx302nkydQXpO2RjKiCkznR8UwS+Xi9e/4epP/nNCHo+W8M64rzcfveHlu9PqnXgLbr/ySB5TMElo9zrUisgJQXkJtJGeREQNx7XHrZccQG6uiisnVmQPCy8PZIQX4quTJOONAMw/+FdkiooXMyrwcKaX2jZ0NfDLhTAhQB9hNo7ztLZ+CCCPqQc2Cv/YD3AnZ62/JSwMvD5yilW9niw0N0N/8oivfsadAPjECaH5WgSzec6SHlurwJuO8zTtn+OjaIw/JtngFOEQvhYp+bD+htNA8e7sWyxf9YZrPvH7c92ZmT0uL4/5K2LwC83ehg+o93vtPu4cunpt9CDnEA9vGBdfAptgPhzMOINeJiws/O14UkiDAdp4sJxKyIufSIql4wkd4DME5ZUXQmMeFiVgw7WBAcE50LmDMp2FOcAdbxf0dUJGcT26fE7f1ws52swPBUV9KrwWDJvOg2IkDs2uPZvhm5aDjtQsAYSk2OYFDO6cIeybKdmCJxlb2VncLXMu9N+kGAiPPucnZeRmbNfOQQatA/8ed/025nkzOoODM1602IzFPTv38Xc6XccN1DK1k35G9aFQigf+cvMkg22Z6aAkjQA9N67LvEPmrm2krfYTtDxAzH0wHusODphkwwaLU3OO3GQbPP2SG5xywQsbnaNJB5Fjs8yHHGZFCYV5Bi8yJl4y0Zq7wm+xlnvNHUu519KApv960FvH93GXwbBiZy8cV66/uFBIYzT5YtxUsodxZDIo3chBuB7BywfwFYDjN7/31OwMgF7YSlu+HMfsTMBFusgEYmwa2BWHkbCf5w/B9uM1ybivLesfcGUNG4/Afp3y/HF4R/mMF+0v3n7jj+Al8au1f9p9bzC3cGzaUO6Ajqg2UfZ1SKMx5Ebbjiri54xFRZ12tsho3PCcuDn5MnPvYiu84oJcLgeugrTDpirq6rdEVqgYJn4nU/wqE2GpbREC9uFsi7VA68/2MQSa4kFR21Zx+DLjlAiWxRn/LAK2cW8skdiXEpCvrTNGgy7GFm0YhK6C2tRWWCpKmSIuySo+yuS/Lypm6iPOumQvzXBh/CSFc/lnH/4QDOZc7axxijxXvs8Uj/0k+/PYM4MR76y9DL/G43fhZD8PXpuAxXkzMOBCKwJuKA/dNl0hNS8RoZ/jTeBrnkH7cozHddj47oP+B3x8dLhGPmwq3YhPIrdEIE2tka5EG4h00NsVOq+VbCWqUeIPkBa0qb2RdZGj034NDNokOm5wDjCnE62/vGl+Mj77n7XRN1v8e2aJCrTomzzz6rPlCqn5h3LYv4Z1kJj2vek6hu/cGPvRXYf3s5nhmVvFnZ4hOTa59b5hbxK3BWTZjMkb2JZUjhTbcrGznJZf9V3XfOJdJX7MuzN2p+V3NPGW+K9jr/x7nbSr2SRuNxp2jH+yKRpLRZltNRguY8EYT7QP1TzdmAei1k8BkDpUKuV/wMe+YI6Nk4pX8iQFtOKA0AGIL4lQptZp4otNmUBU+cqRimDopSW/bAYC2tR6mn+og5+HSryUM/Gp8IxHiSefnBk/rl6xwr8i0/51H2XeQlb4dq8wClTxg534WqPj9zqK0Zjh6tSo9QebPkFWbISJesBLhiBm68dcdsTTMfrgElun0KoHfFuq9w1A/E7l/XjD9dfP5HeUz0jRYlMWD5y455dXK/wicabTsBEZe495VBx5pk3TDllGW+k5rQ1VUrVTDRoG2em+w/JLqFrpjQeByAufoGLLfvBtjjjlzMHo8GlHfIJv1EZZ19UxpbZH7yKACM3c0sqYVv0u0cfll/5LnxCMkEI6+mICxieLUWPw0wXt5VdLpC6W1tMi6/P+WUI72XY17KDDnHYUy1J6bozl9M+JbGiMsVzjao1huDYeF5AEXAwVpXNPW8mp0kQm9GIVmDnWeQy5YFkB2JkaA9rqKlyPDLGWD0cuU+2v4NDhP266nvkPX5w95u2MFO0v3X7938OKX6sT0AZlGxN/bYE2hTKvzQdNW85hgy7Jhp2LWdP7vKPQ9vtQYMEmPHpa6AQUCydoGM/lPlAdqvSyGnzGD7HdgF6dUAN+0Ct+ORr5ZKDAuAbOaKIVaFGlr30g0hQlj7ow3M1gFY8DJAwjs8dPCdX5QubYeA21QMnb/isC2Mm3Lgk6cCc5HHmby0b7DB9xQ6cDh9cVKvqnAVqDYwBhxFZSXwYDr/KnEdiy7Y0ogSlYG8zwdBVPtvX+Mb7BECSioajEhDX/jA35/4tHb/hhR/HYXtsSHivan7/txpdM087vYTH7kzA9cSvBa6HR2zdDgV7bQQO2kvHgS6SzwthnZj3t+sjI8RpdGKNTsZHYZBKfZEu/FFaLXiLiFBj8RyG7IVjoN9e/4VIIroCJMdJknNU5lEgJy5g9W4It/zP9poz22/BmaVrAtEwKRvq4pLxabUURGMhE9vpP598EseCsucpmoZcMwaSwZryIR/4rlnTeU+9tEQiv88L6xVVrmeMdwYhvoRR5dq/56kEn1p31tO+V33vosf1vNh/TO+0v4D90RsH+GiLGFyj6krzZPPzanVL5GLLZfZOUTLHVxjpxCq094gbm8Nh7c7ssG8m++edkIMmBqa8TC2czq0GbFwU5e5bAu06UvryOnulMGMcvWY3tkySmMa5TuoitJysDH2NwuIqi9sE24fFCrTfLiI6fjk/ctQ3yJi1gtsIgFJTBMLZtTH2EPL+4R9/OvpZEFX26H0wLL6qyVQe+lhLhKFtx0IfknM0bJdo9G8iQUJ0BdB4zRuIKPzizZMO/8LQ3j0JR0LSmrZ4Q8H7Ozq+5LmT6mFwe06Jd3/65H0fANyUyLZaLx4p8sF5+WyAMtcS2Qb7T6iihUF8bLXyI0RNS1NogEoXLqVD4wuhgOKYRmwgwxVwbbGknxTyHSlXGhMtPy2AIKn7amMtOWvyYCg+98GVHCvt3Tz+ipT0t8ZfJFgx7aSiPT0Iwji72spSQGwi28n0qPAnoU7w1pixN+Jo7ZidxxkSrKRaPw8de65cBZ15XHa2WbHCthaRsJlc/+pdutn5JKgLuRfkHnvvB2Pi/FZoWOvwVvAIwVek1sQ15gu/7JzouQA+HaB9yC3z8K6r14ibXhWaPyaXCfvRcb77rmV944sSJ92FnLgqbE6gWXuvKntReevMEKAOMZzjvhOy8QTDAnm7FyyB4m3RjObE/4tMQkFMeV+C1IQqyXFBWc0J6lCaQvYajxmMVkzgxj3rWz7kr/ARuB1krZo5vSAroGJpNunzDhfi6rNu1fbSnEM3Wq5gIRsuYvddTAUjr+DjM+ZVRaXsEs6QuLbvwxlKqOJXe+8V9YEsYmtR8HItHeEq9bsUWWQiqD+/MVl7MOppTktAoV6u4go8YeXB8/4EDL3zDFR/9UGSPpn/M7rQnjh9/03qVgvUpt8Px7ukMuTFtkZBznZ5D3hQbS5JdWY1GwUs18Aoe1jlX859CZDwwbQfGWNko96imnuX/l21mNLVFty/lyJmx+zAjkZp/kkCuNeHOsGJcwwNztl3JacokxBuV+M+NGL/sdzHmvB7Rcb4q3WoXnJgHH1tx8EIV+k3/nCc2Geni+BVAYUtcJuYbkzi72vZvxPUdZBDiCIP2rfbGPlh+MBsfG1zCypHjlP3MxmsVBy6yF6s8YG6J4sfQ+HKITk+Y5NMjeCqMzxWxX8T6yPzR9hv0j4zufz96/evw7wt/PWgulcT9TqNJW5UX60UH049gU8K7H9hIWHs4w5cz44nlJqKDkSDY0PFOSYtQkce2lHGCaR1qw3AeLuhtJdN2sSxkjbKtn4Z9L2AnU/M6XK7ROMWDi+0dj2LhmqopRK2R+kiHnkVJQrQK35OSWYEr5toDazU2H/wvbcz9oH/aNV9UUb5cokMvIsr4dwgIIOvpgE8yg46ijda0dFSBjeeRMWG0VRjbODbwpqonGC9Lazl5TWZ2HDZU/MEMvuKCvQIp3RjjuGZSLJfL//q/u+aTbxtoHtGwwnlEWIH+xW3PvuKe9QMfxIE8nQIRznaDMkq9FTl9JSIBWfSgNktXjHgn8zxR5vS1pGFXhSn/5qLjuRdLIBuSReOBRxjofZDxU0RFkPXLJqRDgOTEE5z3BMa2q4SyA/7mP8m5SmUXeiUHLsYzzrKBLX1Kj95yzzMe+3EcevzTMuH539dozYmLhUuf1fNTR+oZ85JEZZdlCkthydFtHq9Nc7TUM/AERS3HaNoX8VBGQXFFRiM1k+UJIedrXvLM6R2bKRNnHJip/Fe+bMfXPsG//FSADa8YOauY06+nTz9peclzv+3Qh++S8hFe6ttKjxAN2D3TsX+YgiWLAudKq3ET24bWgUSng9GCIcFCuV1euK+c5RCEAd7UNp7haVCbJTe6gIcYgammB7f40oy2FbMPgTAnpxOxMI3LPPJP7NDkC1yb0tjqZSbtYdDGnPPlLsD2TzTmfJkrHRUcACMjwQtvT1S72DmwnqZaGoE1rmHVhlDTelknJBwTElb8wQkvpVmwi9y5s1boicxeuejBQYfU4K/2DzNSUTo2FT8EsgenbMItjsK3BZhBZxE98WImmn7cJ9e8CK6F518RyEfG5Z84B+AutjUjRAjTy5cBwcu5jERD63LhuPoU63466wXy9ksgivBhdbNQHhYSxj9/+3Uvwpek343k25cNHQ+LfJpjo+OI68kG55y0SK9Ye52zEh7W3PQ62jI1m66FkwOQa5PZGyxvyA4rKGMszbHtFBMAzYyCai3+EFNeePnAtOMGP5I7bsdPoG09CI53XtuliPHeAJTU24PlGKuIo5OJqFDJWpPsKs5gPYVed0tF0Mf1jgZ3mHow+w7KOdxpmcRhzjurii3y9DwZPltQL7shLiCJVhMZ1+RY6au12sCm4zyNvMRgbimvjVVWyY88CTR7xog/lpug2QrpS5eFe/C/Da+YigA+5K/iHGgVr+Ku9ZW33cW+xYu/9+pb3zvaPpzxI77TItDFzx99xs8isn0+XbitgxkD0IZJoB3E3QAb4pUQ0E2zX5D5fxmUEejnG8jUcCMPbIap5ZAxicJd/uKp6gD6Sp7CJyzjihs2PX5S0t8IKFaKpfZch4g5G+MPxHdT4yVDMHxjiQbE6A0ixL1eVaJBpo8qeKcjF0wvWV49XXHxM6bL9187XX7RddOT0F8M2f7lJfhwPI+D074aE7ezvh83zfvRH8PjPjwemHZW908PrG6f7tn51HT38Vunu07cOt197FPT/auj2rkFClrHydssBvjx1XOsR3df7jHvwprDifYcMcJ2jbF2ovaFMTB4PVmKtM+9G1RnJGs7g2yUk7OYNYJRGVMOfE3twrGNeOn1zEM47R2gee3fY9KWdIxLIl7YOl6z2IlzgytrJgr1gnP+WcT1cuyHDUnwMFoieBgQm/7cbdf/t+vV7ps5G+9c0mZDqCt9Nq+20pha6AyfZWiDvK/BkDtjYWRbycBxYWiXlgPUJsOGOB4wedwCnMOjpY0wQ6xci/0rAI9hR7kkpVcRgmiBRMnnhDymXdYBet4ZRYsizcteyVik6+V0zcXPnp56yQunJ1/y/OnqA18wPWnf0/EMeTFDOjlYOt6y/pNsJdiwDQ79Lgr6nt1PT7cf//Pp8w+8f/rs/X863X7sFqxrF8XKN1MQGvYQL60w4T4MMukYBuS6c3ufaJN9IQBTGFHo/Wp7CVnyhCZZEgHap5Lk/ISWkRgJmeEliAp25Y1Wc/+KON5g1YfeUxGZu+XCGP8mvuxFRLsBn3Uvlvve8H2HPvnPons4fWd8GCh+w2N122c+guU91ev3Zmvzi+dUxOMB6QxwyUboOAvojlfuIJvHvdgspf4kfG26bTHRvONLXQSZubffUs3cY4LTnMVPM2cTOuBxQIKQCg+KpM6YRYqClAw9b7J6SYuindYHpusu+zIU6YumJx98wXTNRc/DnRMFCptZG2OK4lQy6oOPTfpg2W+TDfKd6f7p6PEPTJ8/9qfTZx947/Spe/4jCvc4qhVQFOc+4jlGrzs078CUcT7rGQwF7tu5wWgsVhi4lWmWEHF6y81FPM15OcneJtp3xqP9LxIWMk+N/bYm6TZ8i63n3ynx8cUYs9bF8jP7Dj315u9ZvPu+bbjTyR7Ry+Pd2z/7RmzSU0nsTejBOKmxMdpBux6GOpyW+FLzwMhThV+7LrwUPIfaaXYbm6wNJx5/am/tFJMcROMWTcVKa+K4gIojXTtU6inkpYRKjorVY+poA/+sQhjrbkkQ5isuhD3e1OGmyIRzFO3+6dLpxstfMt102VdNTz/4EhTppXYlluJFN2t2YZ9RUJamWDHZJqPNQ8XTtDj2T5dMT77oy6an4PG8y/Fy+/B906eP/eH0sXt/d/rLu/9wOjHdp2LlHuxD8fKdK/zcxqlfVueui54B6C4Mcu5fa4m79lbyQZ3AZ+eftZCzcC1Xilgm4LYv55jOavDtPGH+gAd/ZJt4yLMFz81JeFlHwomcNtoEUJgz3OxXT9s98uk3QvUTdPFwGkN7WO031l/8pCNHbv8oQIcTkAgQYC8AU2bdoxMXFzcHjaeaFnxWTjUew7QsLdXhUBKjwTK0OQDO+/71CaFpObDM2YuHAYwNwjUrDi3rJXcK1mP7Y4Xu4ksNfAMpL3tZqM+84lXTDSjUpx38K3i56y+QZZ3p7QDX8j/Kx3FfvxDzS9ubuXg2K5sZ52AQOfttbTUdnz5z7P+bPo4C/thd71QB79sHS+yTfg7GWD8DYyEpZC0KfvmuMxv3nvumj5Ek8bJzbrHJmacAylTdrNBMa3UF7hLr/sJlbvhDAPIHAa021zv6lC2BBKBxTvvg0ktZl2147MuRQ9dc9cxvXvyne0bbBxvb64NZDfo3HbnuxxDlP4pIcSvicRug5Slk19Fb663g2MvkQrNEjBKNzWa70O3oOZjteLqOlUewA7l8KqyOD5f5Y82eJLFzbC7MLtYSMa0aRuGyoOEFd1XK+A7uCj/AriC/6sBN0/Ou/obpmZe+RndUwE5qm8sfDUZdxqNe44SLyTx6CEoX+YjdlHG+2QbqTVWb802uj9739unPbv+t6Y7jH5uW+Hde9Mu775KvofkGFQpVY0So86YYDzX2CqYNMIWdgreq5ZUMDdN5kwd/csZZk+bEF2X4LDe+X22U/CFGxYYBY7TczNvxFQ87JQfiUV+xYZzlmQt2i8WPv/Hwrf/YyId2ZZQPuf3C0Wddubs69lEAruYWxrHuOJlAmTsQib0N7jlns70YhjmX4zbiJYHKB2s2Hw41xuRQ21w7DHVWRzOMhUOcjb9i5rwdgnwFaAp5oa3dw7YGuoOad5dfDxyKdY1iXa/2TTc+6RXTF135TXhp+WIGvNEqsJm0yxKF/MOmvKonZFMemuAy74zGaC8hPBU+uAfvRwZa9/nnjr97+sCdvzl9/J7/gMB3VcC8s/IN0+X+JYrXO667MYpa26vAyUG7vgpb+pQzlrd2fsYngqwvG5XCs97nb2iPV7x9StPWGl4HACM6QOdYbBbosJA5vtZDLq8NaFEtbt+3PPjM77nmI3c2wIMMHtbPtCdWx34AH9mgYN2U7LVxWogOrZ5dYBK9+mDQexOsV+RccW0EN3oLpdNBC+6bpSK0BngS8zLga5xD1CaLnxsHZSnkHgQ9DJclSfG/0tMQDzQa4KH41fNOys1Hge7i45t6KbzeXU5fePXfnF545bfjI5qnAEQ8wWwZKwCLZtfyBVkQUWeePkycZ0zbTf2ok74MIt/E06a3aCnJOD0Zxpb5Wj//PuXJL57uO/TZ6f13vnX64O3/57Ra7ugl8hIvQ5Z82Yy7L3/GR/3249eZwFP2HZQ5Z+UF9RxQjjHPlNFkA6JWVFLwwrhsJ64kWEDQyYIXNkCEwlxnXaR22/M7vITYAwcmSXHO8KWWrEAYX72zOvb9mD7ku23CJMVp29vXzz74kSP3fRwAvQG1aSyi7Bj6TWLOs32bWM5neMxq7Q20idcGbjjJ4bJPKOKO3RgAx2ixsz8YgpjJwNY2VzPMWb/AMdE0xoBfxOdHOL7LLqabL//q6Uuv/m58PHOdjYVNAEWkbjOY2Izy0X5zfHo7stEibXNu7Tafp+cNX2cfmU81nqZ7V5+a/uPRX5xuufsd9bOuf+ZV8fKdZ92Fwc6X0Nh/nYuccY47M8YpO42yuA2XPrPx/Gs9sKOOuaFCh7iOmUeOiZzZpp0/ZR0vQ+hOyosBH5sgx3nGJ+Gn9WefdfiyG1+z+PAxR3H6a4V6eiNq33TbtW9Aov5S9kjrYrBoesZTsmvG3RlkbTe0Sw1fxzDDUyaDDXz5sa3oxc85NzUHwT54nUiLw5aktp6hyFHtow9CyUJGnaJ7r61kuJOzWP1Awe64YFm411/20unF13zvdNX+Z5OhO4pDSNzs14FQsmn7YLJRz/HpWrhpc6px8Nv0mzLani7+TX3w7N3u2LllevfRn58+ee+7pn18h5k/7+L1nl8me57CZcza/yF2HhuPp8nLhWR0Ib0MdI4+v+5/Hv/wNFA8pFBxpzjL4chAm/AEppTh1qA9JHxtY/D4yOy73njoU282w+mv5eb0Rghi8abbrns/9u555UtHJ1QJsjkirIJQMWE11KX10SgZipRibVR1W/BZqHsHIF86XG7n6KWsbJa9bn0PDQbwNRwj5n5WnvgGE2hYrHw5nH/mtotfJnLVgRumlz7lf8TLwS/Jgk7RnyKAk2LVBgwcWe0gasPT6WJ0OptN3eacHKMs49P18Xv6/nPH3zO963P/y3TniU9M+/iLiXi33Yefd1HIele53rTixlPHA2Mx4F/KqNe2bYTBM9psOU/v/gjQcSfVBAte6ddMM+BO9DwlIBr2aiSohIpfJQ6dV/ypE0pm+MX0Z288dOvzoW90tNnWRLdNMcp+5ugzXoMf2P41HceVYttC7/hwzQLQq2iHORfmwjqZYIaXP+9D4OENvskZcO0CddrgijcbNZO3k6mVMmS83PWeO0FUtHSAotVHNnwpjELVO8N4k+lFV3/r9KKr3oAnyQf7/4W5qs21bpMxFu1A2cdms9+0y7w2gNNshsbjfLSJnP3oI/JRFlzWER1tN9vpdN12hQ+I3nPHL03vPfqrKNiV32VGAfMOrG9bsZBpro+G4LdolU91fq04RFsxwk53OwCSB7ajHIbQJxfasRRGmmGsfYQv8s2buZOP1MmnE8j24PExbMHLh1C8oFGwfO33P+Uv3+75qa96Dju12hp8LvmDItW0ymVjDdzIircCtl3jjpJ2EGYToxceGtJ6g8IHSwgDz6BtIsnUMCijHJT2ATrjzS3v3B8JO5SOCad/fUuJH9fwzsqXwPzYBv0Ox3hcvf8Lpv/y+jdPX3rV9z5IwSY4smZMnxyPMs7zoHzUYTqbj3bUsVHGln7Ec8wWXfrIN3WUj3jqMw+GHJFRzxZejmPH8akbn+y+7Krvm/7mDf9sugZ76v1dTzsnsN94glzxzT3+OKKCAX+55Pn287NfH73H1I3ZR/vERztambNiMwzn3/GywpRI8ZWuEIzAKx7kxPfYyNXzOdwND2J7sx3leEcddfbgzbjT2P3CHdffvLOz+xf4bqwisHNvAsF9O0zSgnOlcMXajGyS9AXaiudS8LdvPFcngRyMeAmixoR8vLL3pnoTI5GWG5tDbbQgYUxpWCo/wqGMd1Z+/qqXxSeW05c/5bun51/+bfDBbxCcieZVOCCvxCtLgJHRd8bpI2NP+8jTR7/JtakPnj3bpj54ax+LK7/b/P67fmX64yNvxs+4+EYV3lLeh5919QYVtlo3W4TBl8pKLUYFofPK8XnFNKLNPEbNcGmpRAiacqFyQgIaRM5eM184pnaUOZjEQf6OdxyDz+Ka4euc6klgfeDA/i/4nqs+eUuZbu0e9E57Ymf1BhUs4AmITA6+3DtOOdBmaVchrD5BNjxUwkehmeBYAv4AZ1sYaJeta3hPvXvyvfm86mdab4QMQqCQ5B1i+lG8xcdw+AyvgkWh7p6Ans/2O6vpID7peu31b5pecPl3INpHWrBDLMOavRvjohgJbcee+k089WMLZsRFRrsHw9OG2OA538TH58hFu0fXuKcvuOI7p9c+42ew11f5HE7wPHgGPhemEx9qcM9fJqD4FApzwE/Syp+21h4n8ydwcvjso2ePRznpttFTO45FAGHJ2JM/OaWx1WPM9Mtm1BgNd32xYL3Z4tTX0xbtO9dftR9RvN4r7RtCl3bnZSiorAc9dWMxaCO4iEEuPNdJWbGZ08GOeOuBh4HkBmXlzVc2R3bFSbbgSdB8iQsU4NLPqLDTG0yUI0n4Eo0vzXZQuIcPPH/6+uvfijebXuTgHvF1tsKBhXIuamyjbeSURZ5+3AzKwhN9sOwpizz9iN+0HeccB7M53rR75HPuMff68IEv1t7zs2+eBc/UL5lxghyzXpmHPFMK0Hi2Kaycs+QVtmS0rSWzMHn+ySlj5nlK24KLv/sCM8FolGkk7g28NbIjUeIyJ1Feg+ImHvWmujNi6/W0RfuB2/78b+Au+7QgRew4IXKgbUE1yKbprgjbLJIcDcpJLbTho6+NEL4tqJQDQRZPKhJzvXbgg4i3md0QAT+8pysdPrBMCH1HGM/svNNSzjvtc6/8W9Nrrv05fEniED2dwZadyCLTR07XkSUMzqNPP+o4jpy2DwUfm/TBh/fM99xr7vkX4WufO8f5bj1f7eAk8UahvyrKZfWTZY71WeJz/GP+WVPy2pe2uspHbhEtnH/2M2Os/HTClQaA0c+IH+W2ppateZZD2ZFnmp7GurPN9utpixb/Ue53K0ZdsC1amJ8Z6MluXbwtFNiw0ZZDyYnXHLYYO8DCQx5swwWfhRXehMabx36IIwl54hcjmVtFX/7DJ5V8y8lvOFEOaxQp57t4Sca76+r4cnrlU39sesk1fx9vNj2sL47R5aNo3j/G31t2aJRRuznXDhRs1EU+yrbhR9mmbdE+Th33/CVX//3pK5/6o9Ma/w/dDs6FT6J6uczi5Vss6PnvkHmmyin2/KPQq8fSlb6I23nnvuUhjWVgQ+VPbGut4pesBIVxrtEZsewcByWOp+ypQ2NsbsY41gFf62DdleHWruhO1v3CXdcePn58/Wn4wUtk6LWw2iAIuBC3LmPkkXLgmTdPz1zcYC6MdIXWDpO7NqLJpeeM1p1LcYwE4WRvp2VvVPD2CKD+VswcVwKs+FEO3hnWHXdn//SfP+N/np5x8OXiemJd+p6eL+v65AO/P/3bW38U/5ZxR29O8VtU/DxXn9/iDSv9KpzkifK0r4yp0hKOk0o1JWCUzEnm3ynaqTSG41p45e7ITz6oaXeqXaff9gRCe+Jx3zh4cPH077niU0co2mynvNOeOLb+Btx98P/KAqJAOABhFcf4LGENw0KzUwcLW+LHoIw3jzYqm5weFOYjWZj9DCqJCKmCjg84bD5owEYVOyjY24axKGogeLdFkbJg+c5wFSxfFi9WF01f/YyfeIIWLPfCO8LR+dKuv/jl09fgTBa7F+FjIT+5+kcYnh+eaJkAaOzao+ZabvK3eqUaDPnHuHrCx0Q3F0m9U7RQZjcfHSNnVEKXm1FZC6xYCh9fZuUVf2jAmBiHejrWYD/rj7Nt7ZRFizD+q6GOOhZCOYNkXGALxv5t3wi8UK0+ePQzfDaFvM2bR33B9mn/0IlDnWKSO7oqAs3FVRukMYpUxYpJPsrBHXYHBbtv99Lpa6/7qenag/+ZLPcu584O8Exe/Yyfwn/+eqnOSk+0eB8iP+PyPQiet3NlzLe+BklhlPxR/mHOP8mx5DZRlUYsqdZUnCo255+sGif8VyESwHjYRjzt48P5b6NQBs/6M/rka+KaaX7u7pufcuKBez+FbwThhQhdpsAw1pQwh8IFN5tisUbLKQkXADtEZrjHVGYTvIBmrkFn7nbCNJ+eNf8EsI0BYEyviTNvPOkZGofOl8N8k+PA+knTq1Gwhw88zxx713NyB46c+LPp7bf+3WlncU+9VMbJIkv5Ujn/9I8FwDZ+jlvpBymUYy5aQvOZ3AJcU00lcFH1/GUqNn/gVYYr50BHOP1pZALilfOUl6q76Hh8/3r3wMWXXft9l9/yuXLduq132p1j93+TCpZeuUA0O9ewLowWfxVxwqMVC6SbZNgWG0F42yLMZb4YZeGjH+jkgAtkw1Vc8Awu+5HCF4emuBQqEXoTA3dcvlOMgl3sHJi++tqf2CvYYdvO1SGfVL8GZzXhzPTmFM5Pv1qWucg3pvDoCcjUqNyEeJRnQnEbK38ykwKTfmcsSaWf8485lRuO8y9W6SsBx6nGSmLkolyoV+5KAAPcMFWHwQ391qLFxyHfyOLT30bCZAdSMXDgZ4y+EVT4Qa2aKTIDnhjyGK8JtJwJCWU2gKCyai4UE+XA80+zFUH51yYbSw59AE+fePmUh77dxK8m4qMEvsx65dN/dHrqg37hn2x77VzYAZ7VV+LM9KULnCt/vtWYeYBs4asp5Q7zhLnGpGPGKO9chLP8kXVy0NiskxjmmXKuuMzT809zukCzJ48VjrhZ4HP/8sJ8t6lD1Ji+FC1+Vp+2/lx7UtG+Cb8DCu/H8XeyFgX6rLsc0FOIKdKCFJzHlBHuoDlDKz5PjBcJ3YDMG9HxsRt7mo6tYehJGwotezS607Nu2xaoIOeBsmj5PdcdfNPpyw9/1/SsS79WmL3L+bMDPLMXH36DXinx++B88tWPPMh05onyT2nBiwXKnyGJehL+qOoAAEAASURBVP7YhKuPjGO1ylvVwwy7YUsfaCxOto10R0wAB49e9cO8b2OCjKdZ1d8rWI/kG9tJRbs6cvtfw+ovom8FQAa09g4dxqqPRAU7Oaig7QxIzb2BxGczLC+MdhbK4iKE+G5rUl6J8yy9A6NMGPQyEFe2js+GVag4TD0bo2D5cyz/0fpzrnj19KIrv0t7GW7S7LVzbwd4PjkjnTnmX4Kze87lr/aPOThfPhmzCvhkjb9GJB+QQBQlt5A1NHDKaFRj2leS0pZW7IUTZ7cTNbEYlAr2QojCvoa7bPDombPCa9wDcC5DSFvUoeqx1OlOLtpp/WouiBj1tQCSWaIOFy4EnQJmcVRwQtrWPGEqXKnaRoyR1+Y0X9SVf+3FjMK8iTH+Zc9Y6u1E320ZLn+GRVdvPvF3C7/88I81WoYVxnKz150DO5AzSUYlpMhf/uQfm56Cs+R3xHm31TenePvikzTzODlVJ53c4mmTI7zpxaucZGobr+oqWfMv3pphTDyxjstsDU8t8RZXl/opDHTCO4DGgy9woh7n7aSiBbaM7F7mJKziSc8IGIfmMNUWDBCHQDSM0KIKPpvHuajZ09DmzZ+cDASy5zyGxRxemSZWvBSm2u8U+00Kfs633L14etVT/6G+6USfeRC7187NHVBuILT0iZLfnOJZLnCm/J6ynpj5My3PnoVLABLV34KjKAx1T8SUEj2aDnOMY0lfyq/kuyh7XgdvFlqzFRpmsizuzmt8dz7HGC+O0xftTx+59rlY1I0ON94YMNddThgC/o5F4qgot411fUzXnLnvcuMKBqx8wMgbNNhxPZ7K2FxkG1vZQ9T8Q8SXSTrI9DjMlz/9h/E7nK4dwY2erCPzOJ4B9iZnbAc295zzHP82pzzLV+BM/UYjXyb719b6/jfkw8DTSnIg1p0RNsk/qhQLCkC6BAaFbRwX7Uzja8s/yEkgX1Ub7PgIniZqlGeVKnBy8RXj+kbWZVmpm91p8Ws/X0Ug/8hRgoQpndg5J6YY1A6inHmBpaVvNGEL2HDhQS9+4vuq4sZ4+hc/bSWyvA0tNAWfWTHnMy2fdTnUS6fVdNOTvnJ69qUnfx97oMTqGe9ee7x3IHue/c+ccYzjbXHxTG+87Ct1t9W33HD2/hk3+cKfc80SLvWRoWd+qVRcVd0nhMm9WXKAgHlNnlwZW/I/fihzfnPEsXuNhS59jVkDjY++p9WrOgKfR4+T9XLxMgfB4Bk+2dm7MZjwNrVUsKaZIGZQ4DA2D404YjDVRiqBA4cFVyVf7oORf1OBiWbRhJQ9/HPz9YYEpvqaIv6ZHV46XbLv0PSKJ+M7rA/SyCr+6mm+zRPle+2R78DmnmbPs/8Pl/mVONuLF9foq45878J3XrCUI/KnaZw8o5D5hoeKi4DKPxegUZv578JKhpPRxUa5c7V4DJesQqFp5S/90sB4Bcv8xZ/Y4nsFLysKdfOiXa2thLVLz6YJjmv0GPIwNucQUUbftNOk8DU2pK7oFCvNqScP4dWbzHiNuaGxZU8VjdE0Rt+eSSHgmLTk1ud2OMRXPvUfTAcXVwrzYJdw0o5jemI/yjHda49iB3x6fU/HvR3HD9XFweWV01c+7R/okwG+Adn+MUi92iKn/+F8+Uz+IEcUCxOGeUZDXDZjcEE7GtlUBseSepUwgMrpCpy2dCVZSCnjn8jpUh4rz5t3zFOXxdeK9qc/f/214LhJ6QkiETaish46OYBdmhfBmcDoqOQGKLqYDf2GPIshno14r8hzitpovikUN3gmuNPymZbvJvJn2msv/fLp+otfMTA8tGF42c/8PzT4ntUpdiD7GvXmPPKH2/OMedb64gzOvX96UOenvNySPz2BK3XnBaU4xgRAxvUpCw0riID9Nj+DPvbd7chHKhuzfsB8k+qzNqMV7e76hO6yMoIVTUNoAm4rHw4wLxvGonSNBUcSPOCbePMZ33hoIs6KBrbioycG2wKQwnM4odwvP+b2XKbeeEKx8rDyj9lZvH/18A+Uk0feMXq2cRWRWePrNtmov1DH2ZcH279Huz9/9fDf0ZtR/M0j/LmW5++8cAS82zp/K8eYuEyeyi2mnfOvIqEejXKOnLPMadtRxxxXnsOIdrKiPanFKxEVLX+d3zSWc/Xihoi9/AmPm0/VJ/GtaGH20tGISnlEJyIRUyZFW0AJKHSw8S8zGQvPBYViGAgnLKz4tzWaa8XkhaI2ToymbaYawEbw4uBB5TdRfAG+RHHNgS+c2z/K2RgqqTiPbFt4j9LdeQ3PvoyL2CYb9Y9mfAhn/ZwrX6OXySpY5oIc1slULiWn6Isp5ptBeaZpDpLKWYui26jI6QSqkZ5I528RCMobD+edR0WaDCpxeGS7WLy0GHrRrhfLL42wxViDPINQrwBkaDc1bP7lDwERKtsKLrgqLTLVw89Y8kGyrKPw5MmzItXm8d1WY6xMP8ui988wvMvygTst+sX64PQV+M3/Z7JpiYODrCw9VZs2g/kTZpg1Zt3peaSj7vFY8F/BmfPfRuv9jHrVxVxiXjAe/Wxb+c1kTYG0BIQt1T1uj8b8neU0CWTighSWcz6oKl/s7StKmjAmRsUWHmL8EPV63eqz3WmR8C+IfVtADRRocbq4KhK6KnkPyn7JlTslw0oTXgsgsMAYZTNqbTaP/1EImXwJ7qVyaP8YcaEoVj3w0uhLDr1uunTf1v9+yD4e42t2hrR9dXMnfTfm8vNlti3+rDs915L1b7M/02u9DGf+osOvay+P9coLgbT8Y3DMr3okxVpulfrkOCv/yARsy0ASkBM9KTlWv0HQ/MvYhl1G4+IhRfFo/9bTC0Klov25I8+4DvprIqR/LwKlJARjQLCizLNCzWgrDaOkJxnJN+XC07RW4E0hl/9AgyaDTbiCoIZNd1v0xOvJgAqM/S4xubiZEulWy59np9X+6YuvOOW/JSbtGWmJeeyHbdE6z4jjM0CaNYSac66FLbr0lGWdo57js9Gef8Xr8MPgPrziYnb4Lss7rWYIOndbP+E7x7IArakuXp9XLTRy2dnrqxJPalzwNzmvfOQu4W/LX07KCdFUqg+eEkL4wLgNFtM1rFOKVLQPrHZeKDgs2zONSOgsOFqUkEiMRaqr5cQ2fFkLL/uOp7WeoSDyhlHi4HltXjDImHZV92LjRP65ugqSL4/5xgP/E2d+1/hZV77qcfgtig7nwa599d2SMq2hRJvzbvn4jcZ46JX7vykbo6GundGD2I64x2PM3+p481X49y94F5mf0/PfUbfFVDJpbbWAlr+z4LbvQPJXfMxFEBkPcDYEvYuVdTGXx0j+CxC8QmscfoKgH9YpQ/PL4+XyBTRkIP0u5vWlJmhsz5TTFYsrzAyOBmKIma1gSl0WRYiCI95OCUQjgR9eCKYYtDGnNcnmCt/kLmLa6OdZ/LO751/5t6E9d1rWwp4PrnazURY9dcFsjjl/KO3h4rf53yYb4x99PJSYHk8b5kB+ruXXGxmrntx593XSzg6DGZz1uOfVhcO8kx69aqDlL7lqVdksTgENpibmUiKbyyh7Eh3wpZZKeCjkr14iu2jXq+dTySxKz/G8QSCZFTR38boXDgDKmpljgQTQtkBO6GfAY9K4qLCJcJpEMPYYN5/E82UPvwXFt/jRH774OfiH7Y/2l4s372dkUNujdWqPuKbyxD3MOM69855RF316asaxLfv1dPjg0o/+KRuxYYxt5udizxw4dPALlBN6nwO5USmG3ivQtRaTPNxcr25QEaIXNHhgNaS+eJTj2pB6EmhV7V2ifXwVjRSNp3HZqepnOT2fRlW0i2dxQgCVbTEQ0BfjoEyEnJVdnpXSk0N4IWhGQ4KNL3HzQ3uZxAmmwQNCUOD2LxkvaIrLy/azH8zr5xUW7guuObfusg769FetuUwyru3T1lGWB+XRpacuY9KM8+BGeWzZj/KMLfWV+PO1vfDqv+3P7LEIvgrTxtRimNdJP65RxQkDjl0HvstpHCh6FRE2jjVBvBpBlDUH5pYEhlSnCV8T5TyUgpOLpOzwR7ERS9l6rTp10U6rZ9qzlSKEjclMoMASXAUmUqUJY5U3k2NMHy4m46VWKLnQF8YgJo96BsdAYxwdzZqs8MTioc5EftmDgl1OF003X/o1ZXh+d1zf2HIEtXypRpuMN/uRg+MHw2/an8/zmy/7GvxPQQeQH8gjLFzpgp71q4be+6pMhMiznv+YswAsbiDyUCya6iWDoXyop5bZOwMDA7mApKvipkjmJjvJ/zQ9k9bL/2397IOwezqtzWHyTlpzK0U6sxOO1nM8A2l2jIET9UXEZWQuUeQMq6M963M+48jSYVEhbj6D+meXaXrGZS+e9i8uDvQJ1c936eEv7dHiH77Hs49gLlyHrzayaPX7pJgzCIsplLzlXDla4VoOacszWtBmyGvNeamHBhgLY3vM1ILSHVMSGOEvfeoBmWzKn/yHQnaaPJ31ulweuf9GWKuC/GwAc7LUM4uIaF9k7DlszktObMMreMykI5/pvCYTNDwXIDvKNRC3ubwgmpSRelrpZQ7FjA2PtniMb7xs9o8iaLXXLvAduOnyl/Ucqc/xk4/JRb3ChJBzZzMyjfnFS+WmyoJiJfWwqZD1nCWIWWo4ayi6EhtPA5rZFC4wANTcQJQcAulwX1qwXpfHV+ub6IKG/CNLgRk8WdEI5qQE6oowNkYT4OVqHrzgtjAXBJS58xhECpZ4+Hc83aDzE9eRHCmG+lmFuBsvfWUH7o32dgA7cMMlr2g/zyq3kDjOoly35Z913MBgPObVLbnofC175u+Qo6wIzUutfB0KUkzJf8hdvIwnMboeaMd6XeKXPN9AUjZe6VzWKnNXOP3zuUIFLcvYFqjwVDE4/jEnozQ3de2ZRBNcFD0nbnZpvH3ZPyVsidPW/JkEGsVmKr78OXTRsyd+G2av7e3AuANP2vc0fKLwbL1ETorz1VpSkFmqm0Xlr/Jvnr5NJF4AVCvMb6W4GKBiQjr/mbetYAlSggstSMNLBEsWO7CKKfVny1jwl7LfsFytd59scrnrJlkNzKVnTIoHF4y5HvYSx1ZCKozxKGMG5DExIwHljFE06YtTlLr42WpzoaKqzWcR33TFE/E/zcpO7vWPZgduuvzl/p4680k5x0zMXaz3yk0lJb05b5noFDn/Cg+h81YJChh75inpLcPQec0BpTaxlmDxQth6DKiVIYaUE4pGTtbrEr/hQf/xahSMgjBFg1ELUjJeqtmPCeUQcgNlYBYuoDEHqV5y2pc6MZKEa/GF+o4Xp3x4AcJCrc9n2eNO+7SL21c05WfvsrcD2QHmBnOEP0npH5kwtfhATinPK7eUx0rCkocA+uRg8renJ++qvTn/jS+qruSIflvbqDPKt/mHGLl+aD9+BdbhOKBtK9KKRoGAIPLcwt0LAX6thpNm5/fWIchCEaX3x4V8En7cPDPp6tgZBfCywRco8DYx8fx+C98xFjF01F9z4NnC7V32dmBzB65GbjBH+Hm+fh0RJvifMlWIzM4FPixMnjupisHpxwy0LXDOX4DVygBaZTl96LMlKKka5JozCNUUdeGCoWjEAHG4jacdRcvldBj/taf/i/OZjdyQQx6LoMbkiFwiy4nnQ/UbU1ecFxK2wmz6y2JDzb7gfSMbr58tFUfJ+PPJgcUl+C2LT1eEe5e9HdjcgcuRGwcWlyIfWQK9JXdZsMk55SFziw8aK89wqd75q4mIzFmsEVcvXlnlYkXMLAW2ioLyPJqOAwhhdWgJwkN0xWDLpew4ZiFJBmWNVECyhYM8K8kXvVQr30MQvlOLsythTQl1vHYfooGMcukYG03ZNLDAX130Sx3iD12yd5f1Ju1dT7UDhy6+WXdZ5Q5epSmtkFOtWAOkIg+lmxNQOa9cb9Wh2mg3OOShSZ2qPX+BJ04CdgOeMuU/O9aBKewRE85lo/7QEkb6J3kUKhbb6NoCKYCFLkCVGVdK0BgMpyGqgQq+ZPPihLDktJE/xy9XXeeprrBvGwd+/cH3SXmnPXxwr2iHndobbtmBQ3gHuX3Gr/x0DlbdqKaSd60fqwfCFJDy1RnYZCq3yunQz+HB0289yKn878W5JXSLUK94I2o6qEjlwXI68cPueNXPrZRndXRTxdxlhQfAKtpYlupMcVLMsRzp4s3jRhETXXqGJzl0ClUE0EKoNxXAd+jgzXG21+/twNYdSI4ol/iOFDONHRpSzBfMk3fsqXb+e8ZiLaS0smjgnqeilSMRkFT5Gq4kNPGG+2mAYQjLHniOU3+L1fogfg5fHXQVlAGMSCAS9GmzwpSBLSgnIYnlgEEOBCk2h9FZE16FRHTD2wpX/lWFkhsmDW4dZZbz2WvCb6h4SsLd6/d2YOsOXIYcGXOJ7yYnr5xPTDS2yj8pmZslk45a6GNaMuc/dMxTPthUGzCkbWRNHvFQP9ShxVT5D+fNFX5/Eop2cZHNaAlTOenxNGOoCSWZCpirUHTlmFD+oYwgPNSVmce8Uu4/KVwJe5jShkC+6JRNPtkBL177kg3UB/ed9L8CCrZ32dsB7gCzjznC3NFNNttCReUYc5JTWtOOmWplz1mPIK/8lzkv5GBKEsIHO0x8UyOfudSXXDYwHmthgBujmjIe73dfhHeP1wdN1rzIGf3bhaa41Kqql7WCoGEFpIChoWnMqa7pbI0QcvFs9O8xN8zWXii1JHW3SSqcfOIQ+O7x8jKZErXX9nZg2w4oR5i3/Mu8QlMeVY4lJ3XzsbquQ0IL1C7iKbhJacpH8bNvfEVDleuOPDS1MWOawVM06MnBel3i/z25SAViDNnlWNOsiqQ1DrmfGSqCIpZDjJttIgBZ2xhx4VJQjPqCEDh56cPu+CzFBRWexuTihXg+NDTZRYsnRURLqvbaBbwDOX/2GTNHWqvcckE558ax8qzloxkk49AppzxV+kMmizH/IVFtoU9N0MhwV5Bjyd2dtQA9kl9cLgKYGE/5ar3AnXY5HRBJnNFQUTCwXoAR2YloSEUjeimMyfMk4J46cwU7Lpiy8JCNYy/H3G2xAYFLehuLUhjIL6o7Ld2xpfds73qh7QDPn2kyNuaIGhT82IdN6atscf46c/oNREatAMBaiZW0F0ucYXJS/hMQfLCV9eJWzjtWc5VRqz9kfOFxpz2wxDeKTjDqVhwhZ0RsNa+ZFihxRc6CkY4cAuRCzozRc4JY5KfkpO42EA72Hg6CUhIvaWHDR57xWTTI9EMke8Mn6A6MZ83xOM+SW46oLnJTck6N9sZHQmOPW/6RUDkIuY3RxZ7KIf9jR2klfO6zBTWyFwMNSdKacOBhvfJn2mOqP1YQHgqKgCpWggmH1j0HGndSiWDfApFDPjvYtgFFBCH+tphiQ2GNszAK7GUWgf0rRg4L1HgcZ3ne6y6gHWAKMFOcMy0ztu4Ac6zlZ+UQ89d4MyifNQwjOOFEfpqoBOygpNj5a7nheZncQxkLnHx8JCDhe3Dm4xxkrFd8I2pxvDzRm4DtZS145JQ9dXwMMk1qTn0rbznELGD6a3oCoHAMGJtF+mavJRQf9dwMs5e1ZBrzO55s6I6t7vK4rqErNU3U0td0rzuPdyBnyZ4PZo6zp6XWbHXH1/fUHDkFQMc7w1ioKlZYjTkn2zLmOE6Slc5fPxH4pSzJw85hH88Cgpwa6csm9dcQKth4WhznnfZ4KlyBkASPAB0Ag8RS8GhEchT32SYvVMFW4RJXsQgfhPooOAEFIeYfvbhgbdL9CJ9oSnxsdbfFG9ewnQK9Yb03PV92IOc6xkvZNnlsjq/uzVBf6l9uJAVLI+VBQ6VxIXp+WuBCDAF75rrrR3kvyRiPbROf8CCVlOR4CI8IVHesDzk1wrXoO+0xg0FOnXkFdmiUG6TrMCYf27hIzzum64cF0Yl8MVDa2i39kLJcEOpm9/KTWIoAeiHUHVvdGcTWnjRFZfdlNcq2AveEZ3UHcj4MIuP0dfoPOb5jK99pcbNC5hDtm4LGRbqZf2N9ZMxAWESuKU4SHfmYw0VmRcXngm4xVwHFlr2LdcQPa4aer4zx3WP8TCsnxRsnJMQjhNG2vgVV8ZainjfAolUIrxEvFSRVJxU61zjo40f+TWXOIsPXjU9qD5ziTnuS4RaB3G+R74nO7g4k9bdFwRQ4nX4b5gRfHjOvS5k8VF+5lTSkidO8kg1dy+tiaGWQgWxOtmuxhBz2xUrjeZ1RQbtRzqlFD+yH+mgIKUyRLmZB+NmIcY63bS2czhMIiGabQN8kN7GWyUXnGaX5GvEmxUsXBmOoWcDMmCT2s6R/X3zxozv+MItWrgjHI+P0kbHfa4/vDvAMNvc/58JIMk7/cKI7tnsP8JWzs3/zapbkpAOAh+QmhsFt5u8YbcO3KHt0zt+6EYKXfEpp+vBf5TjXVRWnMBhDeDG8Hf/qd3FbaFOnmnPXSIZmgMcSlFzjutBmcxOJoCx4MRSNfXVO2Tja5jduGvNAIBnnocABPLA7fyOqQnvQLnGnDyDUme/1Z24Hxr3PvrOnfNQ92gju3f287yFhLWfMR/pRzrUAoqRi7nmWv9A5zu2RNinIRZPEHklZPySFgW0ci3jtTAHgFeZtfHl8ZAwnfLTrhcSo7NoFaJ2d8DkBjcDYFKERDiKFFwyMYdU5ebeOjXigoi0puYiilqzoBXe8fua848THm+qRDuiLLdE5Qs8jl8He5VHvQPaWRDrjYtzc+0ftaCA4cuzDytWcMx3Tn/IoAVUAzj9MaKMErDteGSdfqQtfXj7TZdF4bZXA5jGfxuF2IjMS4wBOzpuLbGjr9RH8DwNL3Wl7ANbx2l/2FoCRgVxBou96yOmBOprgMbZCl64WTgMGWg8vhrrIez/Da5EEo8kROThZT5+5/wMcPKoWXyQRLfpN2TiPs22y6Pb6+Q5kr7K/1EaWfo547GZHHkDR0hvTpgJg1wsIEwqkrwGmrTHHq5pUoJgLXwapI04pZ5utqfCsHT3sqHG6toyDyZa2vI0f+dxmR7DYMCIBHbZCyqQcJ3j15YEUNnOosYl3Ms5sSJ5NYAh4yK/kHouQIDSKZcMJZXwXkAI8/dx2/19Aj//T8DFqXoHJ6IpzPsYxtZFxvNfmOzDuITXZK/bjgzru65luR+67hb+GFM58g6FTpR9ziE1zZCmEkiPKnt8es0wde9kZ2a7SEU+JSeTPU+drclxWsJF3xMAwAmFfLNDb52Kxexv+wcD0+WyXiOzKAYAgaxFTm0BdY2JUNPLQ/0F69NQpeDMWL0Nws86zLMRYOqcb4k9imPT5WsSym6ad1fHp6M4to6fHbBxXm4SUM3r2eWzaXEjzzX3K3jyUPdjEPhTMw7G5Z/fT+M7ufUovxqUTY/6yiOE8+ad8xqkqxSvPZ/nPfBN+ftH5k49i4NK3KhzNi5dlQ8NgNR/sXKy9Atar5ef5M+0naOMgaJJnEQi1EDOEVDMy85EFUcgxA2Vf+mDI7bHQUDsI+irJwFV4IBoenNlQQxyjnzHNoDE2//PHHv1L5ArqlB3jGhvnWUlbaxnEVmsZQU/Q8bb1b5OdjeXfdpw/z9ozPzJc6Jnfgox1k2D+Mv/U8VI1AYHWUvm7dQ3MVSrKhnnLuuj567HIIZd3m8zoxEEa/LEVJOLa94nlvuWBj7mIbOZSkZ8ZCfjdqpc1SdBaQDVOAUtZiyCscdBOj/g0hzfHMhk3fmIZeoKIT5Li4W3SM+ZnH4Ofa8n4cFtFXZE4rMjIpfUPpKPuVOPB/JwbMubEvTlmsFzvqO8nR+3ZaZ9+4L3KET3BJzoElvxlfnKs6JWsfQW++/a4o6HE9eM1Y2KjMdkh2YYPjojAxvozUz0JcEe5iYvlR5cHDl/y8SV+U1RAvapBlIWNpGAimYIgCVsFGHnI0tMkAWpMCAfVUox6VgGXg7Ufc0ODABNP7JIZfpYEGUg/+8Cfhfas9lkD18lxHgyK46w/Y/Zssec4stONqTtVOxV+m/02201Z5uwZZ2LdXAv5Y8sx2+bc0jN9Hb2up4/c9ftKJ0qR81pAyyXGSMVQrEJXPiaXwzhbMzHKT+ObLWSsE+WuyKHHTthNsr5cUoVGqSxoNGI4huriJ1/8ieXfWXwY34haf1rkMheliUMgOl+0JvGB2qYmT+AQJtD0QgY4cBHO5mXUmHjK1HvB0mzBE5mXyCxcmnz2vg9M9+5+1mTnwDVr3AyF8rZ9GGvNp5ARG33G7De5N+fbMMSljfaxPV1MwbGnXfDpI2d/bjSuyu0e5MRtD/hNKOalNhQrYPE6j2sHPKn8wxo1D8u8H/dKyUdbPJL36eWr5a9jUiEXXVyQz5wsXDRipGRuS/Yp1it/BId88dFW3RSojaVEMtG033yYGMgpDQa2CL7kmco5fc2txnlX1cLCOAQ/2nPn7ZUbBUf8jVf7pukv7vk38XrO9fPV9z3alDPwUZYx+4xjM8qiG2WxSx+bcT7KKGcbZRmnt8W5dj11dB+99/eUG1qVPnFg7CxYYvBAv4nenBNB+1EufCWu5CkMscYyfownT8xmbMVDvWJi51KQX5TuxyhS0ULxEd6Wq5prIbE2nHq29OIvE3WIogVCJedCEO+5CSzlYoMrs46vbQmDNkbktQnlKP50l8VK8PmVOD5051i02bh4Off7zYg351wBZdlfzsdx7COLbeS0H8enwlN+frVxxYncK/3Yvb/vPcOddbmvnuyd/cgZDJg7gNC6FxLtetM4dikwJiEfaLmz9nwtPHMdNjOumiTHg2cvfJ0o3TAe4tE+wovChvz9NOSDJHFOgzQC+YctfU3VGQ8luemAfGVAzvALz0iyCNmR0w/q04LnXHgpzGWZBLrIFm55p/0cfq69a+fWrmwjx9+m5/lgXM04zrJG2TiOfuwfTD/anrvjrIJJmDE+ClzfP33i7j/GS2HkN3+WhU41ABNbIXsqD7m2XkidQyPYCF35S1vi0msMYhUY5aWLXoYbF+YtGdybS7UhbM2pxxwfz76fcD/XLJZ/6mIrJSj8zACQVkfTcTEM3Y408NQyRVA4jlmcFXw9W8iOl7bIkng7m/qkgfEkRSOv4uRYU1/4JXDMb7k3d9shOC1S6LoU1yjaG59HO7B5fptnTf0CPy69Y1rhdz0scIdlU0rzwlxpAg95dRmxVyqpp9w1wZFb8jpzpReLi/mu/FTX8JvpZz95imBsfNBr6o8ix4zRNO1DnaKpaC9a7n8fJ6qtwo0BeewiidwLKsKsjiRocluFmjnjIVZ4LciBSV+21Mk97aioVmrjmwxvImhBjovftljwmRQy9h+44x2wDEt6gsdxxV+ce925ugPjmY3jnF9kY5/xNP3J0X+pNyz1b2iRG8rFygMVYss/r5/IjubEM8k5HvK34SmjAfNcEF7TaowumW2J42+yImCXOiNDeFOnKtofOvyXt+Jf+xw1Ba4cqCDmYClsRCry9VbTggU+OCdvA8/hFDOy6NHHUrSZdG8eyT5xsGBBoeKdpiP4IP3zxz9I4k1UzU8lP4X5nvgs7sCYABmP50cZ59Gx9+PTx94zff6Bv6i8QLpD3NMs9l5akw9MY/HYqq7lvkWB/DWbczdcKrgWF7HxGXvzqXCjYl8E8Q/Wo6pTqPzyGAOA9BKZRnLES+2DXxZQXoLq6Sikdg2IVmEODeUfUUAhWwaEcZ6hGucYJG1lZoasxdzxRBrb6ccUGJFT30XGz7V8Vv2j295cxnJKRjwyZs+WKD3zNbL0o25vfOZ3IPuePh4zZ59zjGw8T8r8eN8d/3Ja7odOd1g/sevbUBApfzaSSqjKK+apimfIzeRt+pbTDDGc9E6itArN2crIqBxfuVahU0Yg1YwBvVKavNNar4ZJ2YoWyj9pRtTQ0RgsBeW89YOMgdCXWxlWN1tYgWUdPoDaBiZKEsW/Sbv/zGVCEhPxP/LFf7qrl818h/CWu//9dPQEv4vMyAZnmJ3cevTd9sEwJ7PsSR6LHci+pw9n5ps99Ty/8ZwX0327t01/ccc7kUb+PNaf6QdbnMkxFkmJknfplb/RVT9YQ8ICZA5vGMW2yfMKMjGkN7bVCcV4VGjmXU7vCXsrWjj8gwgTgEg4ATqBu58/S3gB9OTo2oISLFRZkAOjYIusArBfsBBUQPsVTFakbpwg4wL9wICr4s+3ePzRUd5tIavY3GdOlozTQzSz5ZyNtnvtsd2BzT3NfOzHMb2P83HM8xvbenrPnb8+rZY7+kSh50fdbQdTsdCgJRQkGDPn+MhdlRDloWwdibImOBoMYbAOyD3aWEIs/hBHt7RqONYa/fSHbHZ7fbaiXe6/+F30KR4S4MHY3MBQLQuQSTPAjECAfC1g8B0uTgVLa+LzkGPSeJMob/o4r77ju6Lc6zfsmdKfx33ojn873bHz8W6o3UlACZC9I+/9/9/et0dZelV1frequjsvCEl3J53OyENRsxhwhn9mKTDjKD6GxYwza3QtERVlHHUNjA/eLEhCm0RwGB4i4FqjoygCMiDoKEwiRkAgQSOIgPKSRyeh3915NJ1+Vt07v99v79855/vqVnd1dXWnk/Tpru/ssx+/vc8+e9/v3lu3qmhieWMu0vYtfxqvlZ+jawacqza/zj+1zOds2tZct/bWMS/mAwu7u0/txVNjvVSCDis9VWv9+M5HSNixcDiyJlV/WBo57OsNTOq2kWGrTHeBJ/uEJlc1LjfUSB0qkVT9B12gIXN/QlKfHr9k453bEeRWGqoBcOFMLK2JwDUXQWJJKdnk0WMMrsWjPmUcKRYWluQKCwwnUUrA4VpfjU7Bl/8AEwZ0KKP78oUD4mHxbjszO+n+Vq9tHV/GQ7uIImcxcKFeQW5krb1p23CexiO/9cf1Q20M98/1MFdDHte2M02blmYevbZuxf343jd3C6PDUQOsBzctbVQvcYORZVNTQi31l7iWY8m6LJHkmjYa6Z5WrHtZ01ZUWMke/sWlH1L4z9pVXjCHCSQS6Sa2lf1JDQ5upQz8NOwtBI1RGyHWRLYqCaLTATfBdQQQ9imXFgOUdxtngLGktwg4sGSfDKHkBotxS2hXTRIhky8YEoKfK+WHLT5/z03dPce2NpY1vmByzcFoFJFWcaGMvGnD+pYN1+Qb2zoP9nmYq2H+2nw4X9Zp186T9SkzTVlLWzd87zn6xe5z9/w/PXDP6E0OnCDUVVa42JK15noz7XUghpFQWWs2FJB91lkYqJVQS2XoRlS8Es/6SSQ7StnxUCd0ebdnX9qKc69p8XGuW7glOzEQ7YMOLC2oxeDlOzyTjKcUXKt9dDVmcAILCpFEaoa5oAKOjEBwEp1UGolHBfmPeON7tmDxrWSCYGf6dBqfHs2Ou5t3Xk+LHBFfKJKVAVistReWtTakObTjIBetreOZCi3dmD2oSJ1gs1fumTzO3r9n60IkHc+Wc03aeuZzbvnUq+Mju389Xsfy7PXeBmZB2D50VasJHXULPtcqSOpEE9FWHtO81h912kFj1qO0JaBuqf/EDXvoRFDSq2Q6Iwb/0x592XrpNe3c7NyH6JCuK2CAVNAwl/8ShLZHo9pQgSJlbkGYPR4TEli8ina8ZDhTpBlTGwD1YBCbT1p6VAUo5FJn44Lg3XbboU93n93/bmvl3ATADPUGI255XLeDMsuHNPWs77nlkbbt8WjKlhqt/VI6x+O39kvRp2Lf7ps4XLc8+rRf05Sb19LktbZYaljX66772sGPdF8/iI8sqmF59rCjqb4SAzWxqH5UN+QnFgso6RRVJ6DYJ9YVbamYdggAuYzGDRoMQkPUq1/6It9OGWNisi8Nz7nXtC/csP0LePvmdhkSlGZy2jiAEcG4J8m8SH02SdlM2QCQRFM5cPnoU0bxEbhVCxqZvHGCSoaLmlG+oqGJr8YGT9sFJmc+O2LT8hH3Izvf1H1jftqP7TWxtHEpQMroNaISq/AtG9pb1zMNWgzSS9kY0zacOYZYrX1oLL4Obayxmv6NZV/D+L2m3DqMg3zvwbOxKPdoZeZNnw/jL0zcvOOVcXflmeNbPSwfftG3a8SzBHKZPrKGIkpVf9rCugmdElYZrUyXvWVNyiNsshqj/oXBOCImxkWW6paU+KzaoMlgP7IviefRa9pgjm+kKwcTzQZJ7FyBUo/OtJFMiAT0pYgojyYKeyilPW0DP3S0JFgOJydhAg+ynjnWxC/Jlxwx00iG9If/epSN79HNrhl1CzMHuw/u/tX01E5NAMCNMZy10caIcn6Zz7nlWcaZw3otbZl5XlvXmJZz5rDc+sFdfD0Z+2m603hD/47FuozJdDtbz1FSb6hLmfc0nG239MyXQAfH+7oZnHW8nwGfaFyGE41RbVk/pVZIo8DoUTWlOXRdj9WSVOrKIujgqSrlS/jENMBg++FLUAoj/GdNC58aNGI/9seipp2MZosSzTzs3Hc8x+A+UQ6oLAEuMI7AAyHsR/nzuHwECeXYZuooCaATvPgnXC4ch5W49pcQ9TYhKRjATq9rebcljUffrd+4tfvigbJFKi5zOBrPGaRiJs/8Fq7lkaZNqztcL2VLvrGOZ2+dVr+Ns+WTXk3/rW9ic7Q8056PF1dYn8z18wf+rPvyNz6Mb43g6aPe10CNsbrhhmfPGhmhNqbXT8iLP4dWGNxJxB32Tf2qMCnDl7dGO9GVIbWMg2K7KPEUVUsCpO1HcjgWNe3FM+MPIsCjFTb8+5FKTwrkHNaJz6Q4OYqdEYInXZDcsJ8CxMxHJ0eZIIIIumwkRYIDTQuxSJsJnpjqynhko4x+SlxsWtx1+TqHj8If2vkaPE3eSctTGCWaxGBkig7zcG/WbfmmaW47zuRbnzKPVsd602Tktfb209pbZ5r9NP/G8zzNP3n2MfRpO/sb+m/5J0/vn9/efXD7a/RxRX6Lj3dXfiJO5w+4UiusGQ6EWXixLLoUW016eZasZVlnUbl+w0fs3T0S2ERKG4Ykn8EL/xKDzJxhCprI9ET+zFH2I63asahpn3vZngN4t+qjYZibhAUDCV5umCgSg4vZX/TF4LUOBfmTfcJpU+ISI5iBHrTsKU99kaaBnyZSEJsXBwDffJs/4gWf8egRl40MGo17ZHJv96fbnt8dGx8i9CkMB0UIBZFYcKQxlJNJWcsnz7acKT+ejvXtg2sOY5A+Fftp/od4y4nfMXHmGNoE91SvC5P57qYdV3fzo/twtnwpNKOGZePyY608c17KDkCX+im1h+ja8KCsZcNT7VvJM3cFHdUuiKhrGBcfCUA8AyqQ5NtWOEJhsPqSv9H4o+xHMHpjUdNKOureUx4B6nYRSz5yUImBaGsg6CeHNoELVKnQk4V9BgwjbbLYkiA+/kHF5gkbE5ixecgbOpylJhSIy6dCVOa3gHR4WPKD43zqxKdQe4/+U3fTzqt78Ku38B6HiO2uhrR1acsvyz1TTrodQz/WPZ329mlfjKeNi3LrtLEO9Yayk1/Ty827r+t2HP4snkHhfGd5yODydSzOWVGhUBwd688FJNIurYC1IieEaVDiUZdGGPyeLzVcv/JAnoyoHfXPWm1c5iJ9QDf6J9hETADMsCfYaOY9Yg8uU5t2zWT0Hmx8wcHSOUc8knDBgHklcPIx0xnXokBS03TRI5M2DEy6uXmwA59MSm0dK+KQZb5jiqRAIEzoeLZCsOrdVp+Swq97xqPyVw98pLv1rjcXT9Ujna3W0CYTrPVgOvZbElfcWl4YIMgz33NrT579Wb7a9sZr8Vva8mnzcvX6tq2Vac5/c/dvdV+498Z6h+X3ZPNpcdNqNWOoiWJvAjguFUojm6SqQq8uU1lypdr1Gz2h+oOpMWMniUW+fKSuvLX2oSdb9J/6sJ8KraY27Ys27doN6Yep0QZXCyIkuUMsqmNKONhMvUcZMSWKi+KLFGmj3IySYMVYtMkLw6KkcJwcz2RKA2C6y1qQa3/gYpavcXHHvW3P7+mNKYbTIIerVbnGQUyHokfLPTsKzy3fPKNNs29lpFfLnljT/JN/+oajH3rgm4l/vfu3uxHOkGfZ+xAFw6zFVE2PE37UmRUEIDvfTQMk5KowBBaVFhFSz9bUlXswouHJyC8KNdp6H/RZAH04+9AGZZ7atJTC6bt83gyOm6oNxECjUcmLeHDFfwapf1BxwNwAe0f9kzQdSBf82Ly8Jo/4QEmD8C+OfBFfg5imgxP2tGYckOuTUvDlHfA1rX5XEJ4q6zXQ3KT7i+03dLuO6Dd5CC3RB8jpYFUne2pBzfNMGZLWi8z6rc6Q18pWw574Lea0tWNY+UwP9sKZkQ+j3374U90Htl2v8+MZjviyB+fKs1U9wEC1w8KjPdckEtg1w/qgXmpRQ/ZRd6yfaKxSPTRosCknizxhSJYoiR1C1nr44jr8u/4DgPb2wzgR87uING0s2bRrzl/7Xry3PE8jOlFQQqhUC0idSABdp04mzRuzfkgZWXAYNgONJMFafM7WlIbNMaehOEvpaOOEFS5NBMcL//Npcr6+Hc8e7f74jl9E4/5j40NqWg+995TOyKKNIPZ7cm5X0/7kPJ9I25Fx5le7O9LmG2f30X/s/uTO53WTuaPdLF/H8rUrqpivM2U/BCAGBb3RKJmUUkSwqP56AMWgF6ziLH5Cp9Qv7G3VC4OLFNBFNDN46Dv13yLlYCzZtC98+Pa9+H3IH1AmoOu4A9j3rQAxTysEwXVsInfBwBJAE3UYJMWWcc4hGTFABFI8KlE51vYR+AGTsgEOIXmw8iV8JBBPp+RXd10+Sk+6ozPf6N699b912w//XWrRR3wpRHFjTdKyZJ/BKfa8coenar8yz0Ovzp9z2xybHFjeettx+O9xRs/pjs3wnWIcIRsWM9940sseHmsC6U3PxmlbN+ETwixAyWDoGuFMXr2TwoJYnCjUnOZgJwypkMk6dImDKJMDFerkuvgjL4KiAlRGf87+i8Xi65JNS1UUO140LDZS4GAzmPDmoLjxCJJWfqRRnGRwaMMMnHJNySODW+IGQlDsUy2m8CHlJoKSnIC2qmbl2ZjB0SHrKRWeWs3qqXLXLcwe7N57+y90dxz6eNjn1ZCcGZnXDp9q5pE+N46fAefK+WtzatkQ4c5Df9295/bn4oziWzt+TyI+Y1xKRg3kujG+sQK7qZ+mAFW3MFAduVY4C0RVKRiy3GwSUy4e0UnwSibmxOnvyf5Dbl1hhhkfjP63AJa4HLdpv+uyx70PDnfKaQKqOpOOrfDKRvVAUFLCFYYhhSw3kFmVcsgjCWFvYBkGTmIwAcKCUSSDURVPdCBMXoskbS0IDK1KOPHtgXgzgx+8GONp15/c8Xz8CtZF39OWIbE9wk/4M4+z+aZb2UOBHu6f63ouNQPW43y8wR8C4JkszB7RnVVvPOkOCysAu7SCZp1EZWhGvXB2c+h0ZFAqEyUJDZUPtbKpwIp6E5h8qF4DDEzIqcM1LsIXRtjpCj7FpNOBMB1vRECQugfU6E72ncyWuBy3ab9n9OF5gLwlPQdEbk4L+qNDbhSM2CSpiJ5XbYbSws6daQo+N0Exk0e8NA+CelLrJ4ZK1FXCZZApEABsEiRiEwCZ0fAZAlXo2+8o81u7fGOjmz3W/dmdLz3pjzvCsm5T3oCXvFxK3tK0acdw3crONtr7ZVymOTu95Jtu+eZRfqLx+QP/t/vTO17U8X0Hvob1HZZnxgdc4nLU2TeQqLzo6KoX2rwiChjFHbbS+phuE2CtTVgkX5NMouaIJYr1q0gMwBiiNyLCymcEUb8ZimIBbzx+C/uO8qXGcZuWRmtGo99BgtQb0SCxUQEyhgw+U6SNReARpjeh7WRDBRhtYxNkl4QQjxuQA1iRoBp5jT3xdMcNiFTilMqQ01R6mbjggCnAVIU6TfQaCY/eKgq+wbFm3N207Rp8H/dN8Dum0bJHxB57aMJXPI6OYKSHw7wWwzrmeX2y88nYW7edW5q+HeuQbvVMU8e0Z/KWGmN80umDe17V/fk2vEu8ZqG+6ZR3WJ0ZLnhZq+Hfgc2o6slD1BRQ1A8f7KlR60f6AoQ18GjiGIu5oILr+lX9uZZKNhhQsQ4/yWnrF6you4w/9tNN1szO+leIUmXqSJOpssK8YeeGv8CD2vcxlBISdhNBg5kCyUAzgEZTtJNR7NMo1nx0BKVFgFlfSORXz1wUny2tR7U2rkYYfloUHBVjFRQIvP3I3pyMwR+TnnQLx/AzFnjMu/L8J3ZPv/JV3QWzG4S4ksti/4tRWh1LIxte1Zl8jqHNUH+4DqtIX2vf0sTkaH14bX9SOE2Xgwt7u/dtf3G3/eBn8pNOeBDl+w5wrmdFuNWUpkMMijeKDgJEbXqwA9lAm3Mrch0QaEiXLXrjOQtDQgu4CGxyTIvUKv0mww8gCp5OScx0N1+9ae/322ap+YR3WhrOTEav19MGgOsgMbth7c95IF882MUcm4qfDvJWo0lDElglkZlw+QEol8TRo2MwA9cHA55ioY706T8US2IoEa/vn4/OsmHC/A4kH7qRFb4zqZ8YWYsfoMf3Bd/6lR/r7jz0N0vl8YT8DB3+Fg/mgYMy0tZp16SHfOt6hsqK7Wnb+uOaw9it75Ccnit/ufjbvvbj+GgiGnbtJJ756N1+RKBzYVD4dl2eP6c4/4yQZ1rOnzHGGYsHFVUAVWWIGbRqlqoYZFPMrxCKEKZtS82U7NBH6OvGESZpzgziwV9FHAKS9Elf9k+CfRYax78G4vF1GPDolTs38o90Pa7sqjhsjBl5g5gqyWpXVozmFQLETCw3XYZNCCt5zMpQu64AQUHZiRWmskNR9RuBxjr8Uop/uOOiJnTXHS8g2frCb+nJu+6TrvjZ7jsv+bkMRO7O6KVJSc/vUvyeEhbL1Rvane71ZLLQfeLe3+tu3flbXTe3EA+Y+pYOaoIPoLy7Ing+pvLUOOJYuaMYPEduMBonask8aei4CRB60Ty2DrZWhEwnriPyRbO2aFgyaeWoOer1hlXBtL9qzjhoL7TPvWzTnsejmdOz2FMvy7rTEmg8Gr2ODiLgxNX+WeixR26qHXVVNxT2VYs2+leVtQNhmSc/sLG/NOd2lQDpySJtKeB/A1CPtONPgACMBwSyoKIcElifY8U6X+eO8Mkp0h/d9r+69297uQHO+Fx31He9FL+vpS0OWff7mr+I7R23/2T3sV2/WV+/Itd6nwEVGg2L/ONc/IyNdyoOnqv/9TaChNTzhy4TxEn6VZNl4a9QClm1bdfD+qFFaOp6nEOgD4bcr//AI4/9tZyGZTTLaloqXnz5xW/DtEt3wvBONgYiif8Iis0ZSZCIFyYF/+LRLwKnQWwVhhpCBRV8biL8hC0xwBCWCNBMgniYPOsc6U8ZIjvw5V+xxcFTUpInFWjS2AB0CFrvJvOBj4XDp2gqoNEq/Egfgz43FibHulv2val7x1ef1e099qVubi1fkuAs1LCgOSPtvMNGk/L8eFb+YXYK+D/+SRlp9flTwjJRsUBPx4pJmHHElMagnGAYbf1p3S9AsPr1SytGkOZyRzsO1h5jsE8RNMgapc7MaGZX9heXJxzLblr+2fjRZPRGBhYFT88RlGYEEZttApSc0rRRBm0vrjYUKBRqe9iXm5c6MYit7XvDYCec9s8c8Eu5oz3XRYMyMaQgOsIPG2nSmAMC2PNZioqFhcMskc27L56fXXbht0rz3GXlGeDnh9+29RndbXvfgm9R4OnwGuQWudb7CPkDAHyQjIaNs+QRqjZEpG8dK85K55tnmOdPKw2cXXP8eeYhdY2U+oLB4vpjsVjTDUtkOZeXWl+0D3/U8JA84wmamDkm3RvZX16eaMbPSCx/zJ73sDfNH97/Alhc4uatrkE5WJJJc9bIWWmkHP8UvPi8ZIIxM8ECAy09ARATepbJhAs2WCbJM+0kT5i0J7OmfrF/H1YE0Afgir7o8YrzH6+VFiGI9bnrCTOwD3/N8GN739R9df/H0KR4owlv9Onzw2pUZJgPjMwpLvGL2eIceDblfCjmWUShaKU3Iuhd9REYFBPLai0Nc9kTh//56KCJAHykyFWdSYUG3RT/ZHHkLF+giy8RoSJmktRn/JjuZl913R5LTjgv+05LpJde+tV7EexrSZdHCwTl5vMMBv+XEbqxNF/Nw80RK6s/ZNEY5HLUa/hx04UgAFq/bfIcgnDlKOMCXWxgQNqHEAfDGIqn0M1I6XfzeU9UbPYVixJsWRbCgRTGQ4zA/vfPb9MvHfj9r/xo97X7PhbvDOPp8Oxc/GwznwrrHXzWE9PDZzolTTy8rBMy2/MzTbllpjHHCCTKCyroOOuoBXoIWVBceQg35S3t8y88EOxRBmIeMYzLOlPdSSXw8SLgtewr6i13nNSdlqCPmOvecNf8zC/jLYENehDJvbnwwzEiZ/AYEWQughVX2umAAkAbS7WYbJMOqI5/kYBIRO/OqyzZRsry0yZPMTnexCMSh+JMc/qwL/KJIb94BN50weO6dTMPC7PGnUCGazFxWYpv+YN4PrCwC38E7S3dZ/b9STfBH8PSnVUNytesyDJvG7p1IOeYVfRKWT3rmh4mMs8rdco6z7XopmqpP59B6umMWX/NutiKCACde9qK0+KYxhw4yfAmgBP+QUCkmpIi9eB4NLP3EbPdG+TuJC4n3bT8nTXX79jwajyFeHUJSFXJIGqQfP+G+dDTGobIBTh6ikNV7S8aotkjNGwYc8hik4KAEyWcc2acyZDznv+wIZ8YqSo10sFLRKrmIGboQpYfhCL+wnisb/9824bvzo3ZAHNjLy5hq/tUxGR+5Syf19qcTfQSe/r6kU90f3fXO7uv7P8ImnKs16x8Yy/+TAe+J8k39lAkPAe+T8Az1ffNfVDkM4n4HxeeS+hTpZ5frSnqUqb6wAOsZmOYj7X5rh/jc6aM//V0WzO5LT981JpK/4qTMiHAImFIKS6CeQQw3k579XMv23vA3OXOJ920BL5s09o379559PnY3CY5yggjCbnArkhxiK9dJseCEKcO9ma+1cRgEpAYodWNB0XFoJzs6hUi+aR/0qFqi4oEPkXJoIl0sCaL/LE+JRX0t16ED6xQYTiobP5wtq75XnM2b5p9q3e20k38xyYHu88feB/+Wt27un1Ht+rdX/7uJv2yAd5G8XqVjas7azastgUMPcgz2aRLIcSmWT8DVp465WwoDlz1WpScCMrPxGSfPE1UlU29GIOWCaNYqBFtCCJg+7OBmgLiXqgrLNKSaQUm5tjnzg3oI0hPeqyoaX9+tP3gdTs3vhzOf4ehRFDh2zFFA5uHxDLx+Cc+lGKP2FHStuOsjGpvlPO/7YhXGzhzk0lNQ9uFKq8qguqfDHzROB0ph7IDBwuu9YU7LT9cQVXOl59/FV4ePJKGweRMLA5jDuelZOR7A0MdrjlaeUuHtC83b6l5JfatTUvbB3gL3TH8KONfd18+8KHuC3ffjN+acFDNyafBPEt9MIK/cA2b4bvDmvkJCa45iQQQZ1zimRid1RG1EQG0Z1USIHXUiDCzVmieMKqfXKj+8rACkWqsKcxigJKTak+h6geBTPNvu6ixwLNvhsGNFhmUFc9o9HL2keQneVGqTtJG6ghi9Ks7NnwMITwpw9TGA0spKAfgg2CwJQFJOwAnZclYMsNCBq0DbzxG4sOvnAAoDjtWRQ6VSCAIqntE5iUji0t8SEefP+avuDuGN+R/8MqXdU94+A9zu31bGUzhke/R2rT0NLl57dzatLR1pvEsG87TdKfxWrtGfmx8sNt66Jbun77xIbwLfEt3bHIf8oFKQFPqhsqmxH++K6wPqWSe9frVdM5ULOcEHvOuNXxTJY8lcs54pBOFLwXyYOPzdZiaUzeRqImRDUTwBqD4IXvKsDxiSi/CCGXXlOLABrguG4OK40roW6++Yu9T0Bdkn/RY0Z2WXujwul2XPWc0Xvgk4uMrlAySRMSiwLmCghuXItJSAX/SnhhNMbhfjp5rtOm9AAAocElEQVQoEyRZmhOEbKqnOCn7D6nkSiSV88CDTLtAYMLJ6P3gAPR5l107Or/79oueVp2Fi3Ac5kDMMZSR7QBbXdOel7Kn7TR763O23Dxjeh7yveY8TYd8YkI2Pznc7cKvedl++NPdnQc+1d1x3yfwcv+ozkffW4Wefhk8DXBTVS2Sh6fDgiYOGhilXNY8R9aBz5juOOqaujSEIp+vmuydX5xlokpHT7PlBWY0lR9cEkCowCLHV5HEz0EbjoglbB2XfGlB7NY/Dfg/G5YAkCdU8LGC6cJkZvY57B+qrGSsuGnp7NrLd3/6uu0b3ojoflkR5G7L/nNzTE6vcWnMxNGIG3cScotce0cSYcFZw4mhRvyXfaQnGMKrCHQiX4SAhnwHEVZMNAdjZEz4EEn8pA/h8MWmfeL6/9itnbkgARoMAhZgomC065YOaf+6hP2dh/62+/ju3+02nP/obv26x+Drm7v1a765O3/20mpPW44Ivx+befbfrsOqr08e8OYnR7r9C9u6PUe+2G0/9Jnu6/d9pttz6Evom7Ge6rLW+KklPuNlnnkuuoMyDDQpY+Fa7jxT5hqlStoxt8o3lE0rCIK6UYGk2vEaNgLnjOETFEU88OI8kyIU/kVFMargaybJQTYGYyC/rT9tEAIiSK+1AS0J4o3aqdEQKSIJXiJAb/RG9k3IV3bNcFdmTKvf2PfYh9979J4vIOgrhig1RaaoYToOXJniIXEwIRZzocPLJGaypGo9GcWFB1USk3xD1UOkoOGCVEGkrQ4N2HrjCY06WRh180fxwnZ+Tfdz3/qn3UWzlyfyIgfBcFwZa+Mq9kat6r5vEytd7zx0W/dHX/kl/MEw/HUWDKeH9LrZi7oN530Lvh7TXbLuUd260cO6tbMX4ttQF+Jnny/AfFG3Bg8ua0cX4kHmQlrrTnkUT2l5x+SbRfzLCscmh7pDC/fgj23f2d1z9Ov42t7dffjO7uD8PrqRz3gNCloNKijQkc14qhtZl17ui3xvX58ZxiKPETOUvH85wcXKLV9stonPNGaaVAAacBCgpQeQ9t+qtibk5zDbzdsEDtBsSOyBNUOfsa+0UvykB/7FiQssdly87hFX/eL6L+9v2CdNercnbdgaXLdzwzPwSe4/bHlOOHly4pPTKjbX6ksvE0LbnlqzdMBqNmJiMIdJRsakXw86tHjNBGM2RUflh9x5hwXYGM3Kb/csHJugaSfdd1zyn7ofuPza1lx+F13sgoIhTZ6dcvYY6H3pwAe693/9FbjRHNOdi/tSgyjOMOR+9XP5iUe6wCRPdyo5TEdKUNgX1zTiF6fiJ/ypwZJPnVijkdCUGmkrc9NapBi0ahtL2hJfa+owfvzTOWs5hba+9mD7srnkhi/iantAVEPBlthxyqFDjhznclrjRYwFLNXTp+JBnFAKW+OGGtE5qM2x2D+YM6Mfu3bT3ndK4RQu9nUKEGF63bb1NyPSp/aAcv/eCGVOnYpAgpoIHeIgOa2erAUQNsTzgXkmr5yo/Ofh0Rdsi39Roaxi4hHzKRibdR40GnfhGJ4SLqzr/utj/7h72Gx8d4sWGgbiYhptnuewqrrkc2RcnD+5/63dh7e/QW/ozPKFC+5qfC+HKh49OAQesUchqXDzgScKEO7SwBjiA4xz0aET8soFNO+YMNLdkrJQKU2rNXhFJx30MCkUg3sYNGbLBz1sIhe9Z4YWI85TtQKGcTlzSF9+JSRDgyyOEl/DD17GSqWMmzEtblIael8VVLq0xUhuwUnmX1575b7vE32Kl1N6Tdv6Hq0dPXd8bPIZbAlv9ufAwhvIrUIQx6DESC0PzAenfLgIc2bmldk4Ax6/cKUbvnqHQWcc9O8DNI9MWecxJxAbNn5rBaT4zRXjBX6YYtR958Zn9hu2msuFLsQY8oWbrqhkOWkOy8Hn09Wb8XdzP3fPjfGbGnAqLBZ9tA+q3Fu7P91ZwRsjTvWbsJgrIdNCtBoePNp69HDApI7lNvfT2jLTPjFsX9bZ3Fy7kYRXYopmzVMPX3xwhLw0HGPEP65jD0GTm6eUAThC7iYkDItUzMnlgoNuiI25xB0SWGCkUHSrAHpRw1peHFX/xDE74WOqOEfZHz3ZKSz8ZOcUIML0mo17vwhKn0smp01vu+ZWS5Kkl5pxWlQto7CUfOhhLj9PSa3kUy9QEguiYmu0FKmJxYuD4RqfndAhxbvGoMHgm0/nz1zS/atL/osRYrYLnlI7zCdvKOPacs+ps+/oV7o/+NpPdJ/D36ThT7roj4ThvXj+tAvvdnp3Nmn9qBo/UM9vreArdNo17fF7rvCBBslSp9D+oAN0yBMef5EdqwBf/P3PeqBIv9yHY+AbSapbbISzZCJAYnbTQSJZnrKWvHgd+YdP7d9NGVXh1BSjYmW9OKeQRwJ9zrQ1TXlLlzVMfP5hHTUgZQCE/5CETUakjQdNe1G5d9L+ap2GNoTKTffa7A/CnvLgca3a2HTFuhvwILqVG/PWnaShk0X8TAL1QoYySBDhYaE5qiV1qA2l+K8E8bBCnzImNNPngBpMKZifj/74tKKeHrNpn7r5BXpDR3rDSzmVoQBrywo2eKZTna+jP7X/D7s/wM+S3rOwVZ/J5Yfn3UhuFn+fU43K02IRoBm1ZzVvrKORQUsnmi8aE2cBnhoXMeiNJNqDx7+DozVp8ao9c28s7Yd+8YWf/dSsbWhPuTHq4x+37vPznnkGlEViOGezCISX4IVOc2bkA9D2SitVMcIHiFyTx5g52vOXNQwlIwAJ/Jd9kIWnp8L0po6nMPYDBg0JrSsp+RCnuWQAfdlk62Xoi0brlEke8aoNfsJjNDP7TBTCPANXkhOddCSjurPcslhHsiLZ1mgOGeLAiSTKC9TEY3JlHvq2pkeKlHvTGR3vriT5jjEbdcy/FYinnd/ysH/dXXUhvi+7khGhCbeYN8HsOfbF7u23P6v74I7X4PcsH9KdkQ2ij/uheeIH7uOOlnWg/al4dWIpI3jeAfU5QNLZyG52NSdt+C2XvEvbRmHaXvmIIPX5YOaR/xAAvzh8ojGDJ/VYxXmHfeiDH0s6l62XxglMI5NLDXkV1dPTAVIXI9SCTND2fNV8YNgfIEv+ZK7AvCfKUm6+9iumfMgGaMbrzbng5Pou/vHG/Wh27pkr/eRTcT4gIvIB81SX1+3Y8EJs4H8Shw68yUXOKADTOu28mAsOkqm8AtGJkQ8mObFCYQBKJciz9gqGsMBn40bDYsabUHMLF3U/89j3dBfNbKTlqo3Dk3u6v7nrd7u/3fMONCb2gF9hwwaNTw4hPjYumwuB6vUo96kERWa4Z+6D5TPcP/cSWmmDqMESjxuwDZmm+0VW7Um1WMShVS//0HAZUzvosJJ6Ihi15UVcPEtQMKn2oXWiq8xgF/HDmrSNTDgUz9TIAqDd4vzZ0ECxp2IOdktTyziii5w41KS70YuuvWLva7RYxUugryIgobCZ0fU71v8Zwn+6NuAsh1AJm+qy7reIfaDTA80Daw7Bh5Fpy0wDuJxslhp9cWBe4K+GRuPO493iyfyo+3dXbOke/7Afkng1LofG93SfuOet3Sf3vAsPvQf1FDhen+bTYX0ogXuJOMsHEeCcT0eP1xDcJ+XOU264hO189PlhRd6J7KudbQp0EuZHE8ofk4pBCa9R3Ep1XEKQUrCoXmFSMXmY3BxCdS2ljcwKD0ycs/SNDoVYRxOK3btUx5HH6p5qgZ8EJsdCmYd5nKPO+KDQvf+aK/b9B+RDYVt3NWa8qln9wUBfuf/Kn5o/cPhT2Mg32YPTw7U3aplmKFiHM0e2WCx6UiUGOCFSwopWAtEeCsYq5tKjId4l5oQvvpbl+tsu/t5Va9j9C9u7T9/7bjXrwuhw/i1VNCLflkWjcqq/qSH2wyhisImHhebsFJW6/6ZRmh1r/0as2V3avq/LVSZYAvuPuGrLp14mOqbQ1fkVPuxcw4At+wvVCI9QqS9UuQ9GqFnIXTKONFAhWA9zKNf9iwX9oqcAWCBCqHUWhmke+Fx48MEfw/Ub4SVuyrCvO+cuOu+n2Ac2W825DWc1cYV1w67LnrQwnv8rnFQ8ODBB3BjmODCoJd06d0LMi8OJ/TNgUm3BmDa27ThLlkZ6JIX/MTpU/tGo/uXkfHp8Qbe+e9Y/ezfeNb64hTgp+sjkQPelA3/R/cM978dHAP9OrzHj16nEntmoLCg+LWYBMzS9GaTzBQ//GLPSFKp5jbJatH+ltHKZnZLmFdjLSz0mxaGAF+FGrGD3YuXZkKeN5cz9GLflS3Vw/oy9B4BEaHfmZ/2E08xJk6xoSmLUobMOYDEjrIwJnH72wMi4SyITynVZZipKlwgxENH83Ozcd199+e5bzVvtuXpbbeTEw9PklyyMJ7/GxA2TIJU8NCU7D+h4obgAHHjkDAdAnJ5hFj4VkFkfXDQrmAwHjaqmxTvHfC37w5t+s3vkuu/soZxoMcYPo+3GrwDdcfgf8EH62/BD37fgx9WO6imwXqPqbhqxcM0GVrMyWHwxLdoTiwp0/AJ1kaGA2LVHrGKOYqM5R+GlvflGoEbRATU1f+BG/sPK/rzyusUJ73Ft42/5y6EVNoKWfyagbqCa9wPwpjVzdz5bR1MUiEUH7XAdUpR8qbU6A3qa+6KSG4j48e22mdFL8bT4fxT5aSCmpWhV3WAzo+t3bnw/7m5Pc75KA9MTmVlWTHA5gFSWLvV8ujRJC7I9zOthFyGkg8NjksXinwDBO8bfcdGPdv/mES8ANv/h2xr4x8GfFz083q/P6R4e31vmu4/crg/T7zj0OfzYBpq03EFjN3oHGPbxFBgE4NTEBGUjl4DJ4JoxxqwCaOQiXTnUxT+1Yo/nFKWMoCmXvvJH5nR7CZbwb5lS0vg0vuS8pEyuuB2uMeIofbZeUyKHxa6csQydgABgTrzvUiOEKCP1s27IrqFGTozouZgOiAy7bKD4M3bOwgdY7FeoN157xb6nQ79ADKBXZUlPp328Zv/mDfd948jf4w5zpQuI+2b5lBE711Lb70ubA4BgoEsjH5Bn8rJaRJYLHOMvk+WSNGzx5W/18JNQ+nQU78IEK+kHEUGrZfj2Lt/h5RbYjBpgkNVr1NShvOgBVE1KXmI2W6JqDhpnAJy45GhoF3LLCyWqL27gk7E3ztBmWqxqKuYWyg6Tdl7HA1HkxzTlZYcGLQaNEEpuWhrInuImd+GJiByJSrkOsUolsY9Q1lX4TfxW4ZwKdJgkz49krIPZbbtwtO5fvnDz0n8MWnqrcGm8rgLacSBu2L3xKfPzCx/CKc4x2W3inbBinolWZvIwHegi3WLEFFJL9yBxY5WpZZZ9gDqJvNOCJju+XxtNzO/Zqtok4yM8hg8MAn2Lht74gAq+SrVp4nAOO3Z1xs9GhrYuglI8AZsqMpOKFC2rDW5ZhlL0Bawgk8W4QcoFiJ6+BNVU1JCHtVgKf7p/yqlkH0ySQ4g094VFrxgtDeDaCER5gp9aMy1f8fsiJwwrbMzmzNgWc0ODfMdOTvGfPiXLDUi3jSUM5+e62e+5evOejwXi6b22sZ5eT0C/bsfGnx6PF96iA6C3ON3BgSCBTJBSnOFlVQ+4kVzo9jbRdID59VDYXnl0mERzide0PKhoXIYFS6wjDpKg6YVs/COfIepwMauJ5QQXqil+4IrOfZY4wxbcsKcaZAw7RuALzhzCAouDei1NHtdDe/I9hjbLsR/6z+0P/FOrjT/WERAFEmdwTAbWTTBujth/2soszkl8Qnhz3qhmsPGPQ7Ci4uK150bUI3v+KWn9CJsIZPNMSEWdDOPC+T8bT4t/jxpnYkRUZ8JT+sBPA70YT0DjhXo5BKajSUgmj8kph9wmlDRkKwmeNvz8ctjyiqPX2YMGIbrUT8Sk6PJliuIELe8CiSYTIO3AY8lpIMY48CbWZk/yXmxiqwWHAKkQRU1G+FKM8kNOqIW0mHCZzdzYLMNehhm+/ZcmpLcm/qLLODkcTCRUut5/aRBlp+Yv+MgPMEwHUEDGVYmo8GCGS2aaWDEcdi4rMxV6scBhoPa00yYeDiLvzl+it0bAwHfuXoKf3nn1FJTTxvJ+T5uDacC/sn3D68aT8fOGzp0kZlMpbQ5/EQ5lPGmOpLnywYjfXCTD2nMUSLuutPozqqgieO2nvClxCFw6fsYeT41ZfrVAQRYntdhceIgsNkCgQspNIyobMJhtKDBtexqnT4kElryeoFWKvBpKJlxwHDd+yOFX+S+x9Pfvs3Huhdm7NFEysT5/6jRrhtEbjovMlh4sLZK9aoYGjplk0tpv0NSI7eQ64yAGPvjy+lds3vt86ZzBi4/jDLrkWUxG+KjjH2D+cTluDqQUfklgkzwoU67D5MyB5NuGSSe3LQ7pNzyaeLh4aLW4iYADRfvzgduWvqSAi31Q5liGs+1aPnm9WKM6+rz0U+LTGtFwDoCg84Gr5RmbcZ7IvugCwLRnMGKrkK0kfuLUoRPKmMmNvcgXl9iXaVr5bCha7nDcZaahY1gif6FLxfTvOHKmxINx4Vtzb8dHFH8S+Wg3Z5XTOvt9z9PqZAjOjW664tHPRn5ukkwFF1pMHmt3OLNYFg3psuEw8jBUXky0WHEAIV5sT0zhQhQzCR2I8OofLuY7xVLCHTR+ygUr6fIvuGlQjqG48+CpEGvChVxK0gtd8bllyBk79UU3M22G9txg5Chxac98ZE4oN84J7Rvd6f4zTwTKEa4caz9+rCKWMtPIcVaA8lDAvYKNMGRnOmZylzdkD9XIZc4MlGOQf7La/EWuzBvMsgcvZ0DdxPqFzfKDo+0qjfulaRn7z48+eezCmTU/gmTepmTjsigDhZFFgFNkoht2JF4HYz6PGqPV0zKsevYNP0xShwuM4idpFZFxcXIuKumZT8MMoSC4oYijWGsNRTzRrDRth3WJF3TkQf7Sh+zpO3HtXNnwBk5kj51W+xpB4Q3sqeEeCJ2wt7tF+wdD8cCO+hG/8xdZEq8ARAyDpZglplApeGHfWNhP6kFRQRf/rT11KS/DyY3YIv/ObHcb65b1W9TPMJHRnWGvjTt8Rnn90QOH8Vb55CqeplOnwLLYTSvxtGXFIMnx6BhzgeQBSCW3xsOAPlctNg9J9tQtxkFYptVS9mknX1IMD60P+hUW5RmzVB1NyxNNaUUIcay919a+8ngnVEpOm33jAD4ym9Vpb38lJ5C7GXgCbty0Noq2ZJ4WBYB7GpyvFCq/ZsuZA0f2RLQeqTwLsU1nfMmToc3DhGWmwa0C4wtrLzrvKS97+Lb47XchOuPX2NkZd9t3uGX75kd2kyO34lDx4QsMXNQrIJX/nCWiQiayd+oUYrCQOXzYnnvZz0ZMRRqFQzCKPekGJ3STqcX0i7xnsco+TYYhSw8y749oQUMiQ1tQ0g6jktfS1nEDt/at3lJ0tW/9T4uPzUcUDsvtTfzcf2hMj9KydjYWeaZ9fpw5ygNVnnMUCrz2u2vR+S+yFxguDjzJgM1mpk4OZHVbNxo/acvmu+8w7/6a77enx+2Gt2zefgc+P//9TAxzuHTD8nDSUoURtBuNlcTDaQ86ZGnkg7bzdORCY/PKP+TkkS7YtJEiiRguBK85yx64xT55lPFuU0f4inXwwwYIjKunm1aKnzIMxVrpYPIa++/bt3qVZvNpNHkRL/1T6ohFt/4hSetGq7//AA+e6XYe5i/2Hxqm1aRkgVHoBOnZ04A5YezMf9KeBUGeo5Y8gWiLIZ8yrw9KwR9tY32eDQ3rODmfFWPL9kseibeB/hy/iuWqSKHOIQ6ilI8lGbIyDRqHoGL32uJyeCEmm6o6OxGkcVLFPnFSUaouAvKSJunB4m31AttSzMYny8opLqE0Iqp4sNFZaNYj3zRnjoBcrEfZ8u2NEzNtOeRrEHNIplyX0GMjsXk4WtoI5rWzZLAJ/wCWPTIhEtwmp61d26TEGK6nhSieIC31LPsv4Dv7P3i2NCz3dFbcaRkIBxPD1wx4R/a24MQhR+n4GhKmtVQvSB5cjCgOHXI5CEpQAFk4pK2dRlkEuaJe6hq3HGPCm297yY2fOpTJj/lkNLIitx4ZOaxW7gzgV17V8j6qXmhVXWtUe1uTY6lny6p949jCpWYbNXLlqbf/UHL+5Bfynh7108Z6AVkdDOPt60FbGE1d0LSa57nk+UAU5UO/9BSKqJfbWI9nU8MyurOqaRkQX+RfODP3vcjbTVGINdMuTB4YuUy0ec41D08Hytknm0URhUG7+vQpeLBOANnTUPaYFxVQLTB6EhYDz2F7up4moxr5Hi0tWcql0eqRb6OctdNGh2zzwj4UlSvJYm0c6wa3yrQH6g+xc93yW5oIxO7ZI3/Ff2ufZwJlmkWeMcmWPHwJm8Y8g1wHOeX8EsO+Q59MDPkShJb0qJjkOv1L0vhH/bEO7+83nTKs3nTWNS2je9GmXfdtvuIxP4RPnLydaxUXiegsUTXVSD/PFFyeNQ+DXxw8YA0LtAhmxawqPPByN4ZxoWnfDuOmJ0mhE0UGIW2hT3vFZVsH5Nl8zKXY0k6iKXqNSZCpI98W2i7jHERvLc36A2igWnvv23OxL7glAQWrjb/dPxUKts2m4EhH58S8wwiX4j/54SxAFp1fOJLK0A2xF/ECrFyJx388Ofxmkbez/liHReEsIryXsyikGgqSPfqVHetfi5w/T4nHQTqx1GppW/HAecbtMI+bpUjFACXRVkwhZSog81M//Ad2q0PsBLUw5sZeVcigMpDWXjz6IAx0iqwEHQ8ArUw6xLf+ydhbd7n21HdOjhM/4Uo83Gs70p441OGenePKCl7xNbCXnXlp1Ds/yLROF1at81Cb+tGklnA9M5p9/Suu2PMCxEH2WTlYK2f9uHbb+pfgzYBfY2m3xd0G7gNoeaUgwPTBUF5o7V6IUUs2DlZTrNWIEbiBo9XCyE0VQAJOtPSWxSpmQ6crBAU9BtyMIiMv5eI1tNXVBGlvu97c2FiXcg/zuO7ZVYUa35RYy/5rdtMy9l/l3AofnOwp1OTfvsrBQUm+ICAMR8NSoORBZjGXHoaJdcRBuo3FuvI/mnnpdVee3t86YX+nMit1pwJwpmy37Fj/03hX+bfx43NzceJxTGoiHFm0cxuNDynm9gC56bDuF2jBhbBvDYMTAUgl0ukCtIm4uRCuBQzXNGcPFipHkWkhVhRx6rp5ciZXllPsI09UgIZ9mT6OvQpc7hM9NhA4yY8m0IIXNYVWMKmhtHfXSpdHCBsEwJT8E1j/eyZU93C6Yq1AYVJrgxwiuGZCD6sRfgfnaOZnt5zBH68L3yu75umvzPhMW23ZvvEp48nCOxH0lToAFRtqEP94OBqY9DSsFxxldav9ww1JWsuqaJqw0Iac6W/IT59+iuc42qIOOoBJc0gPdIWDXHvLAJaghRUAoQ+aGOFXFKVLYh3XvvE5jLndF+G59l7a9VJ60u/ljzFG7LLnhaPZvpZNWhhe7pZEjsgh66EdLZd01As0BDLaNjMz+4wtZ+gH2Nu4Vkr3d7dSlDNoh09PbRiPD78VvyUfv/6f4UdxmopQdKJ5OO0jbaWHIbsfW74xPVNmmjOqNQ9+QFPGUZRbPfAj5IgPhdMWd9sApj0LMhvENtOa2w1kO8+rac+9qfjV3H1a+5OzutfCI9+jlz8w49g81fQVUSbO9kvMfvir8eVByNyHAuPR6MaZ7rxn4cM9e5eAOivZ3MEDbqAoR6/YfumLceY3oGbmVDfaCS65qEczvVH9iMvNt7Q7qq0n6njtmTwO++m5lyBjkRYVc+3Z/HZuZG2jtQ3S47e2cpF3PLgqBSs+FUO2LPsWK0wrXhMjRb3BJGTjlf1awXapU9Rak5bOdNmcOSjYIuu56kEK+FLpnX/rhUjqWoQ2wZ+t6a7+lc13vRr5sBIVHhCD+3zAjuu2XfJk/OnlP8QmvokHx7pQG+XBsYFVpDysOK8oPiziiMkO2nMkI5VtJKZ5oSFfhoVfuaTIdDMTprUWPQ1A9o2h4ye4B8QEa/fVNqLp4WzzqOwT2yuZ2lTGY4D0H8lGILEZ7J95xMC+fBYnYa78yYXwBQro/jkJHl6G/PIABd9hrgRlHBGwU4i83An7H7v+yrtvkb8H4EV5fgDGXULmTwkdPnDw9/F7np4ej7jsmzgoUqoGNQhNaoNK1hRFSKNY2qS0BVKcTiHskSLT7Ux+1ncQwzWUVeRU9DAA16a5F1fgUvyiCwU65Si8peyhY10ZhE2JaYp9bz8NbFFtIAuv0bObOguxLmXfb1w1aGRS0thYmiwONhuXcjl+/3kPv+CnzsYPTOQOljUxlw/4gWYdvWLnpS/E3+N5JY59zo+8rm/eddy8vgvE4WPr7UGLdsvXBnehtHNpglJATGMUHZNKyqO/Tp0MyTqeqRv1tbjPjBM6ARBoYV3oEClESZp11an26bLuZKg/WEs/eeHZ19wblqSmjfIgCHsqlTWXyL/OSiJHWs+hTYzPogZNe2gQFzv3OZOHX7zGv+L4Mjwdfg3wCfyAHtriA3oHTfDX7Lr0u3A878BBPZoVq4PVSQatKpE+hOWEXRwGwlosWlMNC1SCaKw5c7TFFpz22mK2dKsTWJRyqNiwKGsx6V9iyQsNFtnlsSh1yTyRfY1/ufbyVHxFNHF1TrTqLcKG/KXyZH7VDEzytQnnXPmnrHUAOs9lsGP5C3tayGbrZG70zOsvv+vj4eGBfz0rP8a40rTyYGZG5//z2ZmZV+Hx9KgKwMeNQ46ij0dhd1/wWCj5RUF2AwvKI4opOIHLgmDJVJ5plovpikGOV7YJBF3BslzuiW31QvOuQ70YlnOt8DFTvrR92sVU8Ft7ipa2L56FEKvkYXL87f7TlWSWxxz5YxBE4FUPkNiBnxklMiPSBmO/7fnRhrYUh33sHxg4f1xexXp4MDUs85mZI/ngGtfv2fDtx46O34yjfKp2hpNlMWCtUxYdVRBFoqNvc8DUsBw8k6I9Rz5loz3E5odm2NiKM4eRgq5P+Wi77GHQYpCoi/hFoU8s0muj6qsuZ8VcDuNveabppeSspTN/NcdtgKZjjkiTxmJ4fjrXcEPZX65ZO/Pcazbu/aLcPcguzMKDemzZeckz5udHr8NLmSuy43o1ojJoikB3magyHD5TE4/sQaP0pOuUZfrM7M2ho4Y2nyzQ8eARYYjVPAiELAJwQ/AuQn6rq0VeanNMfzCw/GTsqTv0r6iWE7/2G8H19w8EgmTaTHh/7Sxr6FV7cCItYdbiJI23NnbMzU2ev2XT3e8M7w/O64Pq6fG0I+IBzp3fXYXfpvjr+EFE/IWedvjOyV7CyauYVCm1ScjXoFAKmgubMrFtz7V1o+FtJjVcArG9kkd7aQiwNIz4dNIf5c4iNvdR73q2paivVzH6/LD3/mhvDOllWI4/UKbFn/hL7F/4CVLzx323+QcG1uVBqiqKX3dASmCcFvDdg1/nOT/YG7bZdT8VD9bVNbse8S9G8zO/ib8w8CTVFeqFpVd6hRuPWqwpYAHhn4qX9aUC45wNKXsWj5Ci+cVjIRo75VIpAGFjHlYxwBAPq5QZvQACuNyRoRM0ZpmcLnvj9uOPPTrCkGXYJdwSmWJ1Xtr8NVumcTsIzZ3B0RCXviG6de3cmudce/nuT7dmD2ZaKXkwb3C4N9xRR9duX/9s9Nyv4m/TbuoVApWZkSiGauo15tIslpqnCqLcAhMottSpwA2gyCjgsD1BAIsCTCw5oe/j25cHIOlR/+Ts+/h1b36m4l2HXuDH/tV3J8zf8cJvcfBtnJ1Yv/y6zfv4t6G4iYfMqDl+yGw5NorPMF8wPzn0XCTgxTj8DWyYtiiYmCxn1Z9kzpGFXJvOWU1N5WYU3hQd+RWMG9dzxkMcKMXrPdAKKoAcL1VqkJBlsCXmZdqHj+rL23D8NUehY7fpvTw4qYEljIvthrlqVKaFr60KW1uK0wDWXvx++FfPTM5/Mz4zfLCH8RBZ8PQf0mPL7o0Xzc+Pfwl/oPYFqJxLmAwWWenY7Ny2QWozNKlLvWJHHPyLJ3UVT9Cp69eNdGb8LM1iQHvbKC5iQtm0I6g8coYbyD4m+wT2J/YfWHTh+LXHpfbvZFmOCMxSmAwJQ/EzNtBt/qkbY3I3/s76a+fWzrxhy2V7Dpj7UJx1jA/FjQ/3/Gt3XXLxwcMz/x1/0e8X8Gf1LkcZQaUWPwvJBTSNViKdTZi6+HoF6gI0LIMwjbk0QXEEedrobscF/ss/bSk7k/ZT4mr9l2AizKVEET9jb8IXzb1ghJvc3Giyq5vMvvGiC8Zveumld98bGg/ta6bpoZ2Edve/MXnsur3b7/oJlMzzcQd5nGSqIrQUskWSM0c8Daz85EJORayKXpJcH48fAKX2bd/akG4bWCbGHdj39KAjtZOwX8p/JCCeHdCl8gFcbo3X4+1/cf5yPzIOBEYKjM8h3tdt2Hzp235x9OUjgj53UQZ4jufGlAygIUfX7Lz0abjrPg9F9FR0aOZKpQ+LfrO6oVuo4OU7vVmUaiTQAqtQYUYd88gBXYocMokt58xhm5Ymj6PVXaH9NP/iDfGxNr/vvr//XlCOz1jazegv8UdfX3/9prtuRK4MRY1zIzPgoz+XkONk4Ppdl33LsYVjP4O+fTaaeRNV47Wm08faAq0iDHrYxF57ntZtpckLVmoN3LBRW/+Fhp4bpzQsgz0pezTZ0H9iuIE5Hy9+Oqz7pC6GclPniDkFo24n/jjzW9asWfM711y++yvknhtLZ8DHubTGOUnJwJbJv52b3/HZf9+Nxz+LovwBFO+cig8Lv5ESxYmqNk/VSwhVOuaoXt9xKZGKOsHF7ruTZ2rRvi8XN1z1mrU218nYL8bXnrSP6p8UY1kq/qX23zYpaXzYZR4fiPjAZGb023NXPOF9W0Yfng/sc9cTZeBc054oQ0vI+WtvFrrD/xm/aO5H8cH070YdzrIYOXSnSrso1ibN0bNFGh0rI/RCNE4Kqw47Ie2iwa3hju03vqWlgZZh39MtACQyJsftWTpNvOJzzcFFjHb/k9FkAb9V+K+wh/8z25333gfar3nxnu7vuWb3/o7kAex/y87LL1tYOPojuDP9MLbxFBTtWhfrtJlb5Z2K/RBycZIGn6dSGhhKpVPjW0g6tLSPpjr99n4mUeJt4g/vEYkfsKjHjSDio/hNhx+F9L2zs2v/aMumXbupf26sPAM6/5Wbn7McZkDf9z127Hsno9mnjSbjp6HYH0UdlW8pZBY4nmKypHMGqaqPYg998twslttfsYM9tVt5ka3IPiJQ8xV7em1ixco+PFODQ+vR6PbJaObG0WR049ya0Qcf6t9Xjcys3hXHcm6czgxs2b7+qvnx+HtQ809GQT8Zr+Mere6UU6afTVdHv1lqo7AZONzoLT3ksYHd7G6qldj7kWCIbyzL4W8rdG5BiLfMzcx8aMvmffhLc+fG6crAuaY9XZldAnfLng2bjx0ZPxniJ6Eln4j2egKK/9LaCDZ0Q3t2w1Je79Jc1aYa6k7TW559aUg+AjQPGFjcha/PAvlTmG9ds27mli0b924HfW6coQzwRM6N+zkDN+xdf+XRY+PvWBh3T8B3Jh+PPvlm9Mlj8MYNfgYY36zE61u+hNTIZ8M1ZDcVZr9tnE0WOuanxXHsww/04RFPbXcgjq8B6qv4DvU/zM50n127ZuYzV2/Yt636PkfdHxngiZ8bZ2kG+Omsu7bd86j5mfGjcVCPROtu7LqF9fhVZRvQYOtxhwU94V16HZp7HZptLd6dBT1ei15fg947hvkodI50kxn++pUjwOGni+5C7+7Dm2H78DeS8Iu6R/uAtQe8O+bGM1svvfIRt5/7FNJZWhQI6/8DL/tZ1UGhjnQAAAAASUVORK5CYII=" alt=""/>';

        domNode.addEventListener('click', function(){
            _mainFrameSlideIn();
        });

        document.body.appendChild(domNode);

        _hookMainFrameEvents();
    };

    var _hookWindowEvents = function(){
        window.addEventListener('resize', function(){
            _mainFrame.width = Math.min(_mainFrameWidth, document.body.clientWidth);
            _mainFrame.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            _emitFrame(_mainFrame, 'iframe_resize');
        });
    };

    var _onWindowLoad = function(ev){
        window.removeEventListener('load', _onWindowLoad);
        _url = _url || "http://script.gossim.cc/client/index.html";

        _initMainFrame();
        _hookFramePost();
        _hookWindowEvents();
    };

    var _fireF = function(frameWindow, event, args){
        // find the window
        var foundId;
        for(var i = 0, len = _childFrames.length; i < len; i++){
            var id = _childFrames[i],
                o = document.getElementById(id);
            if(o && o.contentWindow == frameWindow){
                foundId = id;
                break;
            }
        }
        if(_registerEvents[foundId] && _registerEvents[foundId][event]){
            if(args && !Array.isArray(args)) args = [args];
            if(!args) args = [];
            _registerEvents[foundId][event].forEach(function(fn){
                fn.apply(imim, args);
            });
        }
    };

    var _splitEl = function(el){
        var isStr = typeof el == 'string',
            id = isStr? el : el.id,
            obj = isStr? document.getElementById(el) : el;
        return { id: id, el: obj};
    };

    var _calculateAndFit = function(image, maxWidth, maxHeight){
        var srcWidth = parseInt(image.width), srcHeight = parseInt(image.height);
        var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        var res = { width: srcWidth * ratio, height: srcHeight * ratio};
        return res;
    };

    var _reloadFrame = function(){
        _emitFrame(_mainFrame, 'force_reload');
        _enableAPI();
    };

    imim.popup = function(id, roomName){
        _emitFrame(_mainFrame, "popup_user", [id, roomName]);
        _mainFrameSlideIn();
    };

    imim.getPageCount = function(path, callback){
        callback = (typeof callback == 'function')? callback : function(){};
        // parse path
        var path = _validPath(path);
        if(path){
            // if path is valid, do get path event

            // ***** Two algorithms:
            // 1. Responsively: Emit a event and listen for the callback directly.
            // 2. Cached way: Cache current path list mapping of current domain, and it can not be called again in specific time.
            // *****

            // use 1. first
            _onFrame(_mainFrame, 'get_page_count', function(searchPath, count){
                callback(searchPath, count);
            });
            _emitFrame(_mainFrame, 'get_page_count', path);
        }else console.warn("Gossim.getPageCount: The path is not in same domain.");
    };

    imim.getMainFrame = function(){ return _mainFrame; };

    cacheFn.setConnectUrl = function(url){
        if(!_isCanDo()){
            console.warn("setConnectUrl function only valid after Gossim loaded for 100ms.");
            return;
        }
        _url = url;
    };

    // setUserInfo(unique-user-id, name, image(src or base64))
    cacheFn.setUserInfo = function(id, name, image, email){
        if(Object.prototype.toString.call(id) == "[object Object]"){
            var prop = id;
            id = prop.id; name = prop.name || name; image = prop.image || image; email = prop.email || email;
        }
        if( (typeof id == 'string' || typeof id == 'number') &&
            Object.prototype.toString.call(name) == "[object Object]"){
            var prop = name;
            name = prop.name; image = prop.image || image; email = prop.email || email;
        }
        if(!_isCanDo()){
            console.warn("setUserInfo function only valid after Gossim loaded for 100ms OR set userinfo in first time.");
            return;
        }
        if(!id || typeof id == 'undefined'){
            console.warn("setUserInfo params:[id can not be empty].");
            return;
        }
        if(typeof id != 'string' && typeof id != 'number'){
            console.warn("setUserInfo params:[id should be a string or number].");
            return;
        }
        if(_mainFrame && _mainFrame._ready) setTimeout(function(){ _reloadFrame(); }, 100);
        id = id.toString();
        _lazyUserInfo.id = id;
        _lazyUserInfo.name = name || '';
        _lazyUserInfo.image = '';
        _lazyUserInfo.email = email;
        if(typeof image == 'string'){
            function doLoadImage(){
                var img = new Image();
                img.crossOrigin = "Anonymous";
                // img.setAttribute('crossOrigin', 'anonymous');
                img.onload = function(){
                    var size = _calculateAndFit(img, 64, 64);
                    var canvas = document.createElement("canvas");
                    canvas.width = size.width;
                    canvas.height = size.height;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, size.width, size.height);
                    _lazyUserInfo.image = canvas.toDataURL("image/png");
                    if(_mainFrame && _mainFrame._ready){
                        // should emit a event to server, because the image loaded after socket connected.
                    }
                };
                img.onerror = function(){ console.warn("Gossim load " + image + " fail."); };
                img.src = image;
            }
            if(window.atob){
                try{
                    var splits = image.split(',');
                    var last = splits.pop();
                    window.atob(last);
                    if(splits.length > 0){
                        // may be start with data:image...
                        _lazyUserInfo.image = splits.concat([last]).join(',');
                    }else{
                        // may be just base64
                        _lazyUserInfo.image = "data:image/png;base64," + last;
                    }
                }catch(err){
                    // maybe url
                    doLoadImage();
                }
            }else{
                // guess dataurl/base64
                var splits = image.split(',');
                if(splits.length > 1) _lazyUserInfo.image = image;
                else _lazyUserInfo.image = "data:image/png;base64," + splits.pop();
                // guess url
                doLoadImage();
            }
        }else{
            console.warn("Gossim.setUserInfo params:[image should be path/dataUrl/base64 string].");
        }
    };

    window.addEventListener('load', _onWindowLoad);

    // trigger between module loaded and window loaded.
    (function(){
        var name = scope['GossimPluginObject'];
        var query = scope[name].q || []; // array of arguments
        query.forEach(function(q){
            q = Array.prototype.slice.call(q);
            var f = q[0];
            if(typeof cacheFn[f] == 'function') cacheFn[f].apply(cacheFn, q.slice(1));
        });
    })();

    imim.setUserInfo = cacheFn.setUserInfo;

    scope.Gossim = imim;
})(window);

window._ceCount = 0;
window._collectStamp = {};
window._ceRecordInterval = 100;
window._collectEvents = ['mousemove', 'scroll', 'click'];
window._windowEvents = ['focus','blur'];
window._ceCollectAction = function(eventArg){
    // Avoid bubble event triggers.

    if(window._ceEnableCollect && eventArg._ceHasTriggered !== true){
        // to do send event name
        // console.log(eventArg);
        var stamps = window._collectStamp;
        var curTime = (new Date()).getTime();
        var isBubble = eventArg.bubbles;
        var storeTime = stamps[eventArg.type] || eventArg.target._lastScrollStamp || 0;
        if( curTime - storeTime >= window._ceRecordInterval){
            var target = eventArg.target;
            // var type = (_visibilityChange == eventArg.type)
            var actionObj = {
                target_id: target._ceSerial,
                event: eventArg.type,
                stamp: curTime,
                scrollTop: target.scrollTop,
                scrollLeft: target.scrollLeft,
                x: eventArg.x,
                y: eventArg.y
            };
            if(actionObj.event == _visibilityChange) actionObj.status = document[_visibilityState];
            var o = {
                actionInfo: JSON.stringify(actionObj)
            };
            // Gossim.emitFrame(null, 'update_user_action', o);

            if(isBubble) stamps[eventArg.type] = curTime;
            else target._lastScrollStamp = curTime;
            console.log("event:[" + eventArg.type + "] Record!");
        }

        eventArg._ceHasTriggered = true;
    }
};

(function() {
    // events of window and document should doing something other.
    Element.prototype._addEventListener = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function(name,eventFn,capture) {
        var combinedFn = eventFn;
        if(_collectEvents.indexOf(name) != -1){
            combinedFn = function(){
                eventFn.apply(this, arguments);
                var eventArg = null,
                    i = 0, len = arguments.length;
                for(; i < len; i++){
                    if(arguments[i].toString().substr(-6) == 'Event]'){
                        eventArg = arguments[i];
                        break;
                    }
                }
                if(eventArg) window._ceCollectAction.call(this, eventArg);
            };
        }
        this._addEventListener(name, combinedFn, capture);
    };

})();

function _hookWindowEvents(){
    window._windowEvents.forEach(function(name){
        window.addEventListener(name, _ceCollectAction);
    });
}

function _hookDocumentEvents(){
    // https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
    // Set the name of the hidden property and the change event for visibility
    window._visibilityChange = "";
    window._visibilityState = "";
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
      _visibilityChange = "visibilitychange";
      _visibilityState = "visibilityState";
    } else if (typeof document.mozHidden !== "undefined") {
      _visibilityChange = "mozvisibilitychange";
      _visibilityState = "mozVisibilityState";
    } else if (typeof document.msHidden !== "undefined") {
      _visibilityChange = "msvisibilitychange";
      _visibilityState = "msVisibilityState";
    } else if (typeof document.webkitHidden !== "undefined") {
      _visibilityChange = "webkitvisibilitychange";
      _visibilityState = "webkitVisibilityState";
    }

    _collectEvents.concat([_visibilityChange]).forEach(function(name){
        document.addEventListener(name, _ceCollectAction);
    });
}

function _hookElementsEvent(elList){
    var i = 0, len = elList.length;
    for(; i < len; i++){
        var el = elList[i];
        el._ceSerial = ++_ceCount;
        // scroll
        if(el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth){
            el.addEventListener('scroll', function(){});
        }

    }
}

window.addEventListener("load", function _onload(event){
    window.removeEventListener("load", _onload, false);

    _hookWindowEvents();
    _hookDocumentEvents();
    _hookElementsEvent(document.querySelectorAll('*'));

},false);

