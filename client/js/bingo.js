
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

    gameState.share = function(){
        if(window.FB){
            window.FB.ui({
                method: 'share',
                display: 'popup',
                href: location.href,
                picture: 'http://' + location.host + '/share/' + window.FB.getUserID(),
                // caption: '性連性 賓果得獎金',
                title: '【性連性　賓果得獎金】 遊戲成績',
                description: '您好：歡迎來到【性連性　賓果得獎金】「希望藉由輕鬆的賓果遊戲＆小獎品，讓大家都可以學到正確的性傳染病知識唷！獎品有限，晚來就ｎｏｓｕ囉ＸＤ　快來吧！」'
            }, function(response){});
        }
    };

    gameState.loading = function(loaded){
        if(loaded === true) $("#loadingBox").hide();
        else $("#loadingBox").show();
    };

    gameState.beforeLogin = function(){
        this.loading(true);
        $(".loginBeforeBox").show();
        $(".loginAfterBox").hide();
        $(".userBox p").hide();
        $(".btnStart").hide();
    };

    gameState.afterLogin = function(profile){
        this.loading(true);
        $(".loginBeforeBox").hide();
        $(".loginAfterBox").show(); 
        $(".userBox p").show();
        $("#strUserName").text(profile.name);
        $(".btnStart").show();
    };

    gameState.theEnd = function(){
        $(".loginBeforeBox").hide();
        $(".loginAfterBox").hide(); 
        $(".loginEndBox").show();
        $(".btnStart").hide();
        $(".userBox p").hide();
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
        renderData.time = 15;
        renderData.number = xy.x * 5 + (xy.y + 1);
        renderData.content = callbackData.question.content;
        renderData.options = callbackData.question.options;
        
        var downCountInterval;
        var modal = this.panelModal;

        modal.render({
            content: questionRegion( renderData ),
            events: [
                { selector: ".ok", event: "click", toClose:true, disableSelf:true }
            ],
            beforeOpen: function(){
                $(this.baseSelector).find("li.aBox .s_radio, li.aBox p label").click(function(e){
                    // if e.originalEvent.path [0] is input[type=radio]
                    var rd = $(this).parents("li.aBox").find("input[type=radio]");
                    var isChecked = $(rd).prop('checked');
                    $(rd).prop('checked', !isChecked);
                });
            },
            afterOpen: function(){
                // start counting
                var countingEl = $(this.baseSelector).find(".QBox .time");
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
                { selector: ".ok", event: "click", toClose:true, disableSelf:true }
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
                { selector: ".ThatsAll", event: "click", toClose:true, fn: function(){ modal.setNextTask(nextTask); }, disableSelf:true },
                { selector: ".carryOn", event: "click", toClose:true, fn: function(){ modal.setNextTask(nextTask, {continue: true}); }, disableSelf:true }
            ],
        });
        
        setTimeout(function(){ modal.open(); }, 500);
        
    };

    gameState.showResult = function(callbackData){
        var next = callbackData.navigate;
        var modal = this.panelModal;

        if(next) modal.setNextTask(next);
        else modal.removeNextTask();

        callbackData.hasGift = callbackData.giftContent? 1 : 0;

        modal.render({
            content: resultRegion( callbackData ),
            events: [
                { selector: ".ok", event: "click", toClose: true, fn: function(){ gameState.theEnd(); }, disableSelf:true  },
                { selector: ".shareBox .fb", event: "click", fn: function(){ gameState.share(); } }
            ]
        });

        setTimeout(function(){ modal.open(); }, 500);
    };

    gameState.showResultAndInput = function(callbackData){
        var nextTask = callbackData.navigate;
        var modal = this.panelModal;

        if(nextTask) modal.setNextTask(nextTask);
        else modal.removeNextTask();

        callbackData.hasGift = callbackData.giftContent? 1 : 0;
        callbackData.showInput = 1;
        callbackData.fbid = window.FB.getUserID();

        modal.render({
            beforeOpen: function(){ this.hideElement(".ok"); },
            content: resultRegion( callbackData ),
            events: [
                { selector: "a.fillForm", event: "click", fn:function(e){ 
                    e.preventDefault();
                    window.open($(this).attr('href'), 'targetWindow', 'toolbar=no,location=0,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');
                    gameState.panelModal.showElement(".ok"); 
                    gameState.panelModal.removeNextTask();
                    gameState.emit(nextTask, { noCallback:true });
                    return false;
                } },
                { selector: ".ok", event:"click", toClose:true, fn: function(){ gameState.theEnd(); }, disableSelf:true },
                { selector: ".shareBox .fb", event: "click", fn: function(){ gameState.share(); } }
            ]
        });

        setTimeout(function(){ modal.open(); }, 500);
    };

    gameState.emit = function(event, data){
        if(socketInstance && event){
            this.loading();
            socketInstance.emit('req_' + event, data);
        }
    };

    gameState.changeStatus = function(callbackData){
        var status = callbackData.status;
        var next = callbackData.navigate;
        var btnEl = $(".btnStart");
        switch(status){
            case "end":
                log("You can not play anymore.");
                gameState.showResult(callbackData);
                btnEl.off("click").on("click", function(){ gameState.showResult(callbackData); });
                break;
            case "locked":
                log("=== Enter name and address OR continue ===");
            case "playing":
                log("=== is Can be Continue playing ===");
            default:
                btnEl.click(function(){ window.scrollTo(0,0); gameState.emit(next); btnEl.remove(); });
                break;
        }
    };

    gameState.panelModal = (function(){
        var renderSelector = "#popupBox";
        var openSelector = "#popupBox";
        return {
            baseSelector: openSelector,
            hideElement: function(selector){
                $(openSelector).find(selector).hide();
            },
            showElement: function(selector){
                $(openSelector).find(selector).show();
            },
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
                        var targets = $(renderSelector).find(item.selector);
                        if(item.fn){
                            targets.on(item.event, item.fn);    
                        }
                        if(item.toClose){
                            targets.on(item.event, function(){ scope.close(); } );
                        }
                        if(item.disableSelf){
                            targets.on(item.event, function(){ targets.attr("disabled", true); });
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
            removeNextTask: function(){ this.nextTask = null; },
            open: function(){
                var scope = this;
                if(scope.beforeOpen) scope.beforeOpen();
                gameState.loading(true);
                $(openSelector).css("display", "block");
                setTimeout(function(){ $(openSelector).css("opacity", 1); }, 100);
                setTimeout(function(){ if(scope.afterOpen) scope.afterOpen(); }, 500);
                window.scrollTo(0,0);
            },
            close: function(){
                var scope = this;
                if(scope.beforeClose) scope.beforeClose();

                $(openSelector).css("opacity", 0);
                setTimeout(function(){
                    $(openSelector).css("display", "");
                    if(scope.afterClose) scope.afterClose();
                    if(scope.nextTask) gameState.emit(scope.nextTask.task, scope.nextTask.data);
                    $(renderSelector).html("");
                    window.scrollTo(0,0);
                }, 500);
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
        gameState.emit('start', { loginFrom: "FB", name: currentName, mail: currentEmail });
    });    

    //////////////////////////
    // Binding Events
    //////////////////////////
    socketInstance.on('res_start', function(data){
        gameState.loading(true);
        log("Game Screen Show");
        gameState.refreshBlocks(data.allBlocks);
        
        var status = data.status;
        log("current status: " + status);
        log("output current score lines and earns");
        gameState.changeStatus(data);
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
        // force disable loading.
        gameState.loading(true);
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

        if(data.explain) data.hasExplain = 1;

        gameState.markAnswer(xy.x, xy.y, data.correct);

        gameState.showAnswer(data);

    });

    socketInstance.on('res_check_gift', function(data){
        if(data.hasGift){
            log("You Earned: " + data.giftContent);
            log("=== Enter name and address OR continue ===");
            data.isNew = 1;
        }else{
            log("No new gift");
        }

        if(data.hasEmpty) data.canContinue = 1;

        gameState.showScore(data);
    });

    socketInstance.on('res_show_result', function(data){
        if(data.isShow){
            // to show the result
            log("Showing Results");
            log("line: " + data.lineCount + " counts:" + data.correctCount);

            // data.name = currentName;
            // data.email = currentEmail;

            if(data.giftContent){
                gameState.showResultAndInput(data);
            }else{
                gameState.showResult(data);
            }

        }else{
            gameState.emit(data.navigate);
        }
    });

    // data.toEnd
    // data.navigate
    // data.stopEvent
    socketInstance.on('res_end', function(data){
        gameState.loading(true);
        if(data.stopEvent) return;
        if(data.toEnd){
            log("=== THE END ===");
            gameState.theEnd();
        }else{
            log("Continue to play");
            gameState.emit(data.navigate);
        }
    });

    socketInstance.on('disconnect', function(){
        log("--- disconnect --- should refresh page");
    });
}

window.fbAsyncInit = function() {
    FB.init({
        appId      : '1264290230261613',
        // appId      : '1264295200261116',   // dev
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

function fb_logout(){
    FB.logout(function(){ location.reload(); });
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

