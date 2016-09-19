
var service = require('../services/service');

var _ = require('lodash');

var idToGameStatus = {};

// 用排程去 check 這個人是不是中間斷線之後過了三天都沒回來繼續，是的話直接視為fail
var rules = {
  playing: ['check_blocks', 'next_block_question', 'answer_question'],
  // this step to write user locked, check_gift or write_user status is locked
  locked: ['check_blocks', 'check_gift', 'end'], 
  end: ['check_blocks', 'end']
}

function Create2DArray(rows) {
  var arr = [];
  for (var i = 0; i < rows; i++){
    arr[i] = [];
    for (var j = 0; j < rows; j++){
      arr[i][j] = 0;
    }
  }
  return arr;
}

function validRules(next){
  if(this && this.currentAction){
    for(var k in rules){
      var rule = rules[k];
      var index = rule.indexOf(next);
      var toCheckIndex = index - 1;
      if(index == -1) continue;
      if(index == 0) toCheckIndex = rule.length - 1;
      if(rule[toCheckIndex] == this.currentAction){
        this.currentAction = next;
        return true;
      }
    }
  }
  return false;
}

function getNextValidBlock() {
  var blocks = this.blocks;
  var i = 0, j = 0, len = blocks.length;
  var res = [];
  for(; i < len; i ++){
    for(; j < len; j++){
      if(blocks[i][j] == 0) res.push([i,j]);
    }
  }
  if(res.length){
    var xy = _.sample(res);
    return { x: xy[0], y: xy[1] };
  }else{
    return false;
  }
}

function markAnswered(correct){
  var blocks = this.blocks;
  var current = this.currentBlock;
  if(current){
    blocks[current.x][current.y] = (!!correct)? 1 : -1;
  }
}

function getBlockLines(){
  var blocks = this.blocks;
  var ltTorbLine = true;
  var rtTolbLine = true;
  var patterns = [];
  for(var i = 0, xlen = blocks.length; i < xlen; i++){
    var hLine = true;
    var vLine = true;
    for(var j = 0, ylen = blocks.length; j < ylen; j++){
      hLine = hLine && blocks[i][j] == 1;
      vLine = vLine && blocks[j][i] == 1;
      // line /
      if(i == j) ltTorbLine = ltTorbLine && blocks[i][j] == 1;
      //  line \
      if(i + j == xlen - 1) rtTolbLine = rtTolbLine && blocks[i][j] == 1;
    }
    if(hLine) patterns.push("x" + i + "-");
    if(vLine) patterns.push("y" + i + "|");
  }
  if(ltTorbLine) patterns.push("\\");
  if(rtTolbLine) patterns.push("/");

  return patterns;
}

module.exports = function (socket, io) {

  var gameStatus = {};

  socket.on('req_start', function(message){
    // cache the socket.unique_id
    var id = socket.unique_id = message.unique_id;

    gameStatus = idToGameStatus[id] = {
      id: id,
      player_id: 0,
      maxlines: 0,
      status: 'playing',
      answeredQues: [],
      currentEarn: '',
      currentAction: 'start',
      currentBlock: null,       // ex: { x:0, y:1 }
      blocks: Create2DArray(5)  // values: -1, 0, 1
    };
    // load answerlogs and status from DB if the player is exist.
    service.getOrCreatePlayer(id, message.loginFrom || "FB").then(function(res){
      if(res){
        // player db id
        gameStatus.player_id = res.id;

        // collect answer logs and update blocks 
        if(res.answerlogs && res.answerlogs.length){
          _.each(res.answerlogs, function(item){
            var xy = JSON.parse(item.block_position);
            gameStatus.answeredQues.push(item.q_id);
            gameStatus.blocks[xy.x][xy.y] = item.correct? 1 : -1;
          });
          gameStatus.maxlines = res.lines;
        }
        // status 
        gameStatus.status = res.status || gameStatus.status;

        switch(res.status){
          case "end":
            gameStatus.currentAction = "end";
            break;
          case "playing":
            gameStatus.currentAction = "answer_question";
            break;
          case "locked":
            gameStatus.currentAction = "check_gift";
            break;
        }
        
        socket.emit('res_start', { status: gameStatus.status, allBlocks: gameStatus.blocks });
      }
    });
  });

  socket.on('req_next_block_question', function(){
    if(!gameStatus.id) return;
    var data = {};
    var allBlocks = gameStatus.blocks;
    var xy = getNextValidBlock.call(gameStatus);

    data.block = xy;
    data.allBlocks = allBlocks;

    if(xy) gameStatus.currentBlock = xy;
    if(validRules.call(gameStatus, 'next_block_question')){
      service.getRandomQuestionExcludes(gameStatus.answeredQues).then(function(res){
        data.question = res;
        socket.emit('res_next_block_question', data);
      });
    }
  });

  // id, answer_id, block
  socket.on('req_answer_question', function(message){
    if(!gameStatus.id) return;
    var data = {};
    var id = message.id;
    var answer_id = message.answer_id;
    
    data.id = id;
    data.block = gameStatus.currentBlock;
    if(validRules.call(gameStatus, 'answer_question')){
      service.getExplainAndCheckAnswer(id, answer_id).then(function(res){
        // id, block, correct:boolean
        data.correct = res.correct;
        data.explain = res.explain;
        
        markAnswered.call(gameStatus, res.correct);

        socket.emit('res_answer_question', data);

        data.player_id = gameStatus.player_id;
        
        // add answer log
        service.addAnswerlog(data);
      });
    }
    gameStatus.currentBlock = null;
  });

  // return has empty block? have any lines?
  socket.on('req_check_blocks', function(message){
    if(!gameStatus.id) return;

    if(validRules.call(gameStatus, 'check_blocks')){
      var lines = getBlockLines.call(gameStatus); // array
      var emptyBlock = getNextValidBlock.call(gameStatus);  // object: xy
      var hasEmpty = emptyBlock !== false;
      // update cache gamestatus
      gameStatus.maxlines = Math.max(gameStatus.maxlines, lines.length);
      gameStatus.status = "playing";

      // if(lines.length && !hasEmpty){
      //   // to the end but should check the gift (force)
      //   gamestatus.status = "locked";
      // }else if(!lines.length && !hasEmpty){
      //   gameStatus.status = "end";
      // }else{
      //   gameStatus.status = "playing";
      // }

      data.lines = lines;
      data.allBlocks = gameStatus.blocks;
      data.hasEmpty = hasEmpty;

      // update player info about: lines, status
      service.updatePlayer({ 
        id: gameStatus.player_id, 
        status: gameStatus.status,
        lines: gameStatus.maxlines
      });

      socket.emit('res_check_blocks', data);
    }
  });

  socket.on('req_check_gift', function(message){
    if(!gameStatus.id) return;
    if(validRules.call(gameStatus, 'check_gift')){
      // check the current lines can earn gift or not.
      // get gift and update DB
      service.earnGiftAndUpdatePlayer({
        id: gameStatus.player_id,
        lines: gameStatus.maxlines,
        status: "locked"
      }).then(function(res){
        var data = {};
        if(res){
          gameStatus.currentEarn = res.type;
          data.hasGift = true;  
          data.giftContent = res.type;
        }else{
          data.hasGift = false;  
        }
        
        // return
        socket.emit('res_check_gift', data);  
      });
    }
  });

  // { name:String, address:String }
  socket.on('req_end', function(message){
    if(!gameStatus.id) return;
    if(validRules.call(gameStatus, 'end')){
      var toEnd = false;
      if(gameStatus.currentEarn){
        // to end
        if(!_.isEmpty(message.name) && !_.isEmpty(message.address)){
          // to end
          // make the status to end and also write user to DB  
          gameStatus.status = "end";
          service.updatePlayer({
            id: gameStatus.player_id,
            name: message.name,
            address: message.address,
            status: "end"
          });

        }else{
          // some thing missing
          // as continue
          // make the status to playing
          gameStatus.status = "playing";
          gameStatus.currentAction = "check_blocks";
          service.updatePlayer({
            id: gameStatus.player_id,
            status: "playing"
          });

        }
      }else{
        // just to end
        // make the status to end
        gameStatus.status = "end";
        service.updatePlayer({
          id: gameStatus.player_id,
          status: "end"
        });
      }

      // { toEnd: Boolean }
      socket.emit('res_end', { toEnd: toEnd } );  
    }
  });

  socket.on('disconnect', function (message) {
    // clean cache  
    if(socket.unique_id){
      delete idToGameStatus[socket.unique_id];
    }
  });

}


