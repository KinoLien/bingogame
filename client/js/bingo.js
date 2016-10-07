
function log(msg){ 
    // $("#logRegion").append('<div>' + msg + '</div>');
    console.log(msg);
}
function logCount(second){ 
    // var countId = 'logCount';
    // var countEl = document.getElementById(countId);
    
    // if(!countEl) $("#logRegion").append('<div id="' + countId + '"></div>');

    // var countJQ = $("#" + countId);

    // if(second == -1) countJQ.remove();
    // else countJQ.text(second);
};

function randomItem(items){
    return items[Math.floor(Math.random() * items.length)];
}

(function(scope){
    function gameState(){}

    Handlebars.registerHelper('is_status', function(val, num, opts) {
        if(val == num) return true;
        else return false;
    });
    Handlebars.registerHelper("counter", function (index){
        return index + 1;
    });

    var gameBlocks = Handlebars.compile(
        '<ul class="clearfix">\
            {{#each blocks}}\
            <li><p class="p{{counter @index}} {{#if (is_status this 1)}}yes{{else if (is_status this -1)}}no{{else}}empty{{/if}}">Q{{counter @index}}</p></li>\
            {{/each}}\
        </ul>'
    );

    var questionRegion = Handlebars.compile( $("#tplQuestion").html() );

    gameState.beforeLogin = function(){
        $(".loginBeforeBox").show();
        $(".loginAfterBox").hide();
        $(".userBox p").hide();
    };

    gameState.afterLogin = function(profile){
        $(".loginBeforeBox").hide();
        $(".loginAfterBox").show(); 
        $(".userBox p").show();
        $("#strUserName").text(profile.name);
    };

    gameState.refreshBlocks = function(blocks){
        var convertedBlocks = [];
        blocks.forEach(function(item){
            convertedBlocks = convertedBlocks.concat(item);
        });
        $(".gridBox").html( gameBlocks( { blocks: convertedBlocks } ) );
    };

    gameState.markAnswer = function(x, y, correct){
        var idx = x * 5 + (y + 1);
        var jqBlock = $(".gridBox li:nth-child(" + idx + ") p");
        jqBlock.removeClass("empty random this").addClass(correct? "yes" : "no");
    };

    gameState.markSelect = function(x, y){
        var idx = x * 5 + (y + 1);
        $(".gridBox li:nth-child(" + idx + ") p").addClass("this");
    };

    gameState.getEmptyBlocks = function(){
        return $(".gridBox p.empty");
    };

    gameState.renderQuestion = function(callbackData){
        var renderData = {};
        var xy = callbackData.block;
        renderData.time = 10;
        renderData.number = xy.x * 5 + (xy.y + 1);
        renderData.content = callbackData.question.content;
        renderData.options = callbackData.question.options;
        $("#questionBox .QBox").html( questionRegion( renderData ) );
    };

    gameState.showQuestion = function(callbackData){
        var nextTask = callbackData.navigate;
        var downCountInterval;

        $.fancybox($("#questionBox"), { 
            afterShow:function(){
                // start counting
                var countingEl = $("#questionBox .QBox .time");
                var startFrom = parseInt(countingEl.text());
                downCountInterval = setInterval(function(){
                    countingEl.text(--startFrom);
                    if(startFrom == 0) {
                        $.fancybox.close();
                    }
                }, 1000);
                $("#questionBox .QBox .ok").click(function(){ $.fancybox.close(); });
            },
            afterClose: function(){
                if(downCountInterval) clearInterval(downCountInterval);

                var answer_id;
                $("#answerForm").serializeArray().forEach(function(item){
                    if(item.name = "answer"){ answer_id = parseInt(item.value); }
                })
                // collect current answer
                gameState.emit(nextTask, { answer_id: answer_id });
            }
        } );
    }

    gameState.emit = function(event, data){
        if(socketInstance){
            socketInstance.emit('req_' + event, data);
        }
    };

    gameState.blockAnimate = (function(){
        var _isAnimating = false;
        var _animateInt = null;
        var _startStamp = 0;
        return {
            start: function(){
                if(!_isAnimating){
                    var list = gameState.getEmptyBlocks().slice(0);
                    var previous = [];
                    _animateInt = setInterval(function(){
                        // this is jquery map, 
                        var chooseIdx = randomItem(list.map(function(idx, item){return idx;}));
                        var choose = list[chooseIdx];
                        if(choose){
                            $(choose).addClass("random");
                            list.splice(chooseIdx, 1);
                            previous.push(choose);
                        }
                        
                        if(previous.length){
                            setTimeout(function(){
                                var item = previous.shift();
                                $(item).removeClass("random");
                                list.push(item);
                            }, (list.length < 2)? 200 : 400);    
                        }
                    }, 300);
                    _startStamp = (new Date()).getTime();
                    _isAnimating = true;
                }
            },
            stop: function(atSecondsAfter, callback){
                if(_isAnimating){
                    if(typeof atSecondsAfter == 'function'){
                        callback = atSecondsAfter; atSecondsAfter = undefined;
                    }
                    callback = (typeof callback == 'function')? callback : function(){};
                    atSecondsAfter = (atSecondsAfter || 0) * 1000;
                    var stopInt = setInterval(function(){
                        if((new Date()).getTime() - _startStamp > atSecondsAfter){
                            clearInterval(stopInt);
                            clearInterval(_animateInt);
                            $(gameState.getEmptyBlocks()).removeClass("random");
                            _startStamp = 0;
                            callback();
                        }
                    }, 30);
                    _isAnimating = false;
                }
            }
        }
    })();

    scope.gameState = gameState;
})(window);

var socketInstance = null;
var currentName = "";
var currentEmail = "";

function init_socket(uid){
    var next = function(fn){ 
        log("=== Next Task Wait for 1 seconds ===");
        return setTimeout(fn, 1000);
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
        gameState.refreshBlocks(data.allBlocks);
        
        var status = data.status;
        log("current status: " + status);
        log("output current score lines and earns");
        switch(status){
            case "end":
                log("You can not play anymore.");
                break;
            case "locked":
                log("=== Enter name and address OR continue ===");
                next(function(){
                    var stamp = (new Date()).getTime();
                    var items = [
                        {}, { name: "testname-" + stamp, address: "testaddress-" + stamp }
                    ];
                    socketInstance.emit('req_' + data.navigate, randomItem(items) );
                });
                break;
            case "playing":
            default:
                next(function(){
                    socketInstance.emit('req_' + data.navigate, {});
                });
                break;
        }
    });

    // data.lines
    // data.allBlocks
    // data.hasEmpty
    socketInstance.on('res_check_blocks', function(data){
        log("Update Blocks Info");
        gameState.refreshBlocks(data.allBlocks);
        
        var task = data.navigate;

        // next_block_question, check_gift, end
        if(task){
            log("To Do action: " + task);
            if(task == "next_block_question"){
                log("Do Block choose animation");
                gameState.blockAnimate.start();
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
        gameState.blockAnimate.stop(6, function(){
            var task = data.navigate;
            var xy = data.block;
            var start = (new Date()).getTime();
            var intervals = [];
            var testSecondsList = [1,1];
            var testInterval = null;

            gameState.markSelect(xy.x, xy.y);
            gameState.renderQuestion(data);

            setTimeout(function(){                
                gameState.showQuestion(data);
            }, 500);

            // var doEmit = function(answerid){
            //     clearInterval(testInterval);
            //     intervals.forEach(function(item){ clearInterval(item); });
            //     logCount(-1);
            //     socketInstance.emit('req_' + task, { answer_id: answerid });
            // };

            // log("Row: " + (xy.x+1) + " Col: " + (xy.y+1) + " Chosed.");
            // log("=== Random to Answer ===");

            // log("=== Wait 10 seconds ===");
            // logCount(0); 
            // for(var i = 1; i <= 10; i++){
            //     intervals.push(setTimeout(function(showSec){
            //         return function(){ 
            //             logCount(showSec); 
            //             if(showSec == 10){ doEmit(); }
            //         };
            //     }(i), i * 1000));
            // }

            // testInterval = setTimeout((function(question){
            //     return function(){
            //         var options = question.options;
            //         var randomAnswer = options[options.length-1];
            //         // var randomAnswer = randomItem(options.slice(2));
            //         log("Answer Question: " + question.id);
            //         log("answer_id: " + randomAnswer.id );
            //         doEmit(randomAnswer.id);
            //     };
            // })(data.question), randomItem(testSecondsList) * 1000);
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

        var xy = data.block;

        gameState.markAnswer(xy.x, xy.y, data.correct);

        next(function(){
            socketInstance.emit('req_' + data.navigate, {});
        });
    });

    // data.hasGift
    // data.giftContent
    // data.navigate
    socketInstance.on('res_check_gift', function(data){
        if(data.hasGift){
            log("You Earned: " + data.giftContent);
            log("=== Enter name and address OR continue ===");
            next(function(){
                var stamp = (new Date()).getTime();
                var items = [
                    {}, { name: "testname-" + stamp, address: "testaddress-" + stamp }
                ];
                socketInstance.emit('req_' + data.navigate, randomItem(items) );
            });
        }else{
            log("No new gift");
            next(function(){
                socketInstance.emit('req_' + data.navigate, {});
            });
        }
    });

    // data.toEnd
    // data.navigate
    socketInstance.on('res_end', function(data){
        if(data.toEnd){
            log("=== THE END ===");
        }else{
            log("Continue to play");
            next(function(){
                socketInstance.emit('req_' + data.navigate, {});
            });
        }
    });

    socketInstance.on('disconnect', function(){
        log("--- disconnect --- should refresh page");
    });
}

window.fbAsyncInit = function() {
    FB.init({
      appId      : '1264295200261116',
      // cookie     : true,
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
        var userID = response.authResponse.userID;
        FB.api('/me', function(res){
            currentEmail = res.email; 
            currentName = res.name;
            gameState.afterLogin({name:currentName});
            init_socket(userID);
        });
        
    } else if (response.status === 'not_authorized') {
      // The person is logged into Facebook, but not your app.
      // document.getElementById('status').innerHTML = 'Please log ' +
      //   'into this app.';
        log('have to login');
        if(socketInstance) socketInstance.disconnect();
        gameState.beforeLogin();
    } else {
      // The person is not logged into Facebook, so we're not sure if
      // they are logged into this app or not.
      // document.getElementById('status').innerHTML = 'Please log ' +
      //   'into Facebook.';
        log('have to login');
        if(socketInstance) socketInstance.disconnect();
        gameState.beforeLogin();
    }
}

function checkLoginState() {
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
}

function fb_login(){
    FB.login(statusChangeCallback, { scope: 'public_profile,email' });

    // FB.login(function(response) {

    //     if (response.authResponse) {
    //         console.log('Welcome!  Fetching your information.... ');
    //         //console.log(response); // dump complete info
    //         access_token = response.authResponse.accessToken; //get access token
    //         user_id = response.authResponse.userID; //get FB UID

    //         FB.api('/me', function(response) {
    //             user_email = response.email; //get user email
    //       // you can store this data into your database             
    //         });

    //     } else {
    //         //user hit cancel button
    //         console.log('User cancelled login or did not fully authorize.');

    //     }
    // }, {
    //     scope: 'public_profile,email'
    // });
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


