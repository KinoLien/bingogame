var Knexfile = require("../config/knexfile.js")
var Knex = require("knex")(Knexfile);

var Bookshelf = require("bookshelf")(Knex);

// var Domains = require('../models/domains').Domains;
// var Participants = require('../models/participants').Participants;
// var Rooms = require('../models/rooms').Rooms;
// var Domainusers = require('../models/domainusers').Domainusers;
// var Messages = require('../models/messages').Messages;
// var Uniqueusers = require('../models/uniqueusers').Uniqueusers;

var Questions = require('../models/questions').Questions;
var Options = require('../models/options').Options;
var Gifts = require('../models/gifts').Gifts;

var _ = require('lodash');

// call from router
exports.getQuestion = function(){
  var query = Bookshelf.knex('options')
    .leftJoin('questions', 'questions.id', '=', 'options.q_id')
    .select('questions.*', 'options.id as o_id', 'options.content as o_content', 'options.is_answer as o_answer');
  return query.then(function(results){
    var res = [];
    var questionToOp = {};
    _.each(results, function(res){
      if(!questionToOp[res.id]){
        questionToOp[res.id] = {
          id: res.id,
          content: res.content,
          explain: res.explain,
          options: []
        }
      }
      questionToOp[res.id].options.push({ 
        id: res.o_id, content: res.o_content, is_answer: res.o_answer
      });
    });

    for(var o in questionToOp){
      res.push(questionToOp[o]);
    }
    return res;
  });
};

// call from router
exports.getGift = function(){
  return Bookshelf.knex('gifts').select('*');
};

exports.addOption = function(opt){
  var q_id = opt.q_id;
  if(!q_id) return;
  var content = opt.content || "";
  var is_answer = opt.is_answer === true;
  return Options.forge().create({ q_id: q_id, content: content, is_answer: is_answer });
}

exports.updateOption = function(opt){
  var id = opt.id;
  if(!id) return;
  var content = opt.content || "";
  var is_answer = opt.is_answer === true;
  return Bookshelf.knex('options')
    .where('id', '=', id)
    .update({ content:content, is_answer:is_answer });
}

// request.body
exports.addQuestion = function(body){
  var scope = this;
  return new Promise(function(resolve, reject){
    Questions.forge().create({
      content: body.strText, explain: body.strExplain
    }).then(function(ques){
      var q_id = ques.id;
      var promises = [];
      var ops = Array.isArray(body.strOption)? body.strOption : [body.strOption];
      _.each(ops, function(item){
        promises.push(scope.addOption({ q_id: q_id, content: item, is_answer: item == body.optionCorrect }));
      });
      Promise.all(promises).then(function(){ resolve(); });
    });
  });
};

// { questionID: '2',
//   removeOptions: '3',
//   strText: 'yehfyefhyef',
//   strExplain: 'kasd;fjasd;fjas;dfkljas;dfkjas',
//   optionID: [ '4', '', '' ],
//   optionCorrect: 'asdfasdfasf',
//   strOption: [ 'asdfasdfasf', '1234567', 'dddddddddd' ] }
// { questionID: '2',
//   removeOptions: '3,4',
//   strText: 'yehfyefhyef',
//   strExplain: 'kasd;fjasd;fjas;dfkljas;dfkjas',
//   optionID: '',
//   strOption: 'ddfefefefefefe' }
// request.body
exports.updateQuestion = function(body){
  var id = parseInt(body.questionID);
  var optid = Array.isArray(body.optionID)? body.optionID : [body.optionID];
  var opttext = Array.isArray(body.strOption) ? body.strOption : [body.strOption];
  var removes = body.removeOptions? body.removeOptions.split(',') : [];
  var adds = [];
  var updates = [];
  _.each(optid, function(v, k){ 
    if(v) updates.push({ id: v, content: opttext[k], is_answer: opttext[k] == body.optionCorrect });
    else adds.push({ q_id: id, content: opttext[k], is_answer: opttext[k] == body.optionCorrect });
  });
  var scope = this;
  return new Promise(function(resolve, reject){
    var promises = [];
    promises.push(
      Questions.forge().query(function(qb){
        qb.where("id", "=", id);
      }).fetchOne().then(function(ques){
        ques.save({ content: body.strText, explain: body.strExplain });
      })
    );
    // removes
    promises.push( Bookshelf.knex('options').where('id', 'in', removes).del() );
    // updates
    _.each(updates, function(item){ promises.push(scope.updateOption(item)); });
    // adds
    _.each(adds, function(item){ promises.push(scope.addOption(item)); });

    console.log(body);

    Promise.all(promises).then(function(){ resolve(); });
  });
}

  // strType: 'asdfsadf',
  // strQuan: '33',
  // strCondition: '3'
  // type: {type: "string", maxlength: 255},
  //   quantity: {type: "integer", unsigned: true, defaultTo: 0},
  //   earn_condition: {type: "string", defaultTo: '' }
exports.addGift = function(body){
  var type = body.strType;
  var quan = parseInt(body.strQuan) || 0;
  var cond = body.strCondition;
  return Gifts.forge().create({ type: type, quantity: quan, earn_condition: cond });
}
// { giftID: '1',
//   strType: 'tesetset1',
//   strQuan: '3',
//   strCondition: '2' }
exports.updateGift = function(body){
  var id = parseInt(body.giftID);
  var type = body.strType;
  var quan = parseInt(body.strQuan) || 0;
  var cond = body.strCondition;
  console.log(body);
  return new Promise(function(resolve, reject){
    Gifts.forge().query(function(qb){
      qb.where("id", "=", id);
    }).fetchOne().then(function(gift){
      gift.save({ type: type, quantity: quan, earn_condition: cond }).then(function(){ resolve(); });
    });
  });
      
};

// 我跟對方在同一個domain/path之內，找出已經開的Room，若無則新增，有則回傳舊的Room
// exports.getRoomByTargetAndMe = function(me, target, domain, path){
//   var query = Bookshelf.knex('rooms')
//   .join('domains', 'domains.id', '=', 'rooms.domain_id')
//   .join('participants', 'participants.room_id', '=', 'rooms.id')
//   .join('domainusers', 'domainusers.id', '=', 'participants.domainuser_id')
//   .where('domainusers.uid', me)
//   .where('domains.host', domain)
//   .select('rooms.id','participants.domainuser_id')
//   return query.then((result) =>{
//     return Rooms.forge().query(function(qb) {
//       qb.where("id", "in" , _.map(result,(x) => { return x.id }));
//     }).fetch({withRelated: [
//       "participants.domainuser",
//       ]})
//     .then((rooms) =>{
//       var res = false;
//       var data = rooms.toJSON()
//       _.each(data, function(r){
//         var partObject = {};
//         _.each(r.participants, function(p){
//           if(p.domainuser.uid === target ) {
//             res = r
//           }
//         });
//       })
//       return res;
//     })
//   }).then(function(room){
//     console.log('returned room name: ' + room.id);
//     if(!room){
//         // create a random name for the room.
//         return new Promise(function(resolve, reject) {
//           Domains.forge().query((qb) => {
//             qb.where("host", "=", domain);
//           }).fetchOne()
//           .then(function (domain) {
//             Rooms.forge().create({
//               domain_id: domain.id
//             }).then(function(result){
//               var room = result.toJSON();
//               var mapping = {};
//               var promises = [me, target].map(function(did){
//                 Domainusers.forge().query((qb) => {
//                   qb.where("uid", "=", did)
//                 }).fetchOne().then((d) => {
//                   var djson = d.toJSON();
//                   mapping[did] = djson.name;
//                   Participants.forge().create({
//                     room_id: room.id,
//                     domainuser_id: djson.id,
//                   })
//                 })
//               });

//               Promise.all(promises).then(function(){
//                 resolve({room:room, displayNames: mapping });
//               });

//             })
//           })
//         });
//       }else{
//         var mapping = {};
//         _.each(room.participants,function(x){
//           mapping[x.domainuser.uid] = x.domainuser.name;
//         });
//         console.log('old room id:' + room.id);
//         return {room:room, displayNames: mapping };
//       }
//     }).catch(function(e){
//       console.log(e)
//     });
//   };

//   exports.getRoomById = function(roomId) {
//     return Rooms.forge().query(function(qb) {
//       qb.where("id", "=", roomId);
//     }).fetchOne({withRelated: ["participants.domainuser"]})
//     .then((result) =>{
//       var room = result.toJSON();
//       var mapping = {};
//       _.each(room.participants,function(x){
//         mapping[x.domainuser.uid] = x.domainuser.name;
//       });
//       console.log('old room id:' + room.id);
//       return {room:room, displayNames: mapping };

//     }).catch(function(e){
//       console.log(e)
//     });
//   };

// // 找出包括我的已經開的Room和參與者
// exports.getHistoryByMe = function(me, domain,earlyByIsoDateString, limit){
//   //要取得的值
//   //列出所有包含我的room
//   //列出每個對方id,對方名字(圖片)
//   //最後的訊息，最後的日期
//   //已讀未讀
//   var query = Bookshelf.knex('rooms')
//   .join('domains', 'domains.id', '=', 'rooms.domain_id')
//   .join('participants', 'participants.room_id', '=', 'rooms.id')
//   .join('domainusers', 'domainusers.id', '=', 'participants.domainuser_id')
//   .where('domainusers.uid', me)
//   .where('domains.host', domain).where('rooms.updated_at', '<', earlyByIsoDateString).limit(limit).orderBy('rooms.updated_at','desc')
//   .select('rooms.id','participants.domainuser_id')
//   return query.then((result) =>{
//     return Rooms.forge().query(function(qb) {
//       qb.where("id", "in" , _.map(result,(x) => { return x.id }));
//     }).fetch({withRelated: [
//       "last_message",
//       "participants.domainuser",
//       ]})
//     .then((rooms) =>{
//       var data = rooms.toJSON()
//       // console.log(data)
//       var ridToLastTime = [];
//       _.each(data, function(r){
//         if(r.last_message.id){  // only list room which have message
//           var partObject = {};
//           _.each(r.participants, function(p){
//             if(p.domainuser_id !== result[0].domainuser_id ) {
//               partObject.room_id = r.id;
//               partObject.room_updated_at = r.updated_at;
//               partObject.last_message = (r.last_message) ? r.last_message : '';
//               partObject.is_login = p.domainuser.is_login;
//               partObject.role = p.domainuser.role;
//               partObject.room_user_id = p.domainuser.uid;
//               partObject.room_show_name = p.domainuser.name;
//               partObject.room_show_image = (p.domainuser.image || '');
//             }else{
//               partObject.unread_messages_count = p.unread_messages_count;
//             }
//           });
//           ridToLastTime.push(partObject);
//         }
//       })
//       return ridToLastTime;

//     }).catch((e) =>{
//       console.log(e)
//     });
//   })
// };

// exports.getMessagesByRoom = function(room, earlyByIsoDateString, limit, whoIsSelf){
//   return Messages.forge().query((qb) => {
//     qb.where("room_id", "=", room).andWhere('created_at', '<', earlyByIsoDateString).limit(limit).orderBy('created_at','desc');
//   }).fetch({withRelated: [
//     { domainuser: function(query) { query.columns('uid').columns('id'); }}
//     ]}).then((res) => {
//       var result = _.map(res.toJSON(), function(item){
//         if(item.domainuser.uid == whoIsSelf){
//           item.is_me = true;
//         }else{
//           item.is_me = false;
//         }
//         return item;
//       });
//       return result
//     }).catch((e) =>{
//       console.log(e)
//     });
//   };

// exports.getMessagesByDateRange = function(IsoDateFrom, IsoDateTo){
//   return Bookshelf.knex('messages')
//     .leftJoin('domainusers', 'domainusers.id', '=', 'messages.domainuser_id')
//     .where('messages.created_at', '>', IsoDateFrom)
//     .andWhere('messages.created_at', '<=', IsoDateTo)
//     .select('messages.*','domainusers.name');
// };

// exports.getHasUnreadParticipant = function(roomIds){
//   var res = Bookshelf.knex('participants')
//     .where('unread_messages_count', ">", 0);
//   if(roomIds){
//     res = res.andWhere('room_id', (Array.isArray(roomIds)? 'in' : '='), roomIds);
//   }
//   return res.select('*');
// };

// exports.getDomainUsersHasUnique = function(domainuserIds){
//   var res = Bookshelf.knex('domainusers')
//     .leftJoin('uniqueusers', 'uniqueusers.id', '=', 'domainusers.uniqueusers_id')
//     .leftJoin('domains', 'domains.id', '=', 'domainusers.domain_id')
//     .whereNotNull('domainusers.uniqueusers_id');
//   if(domainuserIds){
//     res = res.andWhere('domainusers.id', (Array.isArray(domainuserIds)? 'in' : '='), domainuserIds);
//   }
//   return res.select('domainusers.*', 'uniqueusers.email', 'domains.host');
// };


//   exports.domainUserCount = function(domain){
//     return Bookshelf.knex('domainusers')
//     .join('domains', 'domains.id', '=', 'domainusers.domain_id')
//     .where({'domains.host': domain})
//     .count('domainusers.id')
//   }

//   exports.getDomainUser = function(domain,uid){
//     return Bookshelf.knex('domainusers')
//     .join('domains', 'domains.id', '=', 'domainusers.domain_id')
//     .where({'domains.host': domain,'domainusers.uid': uid})
//     .select('domainusers.*')
//   }

//   exports.createOrUpdateDomainUser = function(prop){
//     var host = prop.host;
//     var uid = prop.uid;

//     var createProp = {};
//     var updateProp = {};
//     if(typeof prop.name !== 'undefined') updateProp.name = prop.name || '';
//     if(typeof prop.image !== 'undefined') updateProp.image = prop.image;
//     if(typeof prop.uniqueusers_id !== 'undefined') updateProp.uniqueusers_id = prop.uniqueusers_id;
//     if(typeof prop.is_login !== 'undefined') updateProp.is_login = prop.is_login || false;

//     return Domains.forge().query(function (qb) {
//       qb.where("host", "=", host);
//     }).fetchOne()
//     .then(function (domain) {
//       return domain ? domain : Domains.forge().create({host: host})
//     }).then(function(domain){
//       createProp = updateProp;
//       createProp.domain_id = domain.id;
//       createProp.uid = uid;

//       return Domainusers.forge().query(function (qb) {
//         qb.where("domain_id", "=", domain.id).andWhere('uid', '=', uid);
//       }).fetchOne()

//     }).then(function (domainuser) {
//       return domainuser ? domainuser.save(updateProp) : Domainusers.forge().create(createProp);
//     })
//   }
//   exports.createDomainUser = this.createOrUpdateDomainUser
//   exports.updateDomainUser = this.createOrUpdateDomainUser


//   exports.createUniqueUser = function(email){
//     return Uniqueusers.forge().query(function(qb){
//       qb.where("email", "=", email);
//     }).fetchOne().then(function(uniqueusers){
//       return uniqueusers ? uniqueusers : Uniqueusers.forge().create({ email: email });
//     });
//   };

//   exports.selectParticipantUnreadMessagesCount = function(target_id, domain){
//     var query = Bookshelf.knex('participants')
//     .join('domainusers', 'domainusers.id', '=', 'participants.domainuser_id')
//     .join('domains', 'domains.id', '=', 'domainusers.domain_id')
//     .where('domainusers.uid', target_id)
//     .where('domains.host', domain)
//     .sum('participants.unread_messages_count')
//     return query.then((p) => {
//       return p[0].sum
//     })
//   }

//   exports.selectParticipant = function(room, target_id, domain){
//     var query = Bookshelf.knex('participants')
//     .join('domainusers', 'domainusers.id', '=', 'participants.domainuser_id')
//     .join('domains', 'domains.id', '=', 'domainusers.domain_id')
//     .where('domainusers.uid', target_id)
//     .where('participants.room_id', room)
//     .where('domains.host', domain)
//     .select('participants.*')
//     return query.then((p) => {
//       return p[0]
//     })
//   }

//   exports.updateParticipantLastMessage = function(room,domainuser_id,last_message_id){
//     return Participants.forge().query(function(qb){
//       qb.where('room_id', '=', room).andWhere('domainuser_id', '=', domainuser_id)
//     }).fetchOne().then((p) =>{
//       if(p) {
//         p.save({ last_message_id: last_message_id,unread_messages_count: 0 })
//       }
//     })
//   }

//   exports.selectMessageById = function(last_message_id){
//     return Messages.forge().query(function(qb){
//       qb.where('id', '=', last_message_id)
//     }).fetchOne().then((p) =>{
//       if(p) {
//         return p.toJSON();
//       }
//     })
//   }

//   exports.newMessage = function(room,message,metatype,domainuser_id){
//     var scope = this;
//     return Messages.forge().create({ room_id: room, content: message, metatype: metatype, domainuser_id: domainuser_id}).then((message) => {

//       Rooms.forge().query(function(qb) {
//         qb.where("id", "=" , room)
//       }).fetchOne({withRelated: [
//         "participants",
//         ]
//       }).then((room) =>{
//         room.save({ last_message_id: message.id, updated_at: new Date() })
//         return room.toJSON();
//       }).then((r) =>{

//         function updateParticipantState(participants, index, room, domainuserId, messageId){
//           if(participants[index]){
//             if(participants[index].domainuser_id === domainuser_id ) {
//               // scope.updateParticipantLastMessage(room, participants[index].domainuser_id, message.id).then(()=>{
//               //   updateParticipantState(participants, index+1, room, domainuser_id, message.id)
//               // })
//               updateParticipantState(participants, index+1, room, domainuser_id, message.id)
//             }else{
//               Participants.forge().query(function(qb){
//                 qb.where('room_id', '=', room).andWhere('domainuser_id', '=', participants[index].domainuser_id)
//               }).fetchOne().then((p) =>{
//                 if(p) {
//                   p.save({ unread_messages_count: p.toJSON().unread_messages_count + 1 })
//                   updateParticipantState(participants, index+1, room, domainuser_id, message.id)
//                 }
//               })
//             }
//           }
//         };

//         updateParticipantState(r.participants, 0, room, domainuser_id, message.id)
//       })

//       return message;
//     });
//   }
