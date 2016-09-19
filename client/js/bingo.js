
function log(msg){ $(document.body).append('<div>' + msg + '</div>'); }

var socketInstance = null;

window.fbAsyncInit = function() {
    FB.init({
      appId      : '1264295200261116',
      cookie     : true,
      status     : true,
      xfbml      : true,
      version    : 'v2.7'
    });
};

(function(d, s, id){
var js, fjs = d.getElementsByTagName(s)[0];
if (d.getElementById(id)) {return;}
js = d.createElement(s); js.id = id;
js.src = "//connect.facebook.net/zh_TW/sdk.js";
fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// {
//     status: 'connected',
//     authResponse: {
//         accessToken: '...',
//         expiresIn:'...',
//         signedRequest:'...',
//         userID:'...'
//     }
// }
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
        log(JSON.stringify(response));
    } else if (response.status === 'not_authorized') {
      // The person is logged into Facebook, but not your app.
      // document.getElementById('status').innerHTML = 'Please log ' +
      //   'into this app.';
        log('have to login');
    } else {
      // The person is not logged into Facebook, so we're not sure if
      // they are logged into this app or not.
      // document.getElementById('status').innerHTML = 'Please log ' +
      //   'into Facebook.';
        log('have to login');
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

});


