
var Bookshelf = require('./base');

var Question = Bookshelf.Model.extend({
  tableName: "questions",
  // hasTimestamps : true,
  // domainusers: function () {
  //   // one-to-many
  //   return this.hasMany(Domainuser);
  // },
  // rooms: function () {
  //   // one-to-many
  //   return this.hasMany(Room);
  // },

  options: function(){
    return this.hasMany('Option');
  },

  answerlogs: function(){
    return this.hasMany('Answerlog');
  }
});

var Questions = Bookshelf.Collection.extend({
  model: Question
});

module.exports = {
  Question: Bookshelf.model('Question', Question),
  Questions: Bookshelf.collection('Questions', Questions)
}
