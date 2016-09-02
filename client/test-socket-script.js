

var _debugCallIframRunJavascript = function(fn){
    var o = {
        event: 'debug',
        fn: fn.toString()
    };
    window._messageIframe.contentWindow.postMessage(JSON.stringify(o),"*");
};

window._eventMaps = {
    "change_user_data":function(){
        socketInstance.emit('change_user_data', { new_name: 'toChange'+(new Date()).getTime() });
    },
    "new_message":function(){
        socketInstance.emit('new_message', { room: "localhost%3A5000-public", message: "test test" });
    },
    "on_new_message":function(){
        socketInstance.on('new_message', function(data){ alert(data.message); });
    },
    "user_left":function(){
        socketInstance.on('user_left', function(data){ alert(data.username); });
    },
    "user_joined":function(){
        socketInstance.on('user_joined', function(data){ alert(data.username); });
    },
    "create_room":function(){
        socketInstance.emit('create_room', { targetUser: '64631764-85eb-489b-8110-7cb808b037f9' });
    },
    "room_ready":function(){
        socketInstance.on('room_ready', function(data){ alert(data.room); });
    },
    "disconnect":function(){
        socketInstance.on('disconnect', function(data){ alert("disconnect"); });  
    },
    "connect":function(){
        socketInstance.on('connect', function(data){ alert("connect"); });  
    },
    "enable_collect":function(){
        window.enableCollectAction(2000);
    },
    "disable_collect":function(){
        window.disableCollectAction();
    },
    "trigger_disconnect":function(){
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketInstance = null;
    }
};

var testEvent = function(name){
    var mapFn = _eventMaps[name];
    var o = {
        fn: mapFn.toString()
    };
    window.Gossim.emitFrame(null, 'debug', o);
};
