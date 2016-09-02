/**
 * Routes for express app
 */
var express = require('express');
var _ = require('lodash');
var uuid = require('node-uuid');
var path = require('path');
// var fs = require('fs');
// var uaparser = require('ua-parser-js');
// var compiled_app_module_path = path.resolve(__dirname, '../../', 'public', 'assets', 'server.js');
// var App = require(compiled_app_module_path);

var checkAndUpdateCookie = function(req, res){
  var cookies = {};
  req.headers && req.headers.cookie && req.headers.cookie.split(';').forEach(function(cookie) {
    var parts = cookie.match(/(.*?)=(.*)$/)
    cookies[ parts[1].trim() ] = (parts[2] || '').trim();
  });
  var updateCookieValue = cookies["_ce"];
  var hasExist = !!updateCookieValue;
  if(updateCookieValue){
    // check if a valid cookie?
    // update the cookie expires.
  }else{
    updateCookieValue = uuid.v4();
  }

  res.cookie("_ce", updateCookieValue, {
    maxAge: 1000 * 60 * 60 * 24 * 100,
    httpOnly: true
  });

  return hasExist;
};

module.exports = function(app) {

  app.get('/client/index.html', function (req, res, next) {
    var today = new Date();
    
    // var ua = new uaparser(req.headers['user-agent']);

    // var agent = ua.getBrowser().name;
    // if(agent == "Safari"){
    //   fs.readFile(path.resolve(__dirname, '../..', 'client/index_nocookie.html'), "utf-8", function(err, page) {
    //     res.writeHead(200, {'Content-Type': 'text/html'});
    //     res.write(page.replace("{{ key }}", updateCookieValue).replace("{{ userAgent }}", agent));
    //     res.end();
    //   });
    // }else{
    //   res.cookie("_ce", updateCookieValue, {
    //     maxAge: 1000 * 60 * 60 * 24 * 100,
    //     httpOnly: true
    //   });
    //   res.sendFile(path.resolve(__dirname, '../..', 'client/index.html'));
    // }
    checkAndUpdateCookie(req, res);
    
    res.sendFile(path.resolve(__dirname, '../..', 'client/index.html'));

  });

  app.get('/client/register', function (req, res, next) {
    var referer = req.headers.referer;
    if(referer){
      console.log(referer);
      if(checkAndUpdateCookie(req, res)){
        res.sendStatus(404);
      }else{
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write("<script>document.location.replace('" + referer + "')</script>");
        res.end();
      }
    }else res.sendStatus(404);
  });

  app.get('/client/:project', function (req, res, next) {
    var project = req.params.project;
    res.sendFile(path.resolve(__dirname, '../../client', project));
  });

  app.get('/clientChangePath/:project', function (req, res, next) {
    var project = req.params.project;
    res.sendFile(path.resolve(__dirname, '../../client', project));
  });

  // This is where the magic happens. We take the locals data we have already
  // fetched and seed our stores with data.
  // App is a function that requires store data and url to initialize and return the React-rendered html string
  // app.get('*', function (req, res, next) {
  //   App.default(req, res);
  // });

};
