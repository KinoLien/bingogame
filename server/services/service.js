var Knexfile = require("../config/knexfile.js")
var Knex = require("knex")(Knexfile);

var Bookshelf = require("bookshelf")(Knex);

var Questions = require('../models/questions').Questions;
var Options = require('../models/options').Options;
var Gifts = require('../models/gifts').Gifts;
var Answerlogs = require('../models/answerlogs').Answerlogs;
var Players = require('../models/players').Players;

var _ = require('lodash');

////////////////////////////////////////
// CALL FROM CONSOLE
////////////////////////////////////////
// call from router
exports.getQuestion = function(){
  var query = Bookshelf.knex('options')
    .leftJoin('questions', 'questions.id', '=', 'options.q_id')
    .groupBy('questions.id', 'o_id')
    .orderBy('o_id')
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

// call from router
exports.getPlayer = function(){
  return Bookshelf.knex('players')
    .leftJoin('gifts', 'players.g_id', '=', 'gifts.id')
    .select('players.*', 'gifts.type');
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
  var cond = parseInt(body.strCondition) || 0;
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

////////////////////////////////////////
// CALL FROM SOCKETS
////////////////////////////////////////
// players: {
//   id: {type: "increments",  primary: true},
//   unique_id: {type: "string", maxlength: 255, index: true},
//   g_id: {type: "integer", unsigned: true, index: true},
//   lines: {type: "integer", unsigned: true, defaultTo: 0},
//   from: {type: "string", maxlength: 255},
//   name: {type: "string", maxlength: 255, defaultTo: '' },
//   address: {type: "string", defaultTo: '' },
//   status: {type: "string", maxlength: 255, defaultTo: ''},
//   created_at: {type: "dateTime", defaultTo: 'now' },
//   updated_at: {type: "dateTime", defaultTo: 'now' }
// },

// answerlogs: {
//   id: {type: "increments",  primary: true},
//   p_id: {type: "integer", unsigned: true, index: true},
//   q_id: {type: "integer", unsigned: true, index: true},
//   correct: {type: "boolean" , defaultTo: false},
//   block_position: {type: "string", maxlength: 64},
//   created_at: {type: "dateTime", defaultTo: 'now' }
// }
exports.getOrCreatePlayer = function(unique_id, from){
  if(!unique_id || !from) return Promise.resolve(false);
  return Bookshelf.knex('players').where( {unique_id: unique_id, from: from} ).select('*')
    .then(function(results){
      if(results.length > 0){
        // found
        var user = results[0];
        return new Promise(function(resolve, reject) {
          Bookshelf.knex('answerlogs').where('p_id', user.id).orderBy('created_at','desc').select('*')
            .then(function(logs){
              user.answerlogs = logs;
              resolve(user);
            });
        });
      }else{
        // not found
        return Players.forge().create({ unique_id: unique_id, g_id: 0, from: from });
      }
    });
};

exports.updatePlayer = function(opts){
  var data = {};
  var id = opts.id;
  if(opts.status) data.status = opts.status;
  if(opts.lines) data.lines = opts.lines;
  if(opts.g_id) data.g_id = opts.g_id;
  if(opts.name) data.name = opts.name;
  if(opts.address) data.address = opts.address;
  if(Object.keys(data).length){
    data.updated_at = (new Date()).toISOString();
    return Players.forge().query(function (qb) { qb.where("id", "=", id); }).fetchOne()
      .then(function(player){ return player.save(data); });
  }else return Promise.resolve(false);
}

exports.earnGiftAndUpdatePlayer = function(opts){
  var id = opts.id;
  var lines = opts.lines;
  var status = opts.status;
  var scope = this;
  return this.getRemainGifts().then(function(res){
    return _.map(res, function(item){ return item.id; });
  }).then(function(ids){
    return Bookshelf.knex('gifts')
      .where('earn_condition', '>=', lines)
      .andWhere('id', 'in', ids)
      .orderBy('earn_condition', 'desc')
      .select('*');
  }).then(function(results){
    if(results && results.length){
      var maps = _.groupBy(results, function(item){ return item.earn_condition; });
      var maxKey = _.maxBy(Object.keys(maps), function(item){ return parseInt(item); });
      return _.sample(maps[maxKey]);
    }else return null;
  }).then(function(gift){
    if(gift){
      return scope.updatePlayer({ id: id, g_id: gift.id, status: status })
        .then(function(player){ if(player) return gift; else return false; });
    }
    return Promise.resolve(false);
  });
};

exports.getRemainGifts = function(){
  return Bookshelf.knex('players')
    .leftJoin('gifts', 'players.g_id', '=', 'gifts.id')
    .where('players.g_id', '>', 0)
    .groupBy('players.g_id')
    .select(Bookshelf.knex.raw('count(*) as gift_count, g_id, quantity'))
    .then(function(results){
      var remains = [];
      _.each(results, function(item){
        if(item.gift_count < item.quantity){
          remains.push( { id: item.g_id, count: item.quantity - item.gift_count } );
        }
      });
      return remains;
    });
};

exports.getRandomQuestionExcludes = function(excludes){
  var query = Bookshelf.knex('options')
    .leftJoin('questions', 'questions.id', '=', 'options.q_id')
    .whereNotIn('questions.id', excludes)
    .select('questions.id', 'questions.content', 'options.id as o_id', 'options.content as o_content');
  return query.then(function(results){
    var res = [];
    var questionToOp = {};
    _.each(results, function(res){
      if(!questionToOp[res.id]){
        questionToOp[res.id] = {
          id: res.id,
          content: res.content,
          options: []
        }
      }
      questionToOp[res.id].options.push({ 
        id: res.o_id, content: res.o_content
      });
    });
    for(var o in questionToOp){
      res.push(questionToOp[o]);
    }
    return _.sample(res);
  });
};

exports.getExplainAndCheckAnswer = function(question_id, option_id){
  if(!option_id || option_id <= 0){
    // return only explain, and always correct:false
    return Bookshelf.knex('questions')
      .where('id', question_id)
      .select('explain')
      .then(function(results){
        if(results && results.length > 0){
          return { explain: results[0].explain, correct: false };
        }else{
          return { explain: "", correct: false };
        }
      });
  }

  var query = Bookshelf.knex('options')
    .leftJoin('questions', 'questions.id', '=', 'options.q_id')
    .where('questions.id', question_id)
    .andWhere('options.id', option_id)
    .select('questions.explain', 'options.is_answer as correct');
  return query.then(function(results){
    if(results && results.length > 0){
      return results[0];
    }else{
      return { explain: "", correct: false };
    }
  });
};

exports.addAnswerlog = function(opts){
  var q_id = opts.id;
  var p_id = opts.player_id;
  var correct = opts.correct;
  var block_position = JSON.stringify(opts.block);
  return Answerlogs.forge().create({ q_id: q_id, p_id: p_id, correct: correct, block_position: block_position });
};


