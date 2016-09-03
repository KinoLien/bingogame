
var Bookshelf = require('./base');

var Player = Bookshelf.Model.extend({
  tableName: "players",
  hasTimestamps : true,

  // room: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Room', "room_id");
  // },
  // domainuser: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Domainuser', "domainuser_id");
  // },
  // last_message: function () {
  //   // one-to-one or many-to-one
  //   return this.belongsTo('Message', "last_message_id");
  // },
  gift: function(){
    return this.belongsTo('Gift', "g_id");
  },

  answerlogs: function(){
    return this.hasMany('Answerlog');
  }
});

var Players = Bookshelf.Collection.extend({
  model: Player
});

module.exports = {
  Player: Bookshelf.model('Player', Player),
  Players: Bookshelf.collection('Players', Players)
}
