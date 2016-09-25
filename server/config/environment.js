module.exports = {

  loadSocketIo: function loadSocketIo(server) {

    var io = require('socket.io').listen(server);

    io.on('connection', function (socket) {
      require('../controllers/socket.js')(socket,io);
    });

    return io;
  },

  authorize: function authorize(io) {
    io.use(function (socket, next) {

      var userId = null;
      var formDomain = null;

      var url = require('url');
      requestUrl = url.parse(socket.request.url);
      // console.log("following is Request Info:");
      // console.log(socket.request);
      requestQuery = requestUrl.query;
      requestParams = requestQuery.split('&');
      params = {};
      for (i = 0; i <= requestParams.length; i++) {
        param = requestParams[i];
        if (param) {
          var p = param.split('=');
          if (p.length != 2) {
            continue
          };
          params[p[0]] = decodeURIComponent(p[1]);
        }
      }
      // socket.request.session = {
      //   "user_id": userId,
      //   "from_domain": fromDomain
      // };

      socket.unique_id = params["uid"];
      // socket.userimage = params["_rtUserImage"];
      // socket.username = params["_rtUserName"];
      // socket.usermail = params["_rtUserMail"];
      // socket.usershowpath = params["_rtUserShowPath"];
      // socket.userislogin = (params["_rtUserIsLogin"] === 'true') ? true : false;
      // socket.userrole = params["_rtUserRole"];

      // socket.currentDomain = params["_rtDom"];
      // socket.currentPath = params["_rtPath"];
      // socket.currentParam = params["_rtParam"];
      // socket.currentHash = params["_rtHash"];

      //console.log(socket.unique_id);

      next();
    });
  },
}
