
function log(msg){ $("#logRegion").append('<div>' + msg + '</div>'); }
function logCount(second){ 
    var countId = 'logCount';
    var countEl = document.getElementById(countId);
    
    if(!countEl) $("#logRegion").append('<div id="' + countId + '"></div>');

    var countJQ = $("#" + countId);

    if(second == -1) countJQ.remove();
    else countJQ.text(second);
};

function randomItem(items){
    return items[Math.floor(Math.random() * items.length)];
}

(function(scope){

    var _isAnimating = false;
    var _animateInt = null;
    var _startStamp = 0;

    function blockAnimate(){}

    blockAnimate.start = function(){
        if(!_isAnimating){
            var target = $(document.body);
            var pattern = "0123456789abcdef";
            _animateInt = setInterval(function(){
                var c = "#";
                for(var i = 6; i--; ) c += randomItem(pattern);
                target.css("background", c);
            }, 100);
            _startStamp = (new Date()).getTime();
            _isAnimating = true;
        }
    };

    blockAnimate.stop = function(atSecondsAfter, callback){
        if(_isAnimating){
            if(typeof atSecondsAfter == 'function'){
                callback = atSecondsAfter; atSecondsAfter = undefined;
            }
            callback = (typeof callback == 'function')? callback : function(){};
            atSecondsAfter = atSecondsAfter || 0;
            var stopInt = setInterval(function(){
                if((new Date()).getTime() - _startStamp > atSecondsAfter){
                    clearInterval(stopInt);
                    clearInterval(_animateInt);
                    $(document.body).css("background", "");
                    _startStamp = 0;
                    callback();
                }
            }, 30);
            _isAnimating = false;
        }
    };


    scope.blockAnimate = blockAnimate;
})(window);

var socketInstance = null;

function init_socket(uid){
    Handlebars.registerHelper('is_status', function(val, num, opts) {
        if(val == num) return true;
        else return false;
    });

    var gameBlocks = Handlebars.compile($("#gameBlocks").html());

    var next = function(fn){ 
        log("=== Next Task Wait for 3 seconds ===");
        return setTimeout(fn, 3000);
    };

    log("Socket connecting...");
    socketInstance = io.connect("?uid=" + uid);
    
    socketInstance.on('connect', function(msg){
        log("Socket connected");
        log("Do req_start");
        socketInstance.emit('req_start', { loginFrom: "FB" });
    });    

    //////////////////////////
    // Binding Events
    //////////////////////////
    socketInstance.on('res_start', function(data){
        log("Game Screen Show");
        // $("#blockRegion").html( gameBlocks( { blocks: data.allBlocks } ) );
        var status = data.status;
        log("current status: " + data.status);
        log("output current score lines and earns");
        next(function(){
            switch(status){
                case "end":
                    socketInstance.emit('req_end', {});
                    break;
                case "locked":
                    var items = [0, 1];
                    if(randomItem(items)){
                        var stamp = (new Date()).getTime();
                        socketInstance.emit('req_end', { name: "testname-" + stamp, address: "testaddress-" + stamp});
                    }else{
                        socketInstance.emit('req_check_blocks');
                    }
                    break;
                case "playing":
                default:
                    socketInstance.emit('req_check_blocks');
                    break;
            }    
        });
    });

    // data.lines
    // data.allBlocks
    // data.hasEmpty
    socketInstance.on('res_check_blocks', function(data){
        log("Update Blocks Info");
        $("#blockRegion").html( gameBlocks( { blocks: data.allBlocks } ) );

        var task = data.navigate;

        // next_block_question, check_gift, end
        if(task){
            if(task == "next_block_question"){
                log("Do Block choose animation");
                blockAnimate.start();
            }
            next(function(){ socketInstance.emit('req_' + task, {}); });
        }
    });

    // data.block
    // data.allBlocks
    // data.question
    // data.navigate
    socketInstance.on('res_next_block_question', function(data){
        log("res Next block call back");
        log("Wait for animation stop");
        blockAnimate.stop(4, function(){
            var task = data.navigate;
            var xy = data.block;
            var start = (new Date()).getTime();
            var intervals = [];
            var testSecondsList = [3,5,6,9,11];
            var testInterval = null;

            var doEmit = function(answerid){
                clearInterval(testInterval);
                intervals.forEach(function(item){ clearInterval(item); });
                logCount(-1);
                socketInstance.emit('req_' + task, { answer_id: answerid });
            };

            log("Row: " + (xy.x+1) + " Col: " + (xy.y+1) + " Chosed.");
            log("=== Random to Answer ===");

            log("=== Wait 10 seconds ===");
            logCount(0); 
            for(var i = 1; i <= 10; i++){
                intervals.push(setTimeout(function(showSec){
                    return function(){ 
                        logCount(showSec); 
                        if(showSec == 10){ doEmit(); }
                    };
                }(i), i * 1000));
            }

            testInterval = setTimeout((function(question){
                return function(){
                    var randomAnswer = randomItem(question.options);
                    log("Answer Question: " + question.id);
                    log("answer_id: " + randomAnswer.id );
                    doEmit(randomAnswer.id);
                };
            })(data.question), randomItem(testSecondsList) * 1000);
        });
    });

    // data.id
    // data.block
    // data.navigate
    // data.correct
    // data.explain
    socketInstance.on('res_answer_question', function(data){
        log("Answer is " + (data.correct? "correct" : "fail") );
        log("Show Explain: " + data.explain);

        var color = data.correct? "#b7efab" : "#ececec";
        var text = data.correct? "1" : "-1";
        var xy = data.block;

        $("#blockRegion tr:nth-child(" + (xy.x+1) + ") td:nth-child(" + (xy.y+1) + ")").css("background", color).text(text);

        // socketInstance.emit('req_' + data.navigate, {});
    });


    socketInstance.on('disconnect', function(){
        log("--- disconnect --- should refresh page");
    });
}

window.fbAsyncInit = function() {
    FB.init({
      appId      : '1264295200261116',
      cookie     : true,
      status     : true,
      xfbml      : true,
      version    : 'v2.7'
    });

    checkLoginState();
};

(function(d, s, id){
var js, fjs = d.getElementsByTagName(s)[0];
if (d.getElementById(id)) {return;}
js = d.createElement(s); js.id = id;
js.src = "//connect.facebook.net/zh_TW/sdk.js";
fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function statusChangeCallback(response) {
    log('statusChangeCallback');
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected') {
      // Logged into your app and Facebook.
      // testAPI();
        log('logged');
        log("Initialize Socket");
        // log(JSON.stringify(response));
        init_socket(response.authResponse.userID);
    } else if (response.status === 'not_authorized') {
      // The person is logged into Facebook, but not your app.
      // document.getElementById('status').innerHTML = 'Please log ' +
      //   'into this app.';
        log('have to login');
        if(socketInstance) socketInstance.disconnect();
    } else {
      // The person is not logged into Facebook, so we're not sure if
      // they are logged into this app or not.
      // document.getElementById('status').innerHTML = 'Please log ' +
      //   'into Facebook.';
        log('have to login');
        if(socketInstance) socketInstance.disconnect();
    }
}

function checkLoginState() {
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
}

// for the test
$(window).load(function(){
    
    // socketInstance = io.connect();

    // socketInstance.on('connect', function(msg){
    //     log("init connect: " +  msg);
    // });
    
    // get the FB ID
    // return: String ""||"12833295928375..."
    // FB.getUserID()

    // get the FB name
    // FB.api('/me', function(response) {
    //   alert('Your name is ' + response.name);
    // });
});


