
function log(msg){ 
    console.log(msg);
}

function randomItem(items){
    return items[Math.floor(Math.random() * items.length)];
}

(function(scope){
    function gameState(){}

    Handlebars.registerHelper('equal', function(val, num, opts) {
        if(val == num) return true;
        else return false;
    });
    Handlebars.registerHelper("counter", function (index){
        return index + 1;
    });

    var gameBlocks = Handlebars.compile(
        '<ul class="clearfix">\
            {{#each blocks}}\
            <li><p class="p{{counter @index}} {{#if (equal this 1)}}yes{{else if (equal this -1)}}no{{else}}empty{{/if}}">Q{{counter @index}}</p></li>\
            {{/each}}\
        </ul>'
    );

    var questionRegion = Handlebars.compile( $("#tplQuestion").html() );

    var answerRegion = Handlebars.compile( $("#tplAnswer").html() );

    var scoreRegion = Handlebars.compile( $("#tplScore").html() );

    var resultRegion = Handlebars.compile( $("#tplResult").html() );

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

    gameState.showQuestion = function(callbackData){
        var renderData = {};
        var xy = callbackData.block;
        var nextTask = callbackData.navigate;
        renderData.time = 10;
        renderData.number = xy.x * 5 + (xy.y + 1);
        renderData.content = callbackData.question.content;
        renderData.options = callbackData.question.options;
        
        var downCountInterval;
        var modal = this.panelModal;

        modal.render({
            content: questionRegion( renderData ),
            events: [
                { selector: ".ok", event: "click", toClose:true }
            ],
            afterOpen: function(){
                // start counting
                var countingEl = $("#popupBox .QBox .time");
                var startFrom = parseInt(countingEl.text());
                downCountInterval = setInterval(function(){
                    countingEl.text(--startFrom);
                    if(startFrom == 0) {
                        modal.close();
                    }
                }, 1000);
            },
            beforeClose: function(){
                if(downCountInterval) clearInterval(downCountInterval);
            },
            afterClose: function(){
                var answer_id;
                $("#answerForm").serializeArray().forEach(function(item){
                    if(item.name = "answer"){ answer_id = parseInt(item.value); }
                });

                this.setNextTask(nextTask, { answer_id: answer_id } );
            }
        });

        setTimeout(function(){ modal.open(); }, 500);
    };

    gameState.showAnswer = function(callbackData){
        var nextTask = callbackData.navigate;

        var modal = this.panelModal;

        modal.render({
            content: answerRegion( callbackData ),
            events:[
                { selector: ".ok", event: "click", toClose:true }
            ]
        });

        modal.setNextTask(nextTask);

        setTimeout(function(){ modal.open(); }, 500);
    }

    gameState.showScore = function(callbackData){
        var nextTask = callbackData.navigate;

        var modal = this.panelModal;

        modal.render({
            content: scoreRegion( callbackData ),
            events: [
                { selector: ".ThatsAll", event: "click", toClose:true, fn: function(){ modal.setNextTask(nextTask); } },
                { selector: ".carryOn", event: "click", toClose:true, fn: function(){ modal.setNextTask(nextTask, {continue: true}); } }
            ],
        });
        
        setTimeout(function(){ modal.open(); }, 500);
        
    };

    gameState.showResult = function(callbackData){
        var nextTask = callbackData.navigate;

        var modal = this.panelModal;

        modal.render({
            content: resultRegion( callbackData ),
            events: [
                { selector: ".ok", event:"click", toClose:true, fn: function(){
                    var data = {};

                    $("#resultForm").serializeArray().forEach(function(item){
                        data[item.name] = item.value;
                    });

                    modal.setNextTask(nextTask, data);
                } }
            ]
        });

        setTimeout(function(){ modal.open(); }, 500);
    };

    gameState.emit = function(event, data){
        if(socketInstance){
            socketInstance.emit('req_' + event, data);
        }
    };

    gameState.panelModal = (function(){
        var renderSelector = "#popupBox";
        var openSelector = "#popupBox";
        return {
            render: function(prop){
                var content = prop.content;
                var events = prop.events;

                if(content){
                    $(renderSelector).html(content);
                }
                if(events){
                    var scope = this;
                    for(var i = 0, len = events.length; i < len; i++){
                        var item = events[i];
                        if(item.fn){
                            $(renderSelector).find(item.selector).on(item.event, item.fn);    
                        }
                        if(item.toClose){
                            $(renderSelector).find(item.selector).on(item.event, function(){ scope.close(); } );
                        }
                        
                    }
                }

                this.beforeOpen = prop.beforeOpen;
                this.afterOpen = prop.afterOpen;

                this.beforeClose = prop.beforeClose;
                this.afterClose = prop.afterClose;
            },
            setNextTask: function(taskName, data){
                this.nextTask = { task: taskName, data: data };
            },
            open: function(){
                var scope = this;
                if(scope.beforeOpen) scope.beforeOpen();
                $(openSelector).fadeIn({
                    complete: function(){
                        if(scope.afterOpen) scope.afterOpen();
                    }
                });
            },
            close: function(){
                var scope = this;
                if(scope.beforeClose) scope.beforeClose();
                $(openSelector).fadeOut({
                    complete: function(){
                        if(scope.afterClose) scope.afterClose();
                        if(scope.nextTask) gameState.emit(scope.nextTask.task, scope.nextTask.data);
                        $(renderSelector).html("");
                    }
                });
            }
        };
    })();

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

    socketInstance.on('res_check_blocks', function(data){
        log("Update Blocks Info");
        gameState.refreshBlocks(data.allBlocks);
        
        var task = data.navigate;

        if(task){
            log("To Do action: " + task);
            if(data.runAnimate){
                log("Do Block choose animation");
                gameState.blockAnimate.start();
            }
            gameState.emit(task);
        }
    });

    socketInstance.on('res_next_block_question', function(data){
        log("res Next block call back");
        log("Wait for animation stop");
        gameState.blockAnimate.stop(6, function(){
            
            gameState.markSelect(data.block.x, data.block.y);
            
            gameState.showQuestion(data);
            
        });
    });

    socketInstance.on('res_answer_question', function(data){
        log("Answer is " + (data.correct? "correct" : "fail") );
        log("Show Explain: " + data.explain);

        var xy = data.block;

        gameState.markAnswer(xy.x, xy.y, data.correct);

        gameState.showAnswer(data);

    });

    socketInstance.on('res_check_gift', function(data){
        if(data.hasGift){
            log("You Earned: " + data.giftContent);
            log("=== Enter name and address OR continue ===");

            gameState.showScore(data);

        }else{
            log("No new gift");
            gameState.emit(data.navigate);
        }
    });

    socketInstance.on('res_show_result', function(data){
        if(data.isShow){
            // to show the result
            log("Showing Results");
            log("line: " + data.lineCount + " counts:" + data.correctCount);

            data.name = currentName;
            data.email = currentEmail;

            gameState.showResult(data);

        }else{
            gameState.emit(data.navigate);
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
        FB.api('/me', { fields: 'name, email' }, function(res){
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

