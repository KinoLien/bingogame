
// http://stackoverflow.com/questions/18831362/how-to-share-a-simple-image-on-facebook-with-callback

var service = require('../services/service');

var webshot = require('webshot');

var isDev = process.env.NODE_ENV === 'development';

var _ = require('lodash');

var idToGameStatus = {
  "FB" : {}, "G" : {}
};

// 用排程去 check 這個人是不是中間斷線之後過了三天都沒回來繼續，是的話直接視為fail
var rules = {
  playing: ['check_blocks', 'next_block_question', 'answer_question'],
  // this step to write user locked, check_gift or write_user status is locked
  locked: ['check_blocks', 'check_gift', 'show_result', 'end'], 
  end: ['check_blocks', 'show_result', 'end']
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
  var len = blocks.length;
  var res = [];
  for(var i = 0; i < len; i ++){
    for(var j = 0; j < len; j++){
      if(blocks[i][j] == 0) res.push([i,j]);
    }
  }
  console.log(res);
  if(res.length){
    var xy = _.sample(res);
    return { x: xy[0], y: xy[1] };
  }else{
    return false;
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

function getBlockCorrectCount(){
  var blocks = this.blocks;
  var res = 0;
  for(var i = 0, xlen = blocks.length; i < xlen; i++){
    for(var j = 0, ylen = blocks.length; j < ylen; j++){
      if(blocks[i][j] == 1) res++;
    }
  }
  return res;
}

module.exports = function (socket, io) {

  var gameStatus = {};

  socket._cacheEmit = socket.emit;
  socket.emit = function(){
    console.log(gameStatus);
    socket._cacheEmit.apply(this, arguments);
  };

  socket.on('req_start', function(message){
    // cache the socket.unique_id
    var id = socket.unique_id;
    var strFrom = message.loginFrom || "FB";
    var name = message.name;
    var navigate;

    if(!idToGameStatus[strFrom]) return;
    gameStatus = idToGameStatus[strFrom][id] = {
      id: id,
      username: name,
      player_id: 0,
      maxlines: 0,
      correctCount: 0,
      from: strFrom,
      status: 'playing',
      answeredQues: [],
      currentPickQues: 0,
      currentEarn: '',
      currentAction: 'start',
      currentBlock: null,       // ex: { x:0, y:1 }
      blocks: Create2DArray(5)  // values: -1, 0, 1
    };
    // load answerlogs and status from DB if the player is exist.
    service.getOrCreatePlayer(id, strFrom).then(function(res){
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

        // update count
        gameStatus.correctCount = getBlockCorrectCount.call(gameStatus);

        // get current earn
        gameStatus.currentEarn = res.giftContent || "";

        switch(res.status){
          case "end":
            gameStatus.currentAction = "end";
            break;
          case "locked":
            // gameStatus.currentAction = "check_gift";
            // navigate = "end";
            gameStatus.currentAction = "check_blocks";
            navigate = "check_gift";
            break;
          case "playing":
          default:
            gameStatus.currentAction = "answer_question";
            navigate = "check_blocks";
            break;
        }
        // console.log(gameStatus);
        socket.emit('res_start', { 
          status: gameStatus.status, 
          allBlocks: gameStatus.blocks, 
          navigate: navigate,
          lineCount: gameStatus.maxlines,
          correctCount: gameStatus.correctCount,
          giftContent: gameStatus.currentEarn
        });
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
    data.navigate = "answer_question";

    if(xy) gameStatus.currentBlock = xy;
    if(validRules.call(gameStatus, 'next_block_question')){
      service.getRandomQuestionExcludes(gameStatus.answeredQues).then(function(res){
        data.question = res;
        gameStatus.currentPickQues = res.id;
        socket.emit('res_next_block_question', data);
      });
    }
  });

  // answer_id
  socket.on('req_answer_question', function(message){
    if(!gameStatus.id) return;
    var data = {};
    var id = gameStatus.currentPickQues;
    var answer_id = message.answer_id;
    
    data.id = id;
    data.block = gameStatus.currentBlock;
    data.navigate = "check_blocks";
    if(validRules.call(gameStatus, 'answer_question')){
      service.getExplainAndCheckAnswer(id, answer_id).then(function(res){
        // id, block, correct:boolean
        data.correct = res.correct;
        data.explain = res.explain;
        
        // mark answered
        var current = data.block;
        gameStatus.blocks[current.x][current.y] = (!!res.correct)? 1 : -1;
        
        socket.emit('res_answer_question', data);

        data.player_id = gameStatus.player_id;
        
        // add answer log
        console.log("before answer_question add answer log");
        service.addAnswerlog(data);
      });
    }
    gameStatus.currentPickQues = 0;
    gameStatus.currentBlock = null;
  });

  // return has empty block? have any lines?
  socket.on('req_check_blocks', function(){
    if(!gameStatus.id) return;

    if(validRules.call(gameStatus, 'check_blocks')){
      var lines = getBlockLines.call(gameStatus); // array
      var count = getBlockCorrectCount.call(gameStatus);
      var emptyBlock = getNextValidBlock.call(gameStatus);  // object: xy
      var hasEmpty = emptyBlock !== false;
      var linesChanged = gameStatus.maxlines != lines.length;
      var data = {};

      // update cache gamestatus
      gameStatus.correctCount = count;
      gameStatus.maxlines = Math.max(gameStatus.maxlines, lines.length);
      gameStatus.status = "playing";

      var navigate = "";

      if(linesChanged){
        // to the end but should check the gift (force)
        navigate = "check_gift";
      }else if(hasEmpty){
        navigate = "next_block_question";
      }else{
        navigate = "show_result";
      }
      
      // if(linesChanged || (lines.length && !hasEmpty) ){
      //   // to the end but should check the gift (force)
      //   navigate = "check_gift";
      // }else if(!lines.length && !hasEmpty){
      //   navigate = "end";
      // }else{
      //   navigate = "next_block_question";
      // }

      data.lines = lines;
      data.allBlocks = gameStatus.blocks;
      data.hasEmpty = hasEmpty;
      data.navigate = navigate;
      data.runAnimate = navigate == "next_block_question";

      // update player info about: lines, status
      service.updatePlayer({ 
        id: gameStatus.player_id, 
        status: gameStatus.status,
        lines: gameStatus.maxlines
      });

      socket.emit('res_check_blocks', data);
    }
  });

  socket.on('req_check_gift', function(){
    if(!gameStatus.id) return;
    if(validRules.call(gameStatus, 'check_gift')){
      // check the current lines can earn gift or not.
      // get gift and update DB
      service.earnGiftAndUpdatePlayer({
        id: gameStatus.player_id,
        lines: gameStatus.maxlines,
        current: gameStatus.currentEarn,
        status: "locked"
      }).then(function(res){
        var data = {};

        if(res && gameStatus.currentEarn != res.type){
          gameStatus.currentEarn = res.type;
          data.hasGift = true;
        }
        data.navigate = "show_result";
        data.lineCount = gameStatus.maxlines;
        data.correctCount = gameStatus.correctCount;
        data.giftContent = gameStatus.currentEarn;
        
        // return
        socket.emit('res_check_gift', data);  
      });
    }
  });

  // message.continue
  socket.on('req_show_result', function(message){
    if(!gameStatus.id) return;
    if(validRules.call(gameStatus, 'show_result')){
      var data = {};
      var hasEmpty = getNextValidBlock.call(gameStatus) !== false;
      if(message && message.continue && hasEmpty){
        gameStatus.currentAction = "answer_question";
        data.isShow = false;
        data.navigate = "check_blocks";
      }else{
        data.isShow = true;
        data.navigate = "end";
        data.lineCount = gameStatus.maxlines;
        data.correctCount = gameStatus.correctCount;
        data.giftContent = gameStatus.currentEarn;

        // Do create image for sharing.
        var baseUrl = isDev? 'http://127.0.0.1:5000': 'http://127.0.0.1';
        var createUrl = [
          baseUrl, 'createshare', 
          encodeURIComponent(gameStatus.username),
          encodeURIComponent(gameStatus.currentEarn), 
          data.correctCount, data.lineCount
        ].join('/');
        webshot(createUrl, 'uploads/' + gameStatus.id + '.png', { shotSize: { width: 610, height: 325 } }, function(err) {
          console.log(gameStatus.id + ".png Saved");
        });

      }

      // return
      socket.emit('res_show_result', data);  
    }
  });

  // { name:String, address:String }
  socket.on('req_end', function(message){
    if(!gameStatus.id) return;
    if(validRules.call(gameStatus, 'end')){
      var navigate;
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
          gameStatus.currentAction = "answer_question";
          navigate = "check_blocks";
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
      socket.emit('res_end', { toEnd: !navigate, navigate: navigate } );  
    }
  });

  socket.on('disconnect', function (message) {
    // clean cache  
    if(socket.unique_id){
      // means user give up answer the question, or user lose his connection.
      if(gameStatus.currentAction == "next_block_question"){
        service.addAnswerlog({
          id: gameStatus.currentPickQues,
          player_id: gameStatus.player_id,
          correct: false,
          block: gameStatus.currentBlock
        });
      }

      delete idToGameStatus[gameStatus.from][socket.unique_id];
    }
  });

}


