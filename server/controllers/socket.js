var Messages = require('../models/messages').Messages;

var service = require('../services/service');

var _ = require('lodash');
var i18n = require('i18n');

// $ mongo
// > db = new Mongo().getDB("ReactWebpackNode")


var domainToUsers = {};
// {
//   "google.com": {
//     "ceid1":[socketobject, ...],
//     "ceid2":[socketobject, ...],
//     ...
//   },
//   "yahoo.com": {
//     "ceid2":[socketobject, ...],
//     ...
//   },
//   ...
// }

var domainToRooms = {};
// {
//   "google.com": {
//     "room1":[ceid, ...],
//     "room2":[ceid, ...],
//     ...
//   },
//   "yahoo.com": {
//     "room3":[ceid, ...],
//     ...
//   },
//   ...
// }

var socketCache = {};
// { "ceid1-google.com": socketObject }
// client

module.exports = function (socket, io) {

  i18n.init(socket.request);
  var __ = socket.request.__;

  var defaultRoom = socket.currentDomain + '-public';

  var ceidToSocketArray = domainToUsers[socket.currentDomain];

  var roomToCeidArray = domainToRooms[socket.currentDomain];

  // if true: update the name to db; if false, create one and assign back username.
  var initHasName = !!socket.username;
  // if true: udpate the image to db; if false, load image from db.
  var initHasImage = !!socket.userimage;

  var initHasMail = !!socket.usermail;

  var initHasLogin = !!socket.userislogin;

  var setUserData = function(socket_data){
    return {
      id: socket_data.ceid,
      username: socket_data.username,
      currentPath: socket_data.currentPath,
      image: socket_data.userimage,
      isshowpath: socket_data.usershowpath,
      is_login: socket_data.userislogin,
      role: socket_data.userrole
    };
  };

  var joinRoomAndCache = function(id, room){
    var socketList = ceidToSocketArray[id] || [];

    if(!roomToCeidArray[room]) roomToCeidArray[room] = [];
    // mapping a room to participate users.
    if(roomToCeidArray[room].indexOf(id) == -1){
      roomToCeidArray[room].push(id);
    }
    if(socketList.length > 0){
      socketList.forEach(function(s){
        if(s.joinedRooms.indexOf(room) == -1){
          s.join(room);
          s.joinedRooms.push(room);
        }
      });
    }
  }

  var emitOthers = function(room, event, data){
    var ceidArray = roomToCeidArray[room];
    var selfId = socket.ceid;
    ceidArray.forEach(function(id){
      var socketArray;
      if(id != selfId && (socketArray = ceidToSocketArray[id]) ){
        socketArray.forEach(function(s){
          s.emit(event, data);
        });
      }
    });
  };

  var emitSelves = function(event, data){
    var socketArray = ceidToSocketArray[socket.ceid];
    socketArray.forEach(function(s){
      s.emit(event, data);
    });
  };

  var emitUserJoined = function(socket){
    emitOthers(defaultRoom, 'user_joined',
      setUserData(socket));
  };

  var generateAndEmitList = function(){
    var outputUserList = [];
    for(var id in ceidToSocketArray){
      if(id != socket.ceid){
        var cs = ceidToSocketArray[id][0];
        outputUserList.push(setUserData(cs));
      }
    }
    // console.log(socket.request.headers['user-agent'] + " init");
    service.selectParticipantUnreadMessagesCount(socket.ceid, socket.currentDomain).then((result) =>{
      socket.emit("initial_list", {
        room: defaultRoom,
        users: outputUserList,
        currentUser: setUserData(socket),
        all_unread_messages_count: parseInt(result)
      });
    })

    console.log("Socket connected! [" + socket.id + "]");
    console.log("Domain:" + socket.currentDomain + " Path:" + socket.currentPath + " Params:" + socket.currentParam
     + " Hash:" + socket.currentHash + "]");
    console.log(domainToUsers);
    // console.log(socketCache);
    console.log("Info - id: " + socket.ceid + ";  name: " + socket.username);
  };


  // console.log("user image: " + socket.userimage);

  if(!socket.ceid){
    // socket.ceid
    if(socket.userislogin){
      socket.ceid = socket.userid;
    }else{
      var req = socket.request;
      var currentCookies = (req.headers && req.headers.cookie) ? req.headers.cookie.split(';') : [];
      while(currentCookies.length){
        var check = currentCookies.pop();
        var parts = check.match(/(.*?)=(.*)$/);
        if(parts[1].trim() == "_ce"){
          socket.ceid = (parts[2] || '').trim();
          break;
        }
      }
      // still not found 
      if(!socket.ceid){
        socket.emit('socket_disabled');
        return;
      }
    }

  }

  var cacheKey = socket.ceid + '-' + socket.currentDomain;

  // init rooms collection
  if(!socket.joinedRooms) socket.joinedRooms = [];

  // check the rooms maps by specified domain
  if(!roomToCeidArray) roomToCeidArray = domainToRooms[socket.currentDomain] = {};

  // check the users maps by specified domain
  if(!ceidToSocketArray) ceidToSocketArray = domainToUsers[socket.currentDomain] = {};

  // check if the unique id and socket object mapping
  if(!ceidToSocketArray[socket.ceid] && !socketCache[cacheKey]){

    ceidToSocketArray[socket.ceid] = [socket];

    joinRoomAndCache(socket.ceid, defaultRoom);

  }else{
    // open new tab but access same domain OR
    // refresh page / redirect to other pages on same domain
    var socketsArray = ceidToSocketArray[socket.ceid];
    var previous = (socketsArray && socketsArray.length > 0)?
    socketsArray[socketsArray.length - 1] : socketCache[cacheKey];

    socket.joinedRooms = previous.joinedRooms.slice(0);
    socket.joinedRooms.forEach(function(r){
      socket.join(r);
    });

    if(socketsArray) socketsArray.push(socket);
    else ceidToSocketArray[socket.ceid] = [socket];

    emitOthers(defaultRoom, 'user_change_path', { id: socket.ceid, currentPath: socket.currentPath});

    delete socketCache[cacheKey];
    // socketCache[cacheKey] = null;
  }

  // check domain user info and updated.
  service.getDomainUser(socket.currentDomain, socket.ceid).then(function(result){
    return new Promise(function(resolve, reject){
      var prop = { host: socket.currentDomain, uid: socket.ceid };
      if(result.length === 0){
        // db has no record
        var promises = [];
        if(initHasName) prop.name = socket.username;
        else{
          // if it has no name, create new one.
          promises.push(
            service.domainUserCount(socket.currentDomain).then(function(domainuser){
              prop.name = socket.username = __("defaultName") + ' #' + (domainuser[0].count);
            })
          );
        }

        if(initHasImage) prop.image = socket.userimage;
        if(initHasLogin) prop.is_login = socket.userislogin;

        // check the email, uniqueusers, domainusers.
        if(initHasMail){
          promises.push(
            service.createUniqueUser(socket.usermail).then(function(res){
              prop.uniqueusers_id = res.id;
            })
          );
        }

        Promise.all(promises).then(function(){
          // after get new name or not, create user; after created, resolve and return.
          service.createDomainUser( prop ).then(function(){ resolve(); });
        });

      }else{
        // db has record
        var item = result[0];
        var promises = [];

        if(initHasName && socket.username != item.name) prop.name = socket.username;
        else socket.username = item.name; // load name from DB

        if(initHasImage && socket.userimage != item.image) prop.image = socket.userimage;
        else socket.userimage = item.image; // load image from DB

        if(initHasLogin && socket.userislogin != item.is_login) prop.is_login = socket.userislogin;
        else socket.userislogin = item.is_login; // load image from DB

        if(initHasMail){
          promises.push(
            service.createUniqueUser(socket.usermail).then(function(res){
              // force to update new mail
              if(item.uniqueusers_id != res.id) prop.uniqueusers_id = res.id;
            })
          );
        }

        Promise.all(promises).then(function(){
          // if it has name, image or uniqueusers_id changed, do update.
          if(prop.name || prop.image || prop.uniqueusers_id || prop.is_login){
            service.updateDomainUser(prop).then(function(){ resolve(); });
          }else resolve();
        });
      }
    });
  }).then(function(){
    emitUserJoined(socket);
    generateAndEmitList();
  });

  socket.on('change_user_data', function(data){

    if (data.new_name) socket.username = data.new_name;
    if (data.new_image) socket.userimage = data.new_image;
    if (data.new_isshowpath) socket.usershowpath = data.new_isshowpath;

    var change_data = setUserData(socket);
    var prop = {
      host: socket.currentDomain,
      uid: change_data.id,
      name: change_data.username,
      image: change_data.image
    };

    var rooms = socket.joinedRooms;
    // Find the rooms involved by current user
    // dont use socket.rooms

    // And braocast to the related sockets.
    service.updateDomainUser(prop);
    for(var i = 0, len = rooms.length; i < len; i++){
      // io.in(rooms[i]).emit('change_name', { id: socket.ceid, username: socket.username });
      // broacast but sender
      emitOthers(rooms[i], 'change_user_data', change_data);
    }

    emitSelves('change_current_user_data', change_data);
  });



  // means dbclick the another user
  socket.on('create_room', function(data){
    var targetId = data.targetUser;
    var roomId = data.targetRoom;
    var displayName = data.displayName;
    var selfId = socket.ceid;
    var domain = socket.currentDomain;

    function toDoGetRoom(res){
      var room = res.room;
      joinRoomAndCache(selfId, room.id);
      joinRoomAndCache(targetId, room.id);
      console.log(roomToCeidArray);

      service.getMessagesByRoom(room.id, (new Date()).toISOString(), 20, selfId).then(function(messages){
        socket.emit('get_room_last_messages', { room: room.id, messages: messages } );

        service.selectParticipant(room.id, targetId,domain).then((target_participant) => {
          var selfShowName = displayName || res.displayNames[targetId] || targetId;
          if (target_participant && target_participant.last_message_id){
            service.selectMessageById(target_participant.last_message_id).then((m)=>{
              socket.emit("room_ready", { roomId: room.id, room_target_read_time: m.created_at, roomName: selfShowName });
            })
          }else{
            socket.emit("room_ready", { roomId: room.id, room_target_read_time: null, roomName: selfShowName });
          }

        })
      });
    }

    if(roomId){
      service.getRoomById(roomId).then(function(res){
        toDoGetRoom(res);
      });
    }else if(!ceidToSocketArray[targetId]){
      // check user
      // check userdomain
      service.createDomainUser({host: socket.currentDomain, uid: targetId, name:displayName, is_login: true}).then(function(result) {
        service.getRoomByTargetAndMe(selfId, targetId, domain, '/')
        .then(function(res){
          toDoGetRoom(res);
        })
      })
    }else {
      service.getRoomByTargetAndMe(selfId, targetId, domain, '/')
      .then(function(res){
        toDoGetRoom(res);
      })
    };


  });

  socket.on('get_user_participation_rooms', function(){
    service.getHistoryByMe(socket.ceid, socket.currentDomain, (new Date()).toISOString(), 20).then(function(room){
      socket.emit('get_user_participation_rooms', room);
    });
  });

  socket.on('get_more_participation_rooms', function(data){
    service.getHistoryByMe(socket.ceid, socket.currentDomain, data.beforetime, 20).then(function(room){
      socket.emit('get_more_participation_rooms', room);
    });
  });

  socket.on('get_room_more_messages', function(data){
    // data.room, data.beforetime
    service.getMessagesByRoom(data.room, data.beforetime, 20, socket.ceid).then(function(res){
      socket.emit('get_room_more_messages', { messages: res } );
    });
  });

  socket.on('get_path_users', function(data){
    var path = data.path;
    var res = [];
    for(var id in ceidToSocketArray){
      var collectedCheck = {};
      var lookups = ceidToSocketArray[id];
      lookups.forEach(function(s){
        if(s.currentPath == path && !collectedCheck[path]){
          res.push({
            // profiles
            id: id
          });
          collectedCheck[path] = true;
        }
      });
    }
    socket.emit('get_path_users', { path: path, users: res });
  });

  socket.on('get_all_path_users', function(data){
    var res = {};
    for(var id in ceidToSocketArray){
      var collectedCheck = {};
      var lookups = ceidToSocketArray[id];
      lookups.forEach(function(s){
        var path = s.currentPath;
        if(!collectedCheck[path]){
          if(!res[path]) res[path] = [];
          res[path].push({
            // profiles
            id: id
          });
          collectedCheck[path] = true;
        }
      });
    }
    socket.emit('get_all_path_users', res);
  });

  socket.on('update_read_time', function(data){
    // data.room, data.readtime
    // trigger to others self has read
    var room = data.room;
    var selfId = socket.ceid;
    var domain = socket.currentDomain;
    var lastMessage = data.last_message;
    emitOthers(room, 'update_read_time', {
      room: room, id: selfId, readtime: lastMessage.time
    });
    // udpate self read time
    service.getDomainUser(socket.currentDomain, socket.ceid)
    .then(function(result){
      if(result[0]){
        service.updateParticipantLastMessage(room, result[0].id, lastMessage.id)
      }
    })
  });

  socket.on('new_message', function(data){
    var time = (new Date()).toISOString();
    var room = data.room;
    var selfId = socket.ceid;
    var domain = socket.currentDomain;
    var message = data.message;
    var metatype = data.metatype;

    // data.room, data.message
    // broadcast message to others using the same timestamp

    // insert new message using the same timestamp
    service.getDomainUser(socket.currentDomain, socket.ceid)
    .then(function(result){
      if(result[0]){
        service.newMessage(room,message,metatype,result[0].id)
        .then(function(m){
          emitSelves('new_message', {
            id: m.id, room: room, message: message, created_at: time, is_me: true, metatype: metatype
          });
          emitOthers(room, 'new_message', {
            id: m.id, room: room, message: message, created_at: time, is_me: false, metatype: metatype
          });
          // service.updateParticipantLastMessage(room, result[0].id, m.id)
        });
      }
    })
    // udpate self read time using the same timestamp

  });

  socket.on('update_user_action', function(data){
    console.log("update_user_action");
    console.log("[ceid:" + socket.ceid + ",socketid:" + socket.id + "]");
    console.log(data);
  });

  socket.on('update_participate_rooms', function(rooms){
    rooms.forEach(function(id){
      console.log('get back room id:' + id);
      joinRoomAndCache(socket.ceid, id);
    });
  });

  socket.on('disconnect', function (message) {
    // console.log(socket.currentDomain);
    // console.log(socket.rooms);
    // var joinedRooms = socket.rooms; // rooms is empty?

    // message:
    // "transport close"
    // "client namespace disconnect"
    // remove
    var idx = ceidToSocketArray[socket.ceid].map(function(item){ return item.id; }).indexOf(socket.id);
    ceidToSocketArray[socket.ceid].splice(idx, 1);
    if(ceidToSocketArray[socket.ceid].length == 0){
      socketCache[cacheKey] = socket;
      setTimeout((function(key){
        return function(){
          var scope = socketCache[key];
          if(scope){
            scope.joinedRooms.forEach(function(name){
              io.in(name).emit("user_left", {id: scope.ceid, username: scope.username});
              var clist = roomToCeidArray[name];
              if(clist){
                clist.splice(clist.indexOf(scope.ceid), 1);
                if(clist.length == 0 || (name != defaultRoom && clist.length <= 1)) delete roomToCeidArray[name];
              }
            });
            delete socketCache[key];
            // socketCache[key] = null;

            console.log(socketCache);
          }
        };
      })(cacheKey), 8000);
      delete ceidToSocketArray[socket.ceid];
      // ceidToSocketArray[socket.ceid] = null;
    }

    console.log("Socket disconnect! [" + socket.id + " in " + socket.currentDomain + "]");
    console.log(domainToUsers);
    // console.log(socketCache);
    console.log("Info: " + socket.ceid + "; " + socket.username);

  });

}


