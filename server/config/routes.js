/**
 * Routes for express app
 */
var express = require('express');
var _ = require('lodash');
var uuid = require('node-uuid');
var path = require('path');
var service = require('../services/service');
// var fs = require('fs');
// var uaparser = require('ua-parser-js');
// var compiled_app_module_path = path.resolve(__dirname, '../../', 'public', 'assets', 'server.js');
// var App = require(compiled_app_module_path);

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    if(process.env.NODE_ENV === 'development') return next();
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()){
      console.log("is auth");
      return next();
    }
      
    console.log("return to login");
    // if they aren't redirect them to the home page
    res.redirect('/console/login');
} 

module.exports = function(app, passport) {

  app.get('/', function(req, res, next){
    res.render(path.resolve(__dirname, '../', 'views/bingo/index.ejs'));
  });

  app.get('/console', isLoggedIn, function (req, res, next) {

    res.render(path.resolve(__dirname, '../', 'views/console/index.ejs'));

  });

  // app.get('/client/register', function (req, res, next) {
  //   var referer = req.headers.referer;
  //   if(referer){
  //     console.log(referer);
  //     if(checkAndUpdateCookie(req, res)){
  //       res.sendStatus(404);
  //     }else{
  //       res.writeHead(200, {'Content-Type': 'text/html'});
  //       res.write("<script>document.location.replace('" + referer + "')</script>");
  //       res.end();
  //     }
  //   }else res.sendStatus(404);
  // });

  // =====================================
  // LOGIN ===============================
  // =====================================
  // show the login form
  app.get('/console/login', function(req, res) {

      // render the page and pass in any flash data if it exists
      res.render(path.resolve(__dirname, '../', 'views/console/login.ejs'));
  });

  app.get('/console/:type(question|gift|player)', isLoggedIn, function(req, res, next){
    var type = req.params.type;
    var convertType = type[0].toUpperCase() + type.slice(1);
    service['get' + convertType]().then(function(results){
      var data = {};
      data[type] = results;
      res.render(path.resolve(__dirname, '../', 'views/console/' + type + '.ejs'), data );
    });
  });

  // CRUD
  app.post('/console/:type(question|gift)/:action(add|update)', isLoggedIn, function(req, res, next){
    var type = req.params.type;
    var action = req.params.action;
    convertType = type[0].toUpperCase() + type.slice(1);
    service[action + convertType](req.body).then(function(){ res.redirect('/console/' + type); });
  });

  // process the login form
  app.post('/console/login', passport.authenticate('local-login', {
      successRedirect : '/console/', // redirect to the secure profile section
      failureRedirect : '/console/login', // redirect back to the signup page if there is an error
      failureFlash : false // allow flash messages
  }));

  // =====================================
  // LOGOUT ==============================
  // =====================================
  app.get('/console/logout', function(req, res) {
      req.logout();
      res.redirect('/console');
  });


  app.get('/client/:type(css|js|images)/:name', function(req, res, next) {
    var type = req.params.type;
    var name = req.params.name;
    res.sendFile(path.resolve(__dirname, '../../client', type, name));
  });

  // app.get('/clientChangePath/:project', function (req, res, next) {
  //   var project = req.params.project;
  //   res.sendFile(path.resolve(__dirname, '../../client', project));
  // });

  // app.get('/', function(req, res) {
  //   var drinks = [
  //       { name: 'Bloody Mary', drunkness: 3 },
  //       { name: 'Martini', drunkness: 5 },
  //       { name: 'Scotch', drunkness: 10 }
  //   ];
  //   var tagline = "Any code of your own that you haven't looked at for six or more months might as well have been written by someone else.";

  //   res.render('pages/index', {
  //       drinks: drinks,
  //       tagline: tagline
  //   });
  // });

  // This is where the magic happens. We take the locals data we have already
  // fetched and seed our stores with data.
  // App is a function that requires store data and url to initialize and return the React-rendered html string
  // app.get('*', function (req, res, next) {
  //   App.default(req, res);
  // });
};
